-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Create note_tags join table
CREATE TABLE IF NOT EXISTS note_tags (
  "noteId" INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  "tagId" INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY ("noteId", "tagId")
);

CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags("noteId");
CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags("tagId");

-- Create generated_questions table
CREATE TABLE IF NOT EXISTS generated_questions (
  id SERIAL PRIMARY KEY,
  "noteId" INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  "questionText" TEXT NOT NULL,
  options JSONB NOT NULL,
  "correctAnswerIndex" INTEGER NOT NULL,
  explanation TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_questions_note_id ON generated_questions("noteId");

-- Create note_quiz_attempts table
CREATE TABLE IF NOT EXISTS note_quiz_attempts (
  id SERIAL PRIMARY KEY,
  "noteId" INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  "totalQuestions" INTEGER NOT NULL,
  "completedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_note_quiz_attempts_user_id ON note_quiz_attempts("userId");
CREATE INDEX IF NOT EXISTS idx_note_quiz_attempts_note_id ON note_quiz_attempts("noteId");
