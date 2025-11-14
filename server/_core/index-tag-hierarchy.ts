/**
 * Tag Hierarchy API
 * Provides efficient aggregated tag counts for hierarchical navigation
 * Optimized for thousands of notes with lazy loading support
 */

export function registerTagHierarchyRoutes(app: any) {
  
  // Get tag hierarchy with counts (subjects, topics, sub-topics)
  app.get('/api/notes/tag-hierarchy', async (req, res) => {
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
      const { eq, and, sql } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Efficient aggregation query using SQL
      // Groups by subject, topic, and sub-topic to get counts
      const hierarchy = await db.execute(sql`
        SELECT 
          t.type as tag_type,
          t.name as tag_name,
          COUNT(DISTINCT n.id) as note_count
        FROM ${notes} n
        INNER JOIN ${noteTags} nt ON n.id = nt."noteId"
        INNER JOIN ${tags} t ON nt."tagId" = t.id
        WHERE n."userId" = ${session.userId}
        GROUP BY t.type, t.name
        ORDER BY t.type, t.name
      `);
      
      // Organize results by type
      const subjects: any[] = [];
      const topics: any[] = [];
      const subtopics: any[] = [];
      
      for (const row of hierarchy.rows as any[]) {
        const item = {
          name: row.tag_name,
          count: parseInt(row.note_count)
        };
        
        if (row.tag_type === 'subject') {
          subjects.push(item);
        } else if (row.tag_type === 'topic') {
          topics.push(item);
        } else if (row.tag_type === 'subtopic') {
          subtopics.push(item);
        }
      }
      
      res.json({
        subjects,
        topics,
        subtopics,
        totalNotes: subjects.reduce((sum, s) => sum + s.count, 0)
      });
      
    } catch (error) {
      console.error('❌ Error fetching tag hierarchy:', error);
      res.status(500).json({ error: 'Failed to fetch tag hierarchy' });
    }
  });
  
  // Get topics for a specific subject (lazy loading)
  app.get('/api/notes/tag-hierarchy/topics/:subject', async (req, res) => {
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
      
      const subject = decodeURIComponent(req.params.subject);
      
      const { getDb } = await import('../db');
      const { notes, tags, noteTags } = await import('../db-schema-notes');
      const { eq, and, sql } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Get topics that appear with this subject
      const topicsForSubject = await db.execute(sql`
        SELECT DISTINCT
          topic_tag.name as topic_name,
          COUNT(DISTINCT n.id) as note_count
        FROM ${notes} n
        INNER JOIN ${noteTags} nt_subject ON n.id = nt_subject."noteId"
        INNER JOIN ${tags} subject_tag ON nt_subject."tagId" = subject_tag.id
        INNER JOIN ${noteTags} nt_topic ON n.id = nt_topic."noteId"
        INNER JOIN ${tags} topic_tag ON nt_topic."tagId" = topic_tag.id
        WHERE n."userId" = ${session.userId}
          AND subject_tag.type = 'subject'
          AND subject_tag.name = ${subject}
          AND topic_tag.type = 'topic'
        GROUP BY topic_tag.name
        ORDER BY topic_tag.name
      `);
      
      const topics = (topicsForSubject.rows as any[]).map(row => ({
        name: row.topic_name,
        count: parseInt(row.note_count)
      }));
      
      res.json({ topics });
      
    } catch (error) {
      console.error('❌ Error fetching topics:', error);
      res.status(500).json({ error: 'Failed to fetch topics' });
    }
  });
  
  // Get sub-topics for a specific subject + topic combination (lazy loading)
  app.get('/api/notes/tag-hierarchy/subtopics/:subject/:topic', async (req, res) => {
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
      
      const subject = decodeURIComponent(req.params.subject);
      const topic = decodeURIComponent(req.params.topic);
      
      const { getDb } = await import('../db');
      const { notes, tags, noteTags } = await import('../db-schema-notes');
      const { eq, and, sql } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Get sub-topics that appear with this subject + topic combination
      const subtopicsForTopic = await db.execute(sql`
        SELECT DISTINCT
          subtopic_tag.name as subtopic_name,
          COUNT(DISTINCT n.id) as note_count
        FROM ${notes} n
        INNER JOIN ${noteTags} nt_subject ON n.id = nt_subject."noteId"
        INNER JOIN ${tags} subject_tag ON nt_subject."tagId" = subject_tag.id
        INNER JOIN ${noteTags} nt_topic ON n.id = nt_topic."noteId"
        INNER JOIN ${tags} topic_tag ON nt_topic."tagId" = topic_tag.id
        INNER JOIN ${noteTags} nt_subtopic ON n.id = nt_subtopic."noteId"
        INNER JOIN ${tags} subtopic_tag ON nt_subtopic."tagId" = subtopic_tag.id
        WHERE n."userId" = ${session.userId}
          AND subject_tag.type = 'subject'
          AND subject_tag.name = ${subject}
          AND topic_tag.type = 'topic'
          AND topic_tag.name = ${topic}
          AND subtopic_tag.type = 'subtopic'
        GROUP BY subtopic_tag.name
        ORDER BY subtopic_tag.name
      `);
      
      const subtopics = (subtopicsForTopic.rows as any[]).map(row => ({
        name: row.subtopic_name,
        count: parseInt(row.note_count)
      }));
      
      res.json({ subtopics });
      
    } catch (error) {
      console.error('❌ Error fetching subtopics:', error);
      res.status(500).json({ error: 'Failed to fetch subtopics' });
    }
  });
}
