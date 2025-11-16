-- Migration: Add Advanced Challenge Support
-- Date: 2025-11-16
-- Description: Support for multi-topic challenges with error logging

-- 1. Add columns to challenges table
ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS challenge_type VARCHAR(20) DEFAULT 'simple',
ADD COLUMN IF NOT EXISTS challenge_scope JSONB;

-- 2. Create question bank monitoring table
CREATE TABLE IF NOT EXISTS question_bank_shortfalls (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE SET NULL,
  subject VARCHAR(100) NOT NULL,
  topic VARCHAR(200) NOT NULL,
  subtopic VARCHAR(200),
  requested_count INTEGER NOT NULL,
  available_count INTEGER NOT NULL,
  shortfall INTEGER NOT NULL,
  difficulty VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  notes TEXT
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_challenges_type ON challenges(challenge_type);
CREATE INDEX IF NOT EXISTS idx_shortfalls_resolved ON question_bank_shortfalls(resolved);
CREATE INDEX IF NOT EXISTS idx_shortfalls_topic ON question_bank_shortfalls(subject, topic);
CREATE INDEX IF NOT EXISTS idx_shortfalls_created ON question_bank_shortfalls(created_at DESC);

-- 4. Add comments
COMMENT ON TABLE question_bank_shortfalls IS 'Tracks when question bank cannot fulfill challenge requirements';
COMMENT ON COLUMN question_bank_shortfalls.shortfall IS 'Number of questions short (requested - available)';
COMMENT ON COLUMN question_bank_shortfalls.resolved IS 'Set to true when QB admin adds enough questions';
