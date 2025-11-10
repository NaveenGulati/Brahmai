import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';
import { getDb } from './db';
import { notes, tags, noteTags, generatedQuestions, noteQuizAttempts } from './db-schema-notes';
import { questions } from '../drizzle/schema';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { generateNoteTags, generatePracticeQuestions } from './smart-notes-ai';
import { TRPCError } from '@trpc/server';

export const smartNotesRouter = router({
  /**
   * Create a new note from highlighted text
   */
  create: protectedProcedure
    .input(z.object({
      highlightedText: z.string().min(10).max(5000),
      questionId: z.number().optional(),
      subject: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const userId = ctx.user.id;

      // 1. Insert the note
      const noteResult = await db.insert(notes).values({
        userId,
        questionId: input.questionId || null,
        content: input.highlightedText,
      }).returning();

      const newNote = noteResult[0];
      console.log('[Smart Notes] Created note:', newNote.id);

      // 2. Generate tags asynchronously (don't block the response)
      (async () => {
        try {
          const aiTags = await generateNoteTags(input.highlightedText, input.subject);
          console.log('[Smart Notes] AI generated tags:', aiTags);

          // 3. Find or create tags
          const tagNames = [
            { name: input.subject, type: 'subject' },
            { name: aiTags.topic, type: 'topic' },
            { name: aiTags.subTopic, type: 'subTopic' },
          ];

          const tagIds: number[] = [];
          for (const tagData of tagNames) {
            // Try to find existing tag
            const existing = await db.select().from(tags)
              .where(and(eq(tags.name, tagData.name), eq(tags.type, tagData.type)))
              .limit(1);

            if (existing.length > 0) {
              tagIds.push(existing[0].id);
            } else {
              // Create new tag
              const newTag = await db.insert(tags).values(tagData).returning();
              tagIds.push(newTag[0].id);
            }
          }

          // 4. Link tags to note
          const noteTagsData = tagIds.map(tagId => ({
            noteId: newNote.id,
            tagId,
          }));
          await db.insert(noteTags).values(noteTagsData);

          console.log('[Smart Notes] Linked', tagIds.length, 'tags to note');
        } catch (error) {
          console.error('[Smart Notes] Error in async tag generation:', error);
        }
      })();

      return {
        success: true,
        noteId: newNote.id,
        message: 'Note saved successfully!',
      };
    }),

  /**
   * List all notes for the current user with optional filters
   */
  list: protectedProcedure
    .input(z.object({
      filterBy: z.object({
        subject: z.string().optional(),
        topic: z.string().optional(),
        search: z.string().optional(),
      }).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const userId = ctx.user.id;

      // Build query
      let query = db.select({
        note: notes,
        question: questions,
      })
        .from(notes)
        .leftJoin(questions, eq(notes.questionId, questions.id))
        .where(eq(notes.userId, userId))
        .orderBy(desc(notes.createdAt));

      const allNotes = await query;

      // Fetch tags for each note
      const noteIds = allNotes.map(n => n.note.id);
      const noteTagsData = noteIds.length > 0
        ? await db.select({
            noteId: noteTags.noteId,
            tag: tags,
          })
          .from(noteTags)
          .innerJoin(tags, eq(noteTags.tagId, tags.id))
          .where(inArray(noteTags.noteId, noteIds))
        : [];

      // Group tags by note
      const tagsByNote: Record<number, typeof tags.$inferSelect[]> = {};
      for (const nt of noteTagsData) {
        if (!tagsByNote[nt.noteId]) {
          tagsByNote[nt.noteId] = [];
        }
        tagsByNote[nt.noteId].push(nt.tag);
      }

      // Combine data
      let result = allNotes.map(({ note, question }) => ({
        ...note,
        tags: tagsByNote[note.id] || [],
        sourceQuestion: question ? {
          id: question.id,
          text: question.questionText,
          subject: question.subject,
        } : null,
      }));

      // Apply filters
      if (input.filterBy) {
        if (input.filterBy.subject) {
          result = result.filter(n => 
            n.tags.some(t => t.type === 'subject' && t.name === input.filterBy!.subject)
          );
        }
        if (input.filterBy.topic) {
          result = result.filter(n => 
            n.tags.some(t => t.type === 'topic' && t.name === input.filterBy!.topic)
          );
        }
        if (input.filterBy.search) {
          const searchLower = input.filterBy.search.toLowerCase();
          result = result.filter(n => 
            n.content.toLowerCase().includes(searchLower)
          );
        }
      }

      return result;
    }),

  /**
   * Get a single note by ID with all details
   */
  getById: protectedProcedure
    .input(z.object({
      noteId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const userId = ctx.user.id;

      const noteData = await db.select({
        note: notes,
        question: questions,
      })
        .from(notes)
        .leftJoin(questions, eq(notes.questionId, questions.id))
        .where(and(eq(notes.id, input.noteId), eq(notes.userId, userId)))
        .limit(1);

      if (noteData.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Note not found' });
      }

      const { note, question } = noteData[0];

      // Fetch tags
      const noteTagsData = await db.select({
        tag: tags,
      })
        .from(noteTags)
        .innerJoin(tags, eq(noteTags.tagId, tags.id))
        .where(eq(noteTags.noteId, note.id));

      return {
        ...note,
        tags: noteTagsData.map(nt => nt.tag),
        sourceQuestion: question ? {
          id: question.id,
          text: question.questionText,
          subject: question.subject,
        } : null,
      };
    }),

  /**
   * Generate practice questions for a note
   */
  generateQuestions: protectedProcedure
    .input(z.object({
      noteId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const userId = ctx.user.id;

      // 1. Fetch the note and verify ownership
      const noteData = await db.select({
        note: notes,
        question: questions,
      })
        .from(notes)
        .leftJoin(questions, eq(notes.questionId, questions.id))
        .where(and(eq(notes.id, input.noteId), eq(notes.userId, userId)))
        .limit(1);

      if (noteData.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Note not found' });
      }

      const { note, question } = noteData[0];

      // Get subject from tags
      const subjectTag = await db.select()
        .from(tags)
        .innerJoin(noteTags, eq(tags.id, noteTags.tagId))
        .where(and(eq(noteTags.noteId, note.id), eq(tags.type, 'subject')))
        .limit(1);

      const subject = subjectTag.length > 0 ? subjectTag[0].tags.name : 'General';

      // 2. Generate questions using AI
      console.log('[Smart Notes] Generating questions for note:', note.id);
      const aiQuestions = await generatePracticeQuestions(
        note.content,
        subject,
        question?.questionText
      );

      // 3. Save questions to database
      const questionsData = aiQuestions.map(q => ({
        noteId: note.id,
        questionText: q.questionText,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation,
      }));

      const savedQuestions = await db.insert(generatedQuestions)
        .values(questionsData)
        .returning();

      console.log('[Smart Notes] Saved', savedQuestions.length, 'questions');

      return savedQuestions;
    }),

  /**
   * Get generated questions for a note
   */
  getQuestions: protectedProcedure
    .input(z.object({
      noteId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const userId = ctx.user.id;

      // Verify note ownership
      const note = await db.select()
        .from(notes)
        .where(and(eq(notes.id, input.noteId), eq(notes.userId, userId)))
        .limit(1);

      if (note.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Note not found' });
      }

      // Fetch questions
      const questions = await db.select()
        .from(generatedQuestions)
        .where(eq(generatedQuestions.noteId, input.noteId))
        .orderBy(desc(generatedQuestions.createdAt))
        .limit(5);

      return questions;
    }),

  /**
   * Record a quiz attempt
   */
  recordQuizAttempt: protectedProcedure
    .input(z.object({
      noteId: z.number(),
      score: z.number(),
      totalQuestions: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const userId = ctx.user.id;

      const attempt = await db.insert(noteQuizAttempts).values({
        noteId: input.noteId,
        userId,
        score: input.score,
        totalQuestions: input.totalQuestions,
      }).returning();

      return attempt[0];
    }),

  /**
   * Delete a note
   */
  delete: protectedProcedure
    .input(z.object({
      noteId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const userId = ctx.user.id;

      // Delete note (cascades to note_tags and generated_questions)
      await db.delete(notes)
        .where(and(eq(notes.id, input.noteId), eq(notes.userId, userId)));

      return { success: true };
    }),

  /**
   * Get available filter options (subjects, topics)
   */
  getFilterOptions: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const userId = ctx.user.id;

      // Get all tags for user's notes
      const userTags = await db.select({
        tag: tags,
      })
        .from(tags)
        .innerJoin(noteTags, eq(tags.id, noteTags.tagId))
        .innerJoin(notes, eq(noteTags.noteId, notes.id))
        .where(eq(notes.userId, userId));

      const subjects = [...new Set(userTags.filter(t => t.tag.type === 'subject').map(t => t.tag.name))];
      const topics = [...new Set(userTags.filter(t => t.tag.type === 'topic').map(t => t.tag.name))];

      return { subjects, topics };
    }),
});
