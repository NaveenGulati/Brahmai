-- Script to identify and deactivate duplicate questions
-- Keeps the first occurrence (lowest ID) of each unique question text

-- First, let's see what duplicates we have
SELECT 
  "questionText",
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id ORDER BY id) as question_ids,
  MIN(id) as keep_id,
  ARRAY_AGG(id ORDER BY id)[2:] as deactivate_ids
FROM questions
WHERE "isActive" = true
GROUP BY "questionText"
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- Deactivate duplicate questions (keeping the first one with lowest ID)
WITH duplicates AS (
  SELECT 
    id,
    "questionText",
    ROW_NUMBER() OVER (PARTITION BY "questionText" ORDER BY id) as rn
  FROM questions
  WHERE "isActive" = true
)
UPDATE questions
SET "isActive" = false
FROM duplicates
WHERE questions.id = duplicates.id
  AND duplicates.rn > 1
RETURNING questions.id, questions."questionText";
