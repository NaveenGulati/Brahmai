import { Express } from 'express';
import { getDb } from './db';
import { sql } from 'drizzle-orm';

/**
 * API endpoints for subject-based note navigation
 */
export function registerSubjectNotesRoutes(app: Express) {
  
  // Get all subjects with note counts for the logged-in user
  app.get('/api/notes/subjects', async (req, res) => {
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
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Get all subjects ordered by display_sequence
      const subjects = await db.execute(sql`
        SELECT 
          s.id,
          s.name,
          s.grade,
          s.board,
          s.display_sequence,
          COUNT(DISTINCT n.id) as note_count
        FROM subjects s
        LEFT JOIN tags t ON t.name = s.name AND t.type = 'subject'
        LEFT JOIN note_tags nt ON nt."tagId" = t.id
        LEFT JOIN notes n ON n.id = nt."noteId" AND n."userId" = ${session.userId}
        GROUP BY s.id, s.name, s.grade, s.board, s.display_sequence
        ORDER BY s.display_sequence, s.name
      `);
      
      res.json({ success: true, subjects: subjects.rows });
    } catch (error) {
      console.error('❌ Error fetching subjects:', error);
      res.status(500).json({ error: 'Failed to fetch subjects' });
    }
  });
  
  // Get topics for a subject with note counts
  app.get('/api/notes/subjects/:subjectName/topics', async (req, res) => {
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
      
      const subjectName = decodeURIComponent(req.params.subjectName);
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Get all topic tags that appear in notes with this subject
      const result = await db.execute(sql`
        SELECT 
          t.id,
          t.name,
          t.type,
          COUNT(DISTINCT n.id) as note_count
        FROM tags t
        INNER JOIN note_tags nt ON nt."tagId" = t.id
        INNER JOIN notes n ON n.id = nt."noteId" AND n."userId" = ${session.userId}
        WHERE t.type IN ('topic', 'subTopic')
        AND EXISTS (
          SELECT 1 FROM note_tags nt2
          INNER JOIN tags t2 ON t2.id = nt2."tagId"
          WHERE nt2."noteId" = n.id
          AND t2.name = ${subjectName}
          AND t2.type = 'subject'
        )
        GROUP BY t.id, t.name, t.type
        ORDER BY t.name
      `);
      
      // Convert count to number and format the response
      const topics = result.map((row: any) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        note_count: Number(row.note_count)
      }));
      
      res.json({ success: true, topics });
    } catch (error) {
      console.error('❌ Error fetching topics:', error);
      res.status(500).json({ error: 'Failed to fetch topics' });
    }
  });
}
