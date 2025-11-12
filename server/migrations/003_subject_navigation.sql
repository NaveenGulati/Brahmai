-- Add grade and board to subjects table
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS grade INTEGER DEFAULT 7;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS board VARCHAR(50) DEFAULT 'ICSE';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS display_sequence INTEGER DEFAULT 0;

-- Add grade and board to children table
ALTER TABLE children ADD COLUMN IF NOT EXISTS grade INTEGER DEFAULT 7;
ALTER TABLE children ADD COLUMN IF NOT EXISTS board VARCHAR(50) DEFAULT 'ICSE';

-- Create child-subject mapping table
CREATE TABLE IF NOT EXISTS child_subjects (
  id SERIAL PRIMARY KEY,
  child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(child_id, subject_id)
);

-- Update existing subjects with display sequence (if they exist)
-- This is safe to run multiple times
UPDATE subjects SET display_sequence = 1 WHERE name = 'Physics' AND display_sequence = 0;
UPDATE subjects SET display_sequence = 2 WHERE name = 'Chemistry' AND display_sequence = 0;
UPDATE subjects SET display_sequence = 3 WHERE name = 'Biology' AND display_sequence = 0;
UPDATE subjects SET display_sequence = 4 WHERE name = 'Mathematics' AND display_sequence = 0;
UPDATE subjects SET display_sequence = 5 WHERE name = 'English' AND display_sequence = 0;
UPDATE subjects SET display_sequence = 6 WHERE name = 'History' AND display_sequence = 0;
UPDATE subjects SET display_sequence = 7 WHERE name = 'Geography' AND display_sequence = 0;
UPDATE subjects SET display_sequence = 8 WHERE name = 'Computer Science' AND display_sequence = 0;
