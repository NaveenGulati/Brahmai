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
  
  // Google OAuth routes
  app.use('/api', googleAuthRoutes);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Simple REST API for saving notes
  app.post('/api/notes', async (req, res) => {
    try {
      const { highlightedText, questionId, subject } = req.body;
      
      // Get session from cookie (same as tRPC context)
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
      
      // Import db dynamically to avoid circular dependencies
      const { getDb } = await import('../db');
      const { notes } = await import('../db-schema-notes');
      
      const db = await getDb();
      if (!db) {
        console.error('❌ Database not available');
        return res.status(500).json({ error: 'Database not available' });
      }
      const newNote = await db.insert(notes).values({
        userId: session.userId,
        content: highlightedText,
        questionId,
      }).returning();
      
      console.log('\u2705 Note saved successfully:', newNote[0]);
      res.json({ success: true, note: newNote[0] });
    } catch (error) {
      console.error('\u274c Error saving note:', error);
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
      const { notes } = await import('../db-schema-notes');
      const { eq, desc } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      const userNotes = await db
        .select()
        .from(notes)
        .where(eq(notes.userId, session.userId))
        .orderBy(desc(notes.createdAt));
      
      res.json({ notes: userNotes });
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
      const { eq, and } = await import('drizzle-orm');
      
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
      const { eq, and } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Update only if the note belongs to the user
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
      
      if (updatedNote.length === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
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
      const { eq, and } = await import('drizzle-orm');
      
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
      const plainText = stripHtml(note.content);
      const generatedTags = await generateTags(plainText);
      
      const tagIds = [];
      for (const tag of generatedTags) {
        const [existingTag] = await db
          .select()
          .from(tags)
          .where(and(eq(tags.name, tag.name), eq(tags.type, tag.type)));
        
        let tagId;
        if (existingTag) {
          tagId = existingTag.id;
        } else {
          const [newTag] = await db
            .insert(tags)
            .values({ name: tag.name, type: tag.type })
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
      const { eq, and } = await import('drizzle-orm');
      
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
      const { eq, and } = await import('drizzle-orm');
      
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
