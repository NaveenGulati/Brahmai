import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import session from "express-session";
import passport from "passport";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeGoogleAuth } from "./googleAuth";
import googleAuthRoutes from "./googleAuthRoutes";
import { ENV } from "./env";
import { runMigrations } from "../run-migrations";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Run database migrations first
  try {
    await runMigrations();
  } catch (error) {
    console.error('Failed to run migrations, continuing anyway:', error);
  }
  
  const app = express();
  const server = createServer(app);
  
  // Trust proxy - required for Render.com and other reverse proxies
  app.set('trust proxy', 1);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  
  // Session middleware for Passport
  app.use(
    session({
      secret: ENV.cookieSecret || 'fallback-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: ENV.isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: ENV.isProduction ? 'none' : 'lax', // 'none' required for OAuth redirects in production
      },
    })
  );
  
  // Initialize Passport
  initializeGoogleAuth();
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Serve uploaded files (PDFs, images, etc.)
  app.use('/uploads', express.static('uploads'));
  
  // Google OAuth routes
  app.use('/api', googleAuthRoutes);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Subject-based notes navigation API
  const { registerSubjectNotesRoutes } = await import('../api-subjects-notes');
  registerSubjectNotesRoutes(app);
  
  // Tag hierarchy API for optimized navigation
  const { registerTagHierarchyRoutes } = await import('./index-tag-hierarchy');
  registerTagHierarchyRoutes(app);
  
  // Simple REST API for saving notes - ASYNC VERSION (Fast response)
  app.post('/api/notes', async (req, res) => {
    try {
      const { highlightedText, questionId, subject } = req.body;
      
      // Get session from cookie
      const { COOKIE_NAME } = await import('@shared/const');
      const sessionCookie = req.cookies[COOKIE_NAME];
      
      if (!sessionCookie) {
        console.error('❌ No session cookie found');
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      let session;
      try {
        session = JSON.parse(sessionCookie);
      } catch (e) {
        console.error('❌ Failed to parse session cookie:', e);
        return res.status(401).json({ error: 'Invalid session' });
      }
      
      if (!session?.userId) {
        console.error('❌ No userId in session:', session);
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      if (!highlightedText || highlightedText.trim().length < 10) {
        return res.status(400).json({ error: 'Note text must be at least 10 characters' });
      }
      
      // Import db dynamically
      const { getDb } = await import('../db');
      const { notes } = await import('../db-schema-notes');
      
      const db = await getDb();
      if (!db) {
        console.error('❌ Database not available');
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // ⚡ STEP 1: Save note IMMEDIATELY without AI processing
      const newNote = await db.insert(notes).values({
        userId: session.userId,
        content: highlightedText,
        headline: null, // Will be generated asynchronously
        questionId,
      }).returning();
      
      console.log('✅ Note saved immediately:', newNote[0].id);
      
      // ⚡ STEP 2: Return response to user RIGHT AWAY
      const noteData = {
        ...newNote[0],
        tags: [], // Tags will be added asynchronously
      };
      
      res.json({ 
        success: true, 
        note: noteData,
        processing: true, // Indicates background processing is happening
      });
      
      // ⚡ STEP 3: Process AI features in the background (fire-and-forget)
      // Import and run async processor after response is sent
      const { processNoteAsync } = await import('../async-note-processor');
      processNoteAsync({
        noteId: newNote[0].id,
        userId: session.userId,
        content: highlightedText,
        subject,
      }).catch(error => {
        console.error('⚠️ Background processing failed for note', newNote[0].id, error);
      });
      
    } catch (error) {
      console.error('❌ Error saving note:', error);
      res.status(500).json({ error: 'Failed to save note' });
    }
  });

  // Get all notes for the logged-in user
  app.get('/api/notes', async (req, res) => {
    try {
      const { COOKIE_NAME } = await import('@shared/const');
      const sessionCookie = req.cookies[COOKIE_NAME];
      
      if (!sessionCookie) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      let session;
      try {
        session = JSON.parse(sessionCookie);
      } catch (e) {
        return res.status(401).json({ error: 'Invalid session' });
      }
      
      if (!session?.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { getDb } = await import('../db');
      const { notes, tags, noteTags } = await import('../db-schema-notes');
      const { eq, desc } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      const userNotes = await db
        .select({
          id: notes.id,
          userId: notes.userId,
          content: notes.content,
          headline: notes.headline,
          questionId: notes.questionId,
          createdAt: notes.createdAt,
          updatedAt: notes.updatedAt,
        })
        .from(notes)
        .where(eq(notes.userId, session.userId))
        .orderBy(desc(notes.updatedAt));
      
      // Fetch tags for each note
      const notesWithTags = await Promise.all(
        userNotes.map(async (note) => {
          const noteTags_list = await db
            .select({
              id: tags.id,
              name: tags.name,
              type: tags.type,
            })
            .from(noteTags)
            .innerJoin(tags, eq(noteTags.tagId, tags.id))
            .where(eq(noteTags.noteId, note.id));
          
          return {
            ...note,
            tags: noteTags_list,
          };
        })
      );
      
      res.json({ notes: notesWithTags });
    } catch (error) {
      console.error('\u274c Error fetching notes:', error);
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  });

  // Delete a note
  app.delete('/api/notes/:id', async (req, res) => {
    try {
      const { COOKIE_NAME } = await import('@shared/const');
      const sessionCookie = req.cookies[COOKIE_NAME];
      
      if (!sessionCookie) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      let session;
      try {
        session = JSON.parse(sessionCookie);
      } catch (e) {
        return res.status(401).json({ error: 'Invalid session' });
      }
      
      if (!session?.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: 'Invalid note ID' });
      }
      
      const { getDb } = await import('../db');
      const { notes } = await import('../db-schema-notes');
      const { eq, and, inArray } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Delete only if the note belongs to the user
      await db
        .delete(notes)
        .where(and(
          eq(notes.id, noteId),
          eq(notes.userId, session.userId)
        ));
      
      res.json({ success: true });
    } catch (error) {
      console.error('\u274c Error deleting note:', error);
      res.status(500).json({ error: 'Failed to delete note' });
    }
  });

  // Update a note
  app.put('/api/notes/:id', async (req, res) => {
    console.log('🔄 PUT /api/notes/:id called with ID:', req.params.id);
    try {
      const { COOKIE_NAME } = await import('@shared/const');
      const sessionCookie = req.cookies[COOKIE_NAME];
      
      if (!sessionCookie) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      let session;
      try {
        session = JSON.parse(sessionCookie);
      } catch (e) {
        return res.status(401).json({ error: 'Invalid session' });
      }
      
      if (!session?.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: 'Invalid note ID' });
      }
      
      const { content } = req.body;
      if (!content || content.trim().length < 10) {
        return res.status(400).json({ error: 'Note content must be at least 10 characters' });
      }
      
      const { getDb } = await import('../db');
      const { notes } = await import('../db-schema-notes');
      const { eq, and, inArray } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Update only if the note belongs to the user
      console.log('💾 Updating note ID:', noteId, 'for user:', session.userId);
      const updatedNote = await db
        .update(notes)
        .set({ 
          content: content.trim(),
          updatedAt: new Date()
        })
        .where(and(
          eq(notes.id, noteId),
          eq(notes.userId, session.userId)
        ))
        .returning();
      
      console.log('✅ Update result:', updatedNote.length > 0 ? 'Success' : 'Not found');
      
      if (updatedNote.length === 0) {
        console.error('❌ Note not found or user mismatch. Note ID:', noteId, 'User ID:', session.userId);
        return res.status(404).json({ error: 'Note not found' });
      }
      
      console.log('📤 Sending updated note:', updatedNote[0].id);
      res.json({ success: true, note: updatedNote[0] });
    } catch (error) {
      console.error('\u274c Error updating note:', error);
      res.status(500).json({ error: 'Failed to update note' });
    }
  });
  
  // AI-powered tag generation
  app.post('/api/notes/:id/generate-tags', async (req, res) => {
    try {
      const { COOKIE_NAME } = await import('@shared/const');
      const sessionCookie = req.cookies[COOKIE_NAME];
      
      if (!sessionCookie) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      let session;
      try {
        session = JSON.parse(sessionCookie);
      } catch (e) {
        return res.status(401).json({ error: 'Invalid session' });
      }
      
      if (!session?.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: 'Invalid note ID' });
      }
      
      const { getDb } = await import('../db');
      const { notes, tags, noteTags } = await import('../db-schema-notes');
      const { eq, and, inArray } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.userId, session.userId)));
      
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
      const { generateTags, stripHtml } = await import('../ai-notes-service');
      const { normalizeTagName } = await import('../tag-utils');
      const plainText = stripHtml(note.content);
      const generatedTags = await generateTags(plainText);
      
      const tagIds = [];
      for (const tag of generatedTags) {
        // Normalize each AI-generated tag
        const normalizedName = await normalizeTagName(tag.name);
        console.log(`✅ AI tag normalized: "${tag.name}" -> "${normalizedName}"`);
        
        const [existingTag] = await db
          .select()
          .from(tags)
          .where(and(eq(tags.name, normalizedName), eq(tags.type, tag.type)));
        
        let tagId;
        if (existingTag) {
          tagId = existingTag.id;
        } else {
          const [newTag] = await db
            .insert(tags)
            .values({ name: normalizedName, type: tag.type })
            .returning();
          tagId = newTag.id;
        }
        
        tagIds.push(tagId);
        
        const [existing] = await db
          .select()
          .from(noteTags)
          .where(and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)));
        
        if (!existing) {
          await db.insert(noteTags).values({ noteId, tagId });
        }
      }
      
      const noteTagsList = await db
        .select({
          id: tags.id,
          name: tags.name,
          type: tags.type,
        })
        .from(tags)
        .innerJoin(noteTags, eq(noteTags.tagId, tags.id))
        .where(eq(noteTags.noteId, noteId));
      
      res.json({ success: true, tags: noteTagsList });
    } catch (error) {
      console.error('\u274c Error generating tags:', error);
      res.status(500).json({ error: 'Failed to generate tags' });
    }
  });

  // Delete a tag from a note
  app.delete('/api/notes/:noteId/tags/:tagId', async (req, res) => {
    try {
      const { COOKIE_NAME } = await import('@shared/const');
      const sessionCookie = req.cookies[COOKIE_NAME];
      
      if (!sessionCookie) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      let session;
      try {
        session = JSON.parse(sessionCookie);
      } catch (e) {
        return res.status(401).json({ error: 'Invalid session' });
      }
      
      if (!session?.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const noteId = parseInt(req.params.noteId);
      const tagId = parseInt(req.params.tagId);
      
      if (isNaN(noteId) || isNaN(tagId)) {
        return res.status(400).json({ error: 'Invalid note ID or tag ID' });
      }
      
      const { getDb } = await import('../db');
      const { notes, noteTags } = await import('../db-schema-notes');
      const { eq, and, inArray } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Verify note belongs to user
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.userId, session.userId)));
      
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
      // Delete the tag association
      await db
        .delete(noteTags)
        .where(and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)));
      
      res.json({ success: true, message: 'Tag removed from note' });
    } catch (error) {
      console.error('❌ Error deleting tag from note:', error);
      res.status(500).json({ error: 'Failed to delete tag' });
    }
  });

  // Update a tag (name and/or type)
  app.put('/api/tags/:tagId', async (req, res) => {
    try {
      const { COOKIE_NAME } = await import('@shared/const');
      const sessionCookie = req.cookies[COOKIE_NAME];
      
      if (!sessionCookie) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      let session;
      try {
        session = JSON.parse(sessionCookie);
      } catch (e) {
        return res.status(401).json({ error: 'Invalid session' });
      }
      
      if (!session?.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const tagId = parseInt(req.params.tagId);
      if (isNaN(tagId)) {
        return res.status(400).json({ error: 'Invalid tag ID' });
      }
      
      const { name, type } = req.body;
      
      if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
      }
      
      if (!['subject', 'topic', 'subTopic'].includes(type)) {
        return res.status(400).json({ error: 'Invalid tag type' });
      }
      
      const { getDb } = await import('../db');
      const { tags } = await import('../db-schema-notes');
      const { eq } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Update the tag
      const [updatedTag] = await db
        .update(tags)
        .set({ name: name.trim(), type })
        .where(eq(tags.id, tagId))
        .returning();
      
      if (!updatedTag) {
        return res.status(404).json({ error: 'Tag not found' });
      }
      
      res.json({ success: true, tag: updatedTag });
    } catch (error) {
      console.error('❌ Error updating tag:', error);
      res.status(500).json({ error: 'Failed to update tag' });
    }
  });

  // Add a tag to a note (manual tagging)
  app.post('/api/notes/:noteId/tags', async (req, res) => {
    try {
      const { COOKIE_NAME } = await import('@shared/const');
      const sessionCookie = req.cookies[COOKIE_NAME];
      
      if (!sessionCookie) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      let session;
      try {
        session = JSON.parse(sessionCookie);
      } catch (e) {
        return res.status(401).json({ error: 'Invalid session' });
      }
      
      if (!session?.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const noteId = parseInt(req.params.noteId);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: 'Invalid note ID' });
      }
      
      const { name, type } = req.body;
      
      if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
      }
      
      if (!['subject', 'topic', 'subTopic'].includes(type)) {
        return res.status(400).json({ error: 'Invalid tag type' });
      }
      
      // Normalize tag name (spell check + title case)
      const { normalizeTagName } = await import('../tag-utils');
      const normalizedName = await normalizeTagName(name);
      console.log(`✅ Tag normalized: "${name}" -> "${normalizedName}"`);
      
      const { getDb } = await import('../db');
      const { notes, tags, noteTags } = await import('../db-schema-notes');
      const { eq, and, inArray } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Verify note belongs to user
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.userId, session.userId)));
      
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
      // Find or create the tag (using normalized name)
      const [existingTag] = await db
        .select()
        .from(tags)
        .where(and(eq(tags.name, normalizedName), eq(tags.type, type)));
      
      let tagId;
      let tag;
      if (existingTag) {
        tagId = existingTag.id;
        tag = existingTag;
      } else {
        const [newTag] = await db
          .insert(tags)
          .values({ name: normalizedName, type })
          .returning();
        tagId = newTag.id;
        tag = newTag;
      }
      
      // Check if association already exists
      const [existing] = await db
        .select()
        .from(noteTags)
        .where(and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)));
      
      if (existing) {
        return res.status(400).json({ error: 'Tag already added to this note' });
      }
      
      // Create the association
      await db.insert(noteTags).values({ noteId, tagId });
      
      res.json({ success: true, tag });
    } catch (error) {
      console.error('❌ Error adding tag to note:', error);
      res.status(500).json({ error: 'Failed to add tag' });
    }
  });

  // AI-powered quiz generation
  app.post('/api/notes/:id/generate-quiz', async (req, res) => {
    try {
      const { COOKIE_NAME } = await import('@shared/const');
      const sessionCookie = req.cookies[COOKIE_NAME];
      
      if (!sessionCookie) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      let session;
      try {
        session = JSON.parse(sessionCookie);
      } catch (e) {
        return res.status(401).json({ error: 'Invalid session' });
      }
      
      if (!session?.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: 'Invalid note ID' });
      }
      
      const { numQuestions = 5 } = req.body;
      
      const { getDb } = await import('../db');
      const { notes, generatedQuestions } = await import('../db-schema-notes');
      const { eq, and, inArray } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.userId, session.userId)));
      
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
      const { generateQuizQuestions, stripHtml } = await import('../ai-notes-service');
      const plainText = stripHtml(note.content);
      const questions = await generateQuizQuestions(plainText, numQuestions);
      
      const savedQuestions = [];
      for (const q of questions) {
        const [saved] = await db
          .insert(generatedQuestions)
          .values({
            noteId,
            questionText: q.questionText,
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex,
            explanation: q.explanation,
            difficulty: q.difficulty || 'medium', // Default to medium if not specified
          })
          .returning();
        savedQuestions.push(saved);
      }
      
      res.json({ success: true, questions: savedQuestions });
    } catch (error) {
      console.error('\u274c Error generating quiz:', error);
      res.status(500).json({ error: 'Failed to generate quiz' });
    }
  });

  // Get quiz questions for a note
  app.get('/api/notes/:id/quiz', async (req, res) => {
    try {
      const { COOKIE_NAME } = await import('@shared/const');
      const sessionCookie = req.cookies[COOKIE_NAME];
      
      if (!sessionCookie) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      let session;
      try {
        session = JSON.parse(sessionCookie);
      } catch (e) {
        return res.status(401).json({ error: 'Invalid session' });
      }
      
      if (!session?.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: 'Invalid note ID' });
      }
      
      const { getDb } = await import('../db');
      const { notes, generatedQuestions } = await import('../db-schema-notes');
      const { eq, and, inArray } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.userId, session.userId)));
      
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
      const questions = await db
        .select()
        .from(generatedQuestions)
        .where(eq(generatedQuestions.noteId, noteId));
      
      res.json({ questions });
    } catch (error) {
      console.error('\u274c Error fetching quiz:', error);
      res.status(500).json({ error: 'Failed to fetch quiz' });
    }
  });
  
  // Get all subjects
  app.get('/api/subjects', async (req, res) => {
    try {
      const { COOKIE_NAME } = await import('@shared/const');
      const sessionCookie = req.cookies[COOKIE_NAME];
      
      let userId = null;
      if (sessionCookie) {
        try {
          const session = JSON.parse(sessionCookie);
          userId = session?.userId;
        } catch (e) {
          // Invalid session, continue without userId
        }
      }
      
      const { getDb } = await import('../db');
      const { subjects } = await import('../../drizzle/schema');
      const { notes, tags, noteTags } = await import('../db-schema-notes');
      const { eq, and, sql } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      const allSubjects = await db
        .select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          icon: subjects.icon,
          color: subjects.color,
        })
        .from(subjects)
        .where(eq(subjects.isActive, true))
        .orderBy(subjects.displayOrder);
      
      // If user is logged in, get note counts per subject
      let subjectsWithCounts = allSubjects;
      if (userId) {
        const noteCounts = await db
          .select({
            subjectName: tags.name,
            count: sql<number>`count(distinct ${notes.id})`.as('count'),
          })
          .from(notes)
          .innerJoin(noteTags, eq(noteTags.noteId, notes.id))
          .innerJoin(tags, and(eq(tags.id, noteTags.tagId), eq(tags.type, 'subject')))
          .where(eq(notes.userId, userId))
          .groupBy(tags.name);
        
        const countMap = new Map(noteCounts.map(nc => [nc.subjectName, Number(nc.count)]));
        
        subjectsWithCounts = allSubjects.map(subject => ({
          ...subject,
          note_count: countMap.get(subject.name) || 0,
        }));
      } else {
        subjectsWithCounts = allSubjects.map(subject => ({
          ...subject,
          note_count: 0,
        }));
      }
      
      res.json({ subjects: subjectsWithCounts });
    } catch (error) {
      console.error('❌ Error fetching subjects:', error);
      res.status(500).json({ error: 'Failed to fetch subjects' });
    }
  });
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
