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
      const { eq, and } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Get all notes for this user to calculate total
      const allNotes = await db
        .select()
        .from(notes)
        .where(eq(notes.userId, session.userId));
      
      const totalNotes = allNotes.length;
      
      // Get all tags with their types for this user's notes
      const userTags = await db
        .select({
          tagId: tags.id,
          tagName: tags.name,
          tagType: tags.type,
          noteId: notes.id
        })
        .from(notes)
        .innerJoin(noteTags, eq(notes.id, noteTags.noteId))
        .innerJoin(tags, eq(noteTags.tagId, tags.id))
        .where(eq(notes.userId, session.userId));
      
      // Aggregate counts by tag type and name
      const tagCounts = new Map<string, { name: string; type: string; count: number; noteIds: Set<number> }>();
      
      for (const row of userTags) {
        const key = `${row.tagType}::${row.tagName}`;
        if (!tagCounts.has(key)) {
          tagCounts.set(key, {
            name: row.tagName,
            type: row.tagType,
            count: 0,
            noteIds: new Set()
          });
        }
        const entry = tagCounts.get(key)!;
        entry.noteIds.add(row.noteId);
        entry.count = entry.noteIds.size;
      }
      
      // Organize results by type
      const subjects: any[] = [];
      const topics: any[] = [];
      const subtopics: any[] = [];
      
      for (const [key, value] of tagCounts) {
        const item = {
          name: value.name,
          count: value.count
        };
        
        if (value.type === 'subject') {
          subjects.push(item);
        } else if (value.type === 'topic') {
          topics.push(item);
        } else if (value.type === 'subTopic') {
          subtopics.push(item);
        }
      }
      
      // Sort alphabetically
      subjects.sort((a, b) => a.name.localeCompare(b.name));
      topics.sort((a, b) => a.name.localeCompare(b.name));
      subtopics.sort((a, b) => a.name.localeCompare(b.name));
      
      res.json({
        subjects,
        topics,
        subtopics,
        totalNotes
      });
      
    } catch (error) {
      console.error('❌ Error fetching tag hierarchy:', error);
      res.status(500).json({ error: 'Failed to fetch tag hierarchy', details: error.message });
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
      
      const subjectName = decodeURIComponent(req.params.subject);
      
      const { getDb } = await import('../db');
      const { notes, tags, noteTags } = await import('../db-schema-notes');
      const { eq, and, inArray } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Find all notes that have this subject tag
      const subjectTag = await db
        .select()
        .from(tags)
        .where(and(
          eq(tags.name, subjectName),
          eq(tags.type, 'subject')
        ))
        .limit(1);
      
      if (subjectTag.length === 0) {
        return res.json({ topics: [] });
      }
      
      // Get all notes with this subject
      const notesWithSubject = await db
        .select({ noteId: noteTags.noteId })
        .from(noteTags)
        .innerJoin(notes, eq(noteTags.noteId, notes.id))
        .where(and(
          eq(noteTags.tagId, subjectTag[0].id),
          eq(notes.userId, session.userId)
        ));
      
      const noteIds = notesWithSubject.map(n => n.noteId);
      
      if (noteIds.length === 0) {
        return res.json({ topics: [] });
      }
      
      // Get all topic tags for these notes
      const topicTags = await db
        .select({
          tagName: tags.name,
          noteId: noteTags.noteId
        })
        .from(noteTags)
        .innerJoin(tags, eq(noteTags.tagId, tags.id))
        .where(and(
          eq(tags.type, 'topic'),
          inArray(noteTags.noteId, noteIds)
        ));
      
      // Count notes per topic
      const topicCounts = new Map<string, { name: string; noteIds: Set<number> }>();
      
      for (const row of topicTags) {
        if (!topicCounts.has(row.tagName)) {
          topicCounts.set(row.tagName, {
            name: row.tagName,
            noteIds: new Set()
          });
        }
        topicCounts.get(row.tagName)!.noteIds.add(row.noteId);
      }
      
      const topics = Array.from(topicCounts.values()).map(t => ({
        name: t.name,
        count: t.noteIds.size
      }));
      
      topics.sort((a, b) => a.name.localeCompare(b.name));
      
      res.json({ topics });
      
    } catch (error) {
      console.error('❌ Error fetching topics:', error);
      res.status(500).json({ error: 'Failed to fetch topics', details: error.message });
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
      
      const subjectName = decodeURIComponent(req.params.subject);
      const topicName = decodeURIComponent(req.params.topic);
      
      const { getDb } = await import('../db');
      const { notes, tags, noteTags } = await import('../db-schema-notes');
      const { eq, and, inArray } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Find subject and topic tags
      const [subjectTag, topicTag] = await Promise.all([
        db.select().from(tags).where(and(
          eq(tags.name, subjectName),
          eq(tags.type, 'subject')
        )).limit(1),
        db.select().from(tags).where(and(
          eq(tags.name, topicName),
          eq(tags.type, 'topic')
        )).limit(1)
      ]);
      
      if (subjectTag.length === 0 || topicTag.length === 0) {
        return res.json({ subtopics: [] });
      }
      
      // Find notes that have BOTH subject and topic tags
      const notesWithSubject = await db
        .select({ noteId: noteTags.noteId })
        .from(noteTags)
        .innerJoin(notes, eq(noteTags.noteId, notes.id))
        .where(and(
          eq(noteTags.tagId, subjectTag[0].id),
          eq(notes.userId, session.userId)
        ));
      
      const notesWithTopic = await db
        .select({ noteId: noteTags.noteId })
        .from(noteTags)
        .where(eq(noteTags.tagId, topicTag[0].id));
      
      // Intersection of both sets
      const subjectNoteIds = new Set(notesWithSubject.map(n => n.noteId));
      const topicNoteIds = new Set(notesWithTopic.map(n => n.noteId));
      const intersectionNoteIds = Array.from(subjectNoteIds).filter(id => topicNoteIds.has(id));
      
      if (intersectionNoteIds.length === 0) {
        return res.json({ subtopics: [] });
      }
      
      // Get all sub-topic tags for these notes
      const subtopicTags = await db
        .select({
          tagName: tags.name,
          noteId: noteTags.noteId
        })
        .from(noteTags)
        .innerJoin(tags, eq(noteTags.tagId, tags.id))
        .where(and(
          eq(tags.type, 'subTopic'),
          inArray(noteTags.noteId, intersectionNoteIds)
        ));
      
      // Count notes per sub-topic
      const subtopicCounts = new Map<string, { name: string; noteIds: Set<number> }>();
      
      for (const row of subtopicTags) {
        if (!subtopicCounts.has(row.tagName)) {
          subtopicCounts.set(row.tagName, {
            name: row.tagName,
            noteIds: new Set()
          });
        }
        subtopicCounts.get(row.tagName)!.noteIds.add(row.noteId);
      }
      
      const subtopics = Array.from(subtopicCounts.values()).map(st => ({
        name: st.name,
        count: st.noteIds.size
      }));
      
      subtopics.sort((a, b) => a.name.localeCompare(b.name));
      
      res.json({ subtopics });
      
    } catch (error) {
      console.error('❌ Error fetching subtopics:', error);
      res.status(500).json({ error: 'Failed to fetch subtopics', details: error.message });
    }
  });
}
