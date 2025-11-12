import { pgTable, serial, integer, text, timestamp, varchar, jsonb, index, primaryKey } from 'drizzle-orm/pg-core';
import { users, questions } from '../drizzle/schema';

/**
 * Notes table - stores user-highlighted text snippets
 */
export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  userId: integer('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: integer('questionId').references(() => questions.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  headline: varchar('headline', { length: 255 }), // AI-generated short headline
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_notes_user_id').on(table.userId),
  questionIdIdx: index('idx_notes_question_id').on(table.questionId),
}));

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

/**
 * Tags table - stores unique tag names for organizing notes
 */
export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'subject', 'topic', 'subTopic'
  createdAt: timestamp('createdAt').defaultNow(),
}, (table) => ({
  typeIdx: index('idx_tags_type').on(table.type),
  nameIdx: index('idx_tags_name').on(table.name),
}));

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * Note Tags join table - many-to-many relationship
 */
export const noteTags = pgTable('note_tags', {
  noteId: integer('noteId').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  tagId: integer('tagId').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.noteId, table.tagId] }),
  noteIdIdx: index('idx_note_tags_note_id').on(table.noteId),
  tagIdIdx: index('idx_note_tags_tag_id').on(table.tagId),
}));

export type NoteTag = typeof noteTags.$inferSelect;
export type InsertNoteTag = typeof noteTags.$inferInsert;

/**
 * Generated Questions table - AI-generated practice questions
 */
export const generatedQuestions = pgTable('generated_questions', {
  id: serial('id').primaryKey(),
  noteId: integer('noteId').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  questionText: text('questionText').notNull(),
  options: jsonb('options').notNull(), // Array of strings
  correctAnswerIndex: integer('correctAnswerIndex').notNull(),
  explanation: text('explanation'),
  difficulty: varchar('difficulty', { length: 20 }).default('medium'), // 'easy', 'medium', 'hard'
  createdAt: timestamp('createdAt').defaultNow(),
}, (table) => ({
  noteIdIdx: index('idx_generated_questions_note_id').on(table.noteId),
}));

export type GeneratedQuestion = typeof generatedQuestions.$inferSelect;
export type InsertGeneratedQuestion = typeof generatedQuestions.$inferInsert;

/**
 * Note Quiz Attempts table - tracks user performance
 */
export const noteQuizAttempts = pgTable('note_quiz_attempts', {
  id: serial('id').primaryKey(),
  noteId: integer('noteId').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  userId: integer('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  totalQuestions: integer('totalQuestions').notNull(),
  completedAt: timestamp('completedAt').defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_note_quiz_attempts_user_id').on(table.userId),
  noteIdIdx: index('idx_note_quiz_attempts_note_id').on(table.noteId),
}));

export type NoteQuizAttempt = typeof noteQuizAttempts.$inferSelect;
export type InsertNoteQuizAttempt = typeof noteQuizAttempts.$inferInsert;
