/**
 * Refactored note creation endpoint - saves immediately and processes asynchronously
 */

import { processNoteAsync } from '../async-note-processor';

export function registerAsyncNotesEndpoint(app: any) {
  // Simple REST API for saving notes - FAST VERSION
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
      // This doesn't block the response - it runs after we've already sent the response
      processNoteAsync({
        noteId: newNote[0].id,
        userId: session.userId,
        content: highlightedText,
        subject,
      }).catch(error => {
        // Log but don't crash - background job failure shouldn't affect user
        console.error('⚠️ Background processing failed for note', newNote[0].id, error);
      });
      
    } catch (error) {
      console.error('❌ Error saving note:', error);
      res.status(500).json({ error: 'Failed to save note' });
    }
  });
}
