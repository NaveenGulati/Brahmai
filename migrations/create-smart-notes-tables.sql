-- Migration: Create Smart Notes Feature Tables
-- Date: November 10, 2025
-- Description: Creates tables for storing user notes, AI-generated tags, and practice questions

-- Table 1: notes
-- Stores the core note content saved by users
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "questionId" INTEGER REFERENCES questions(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries by user
CREATE INDEX idx_notes_user_id ON notes("userId");
-- Index for faster queries by question
CREATE INDEX idx_notes_question_id ON notes("questionId");
-- Index for full-text search on content
CREATE INDEX idx_notes_content_search ON notes USING gin(to_tsvector('english', content));

-- Table 2: tags
-- Stores unique tag names to avoid redundancy
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('subject', 'topic', 'subTopic')),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, type)
);

-- Index for faster tag lookups
CREATE INDEX idx_tags_type ON tags(type);
CREATE INDEX idx_tags_name ON tags(name);

-- Table 3: note_tags
-- Join table for many-to-many relationship between notes and tags
CREATE TABLE IF NOT EXISTS note_tags (
  "noteId" INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  "tagId" INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY ("noteId", "tagId")
);

-- Indexes for faster joins
CREATE INDEX idx_note_tags_note_id ON note_tags("noteId");
CREATE INDEX idx_note_tags_tag_id ON note_tags("tagId");

-- Table 4: generated_questions
-- Stores AI-generated practice questions for each note
CREATE TABLE IF NOT EXISTS generated_questions (
  id SERIAL PRIMARY KEY,
  "noteId" INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  "questionText" TEXT NOT NULL,
  options JSONB NOT NULL,
  "correctAnswerIndex" INTEGER NOT NULL CHECK ("correctAnswerIndex" >= 0 AND "correctAnswerIndex" <= 3),
  explanation TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries by note
CREATE INDEX idx_generated_questions_note_id ON generated_questions("noteId");

-- Table 5: note_quiz_attempts
-- Track user attempts at generated quizzes for analytics
CREATE TABLE IF NOT EXISTS note_quiz_attempts (
  id SERIAL PRIMARY KEY,
  "noteId" INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  "totalQuestions" INTEGER NOT NULL,
  "completedAt" TIMESTAMP DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX idx_note_quiz_attempts_user_id ON note_quiz_attempts("userId");
CREATE INDEX idx_note_quiz_attempts_note_id ON note_quiz_attempts("noteId");

-- Add comments for documentation
COMMENT ON TABLE notes IS 'Stores user-highlighted text snippets from explanations';
COMMENT ON TABLE tags IS 'AI-generated tags for organizing notes by subject, topic, and sub-topic';
COMMENT ON TABLE note_tags IS 'Many-to-many relationship between notes and tags';
COMMENT ON TABLE generated_questions IS 'AI-generated practice questions based on note content';
COMMENT ON TABLE note_quiz_attempts IS 'Tracks user performance on note-based quizzes';
