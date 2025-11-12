-- Add headline column to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS headline VARCHAR(255);

-- Add difficulty column to generated_questions table  
ALTER TABLE generated_questions ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'medium';

-- Create index on difficulty for faster filtering
CREATE INDEX IF NOT EXISTS idx_generated_questions_difficulty ON generated_questions(difficulty);
