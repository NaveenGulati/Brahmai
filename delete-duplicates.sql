-- Script to DELETE duplicate questions (keeping the first occurrence)
-- IMPORTANT: This will fail if duplicate questions have been used in quizzes
-- In that case, we need to update quiz responses to point to the kept question

-- Step 1: Identify duplicates
SELECT 
  "questionText",
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id ORDER BY id) as question_ids,
  MIN(id) as keep_id
FROM questions
WHERE "isActive" = true
GROUP BY "questionText"
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- Step 2: Update quiz responses to point to the kept question (first occurrence)
WITH duplicates AS (
  SELECT 
    id,
    "questionText",
    FIRST_VALUE(id) OVER (PARTITION BY "questionText" ORDER BY id) as keep_id,
    ROW_NUMBER() OVER (PARTITION BY "questionText" ORDER BY id) as rn
  FROM questions
  WHERE "isActive" = true
)
UPDATE "quizResponses"
SET "questionId" = duplicates.keep_id
FROM duplicates
WHERE "quizResponses"."questionId" = duplicates.id
  AND duplicates.rn > 1
RETURNING "quizResponses".id, "quizResponses"."questionId";

-- Step 3: Delete duplicate questions (keeping the first one with lowest ID)
WITH duplicates AS (
  SELECT 
    id,
    "questionText",
    ROW_NUMBER() OVER (PARTITION BY "questionText" ORDER BY id) as rn
  FROM questions
  WHERE "isActive" = true
)
DELETE FROM questions
USING duplicates
WHERE questions.id = duplicates.id
  AND duplicates.rn > 1
RETURNING questions.id, LEFT(questions."questionText", 60) as question_preview;
