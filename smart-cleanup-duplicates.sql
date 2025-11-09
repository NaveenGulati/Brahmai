-- Smart Duplicate Cleanup Script
-- Strategy:
-- 1. DELETE duplicates that have NEVER been used in quizzes
-- 2. DEACTIVATE duplicates that HAVE been used (preserve data integrity)
-- 3. Always keep the first occurrence (lowest ID)

-- ============================================
-- STEP 1: Identify all duplicates
-- ============================================
\echo '=== DUPLICATE QUESTIONS FOUND ==='
SELECT 
  "questionText",
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id ORDER BY id) as question_ids
FROM questions
WHERE "isActive" = true
GROUP BY "questionText"
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ============================================
-- STEP 2: DELETE unused duplicates (never appeared in quizzes)
-- ============================================
\echo ''
\echo '=== DELETING UNUSED DUPLICATES ==='
WITH duplicates AS (
  SELECT 
    id,
    "questionText",
    ROW_NUMBER() OVER (PARTITION BY "questionText" ORDER BY id) as rn
  FROM questions
  WHERE "isActive" = true
),
unused_duplicates AS (
  SELECT d.id
  FROM duplicates d
  WHERE d.rn > 1  -- Not the first occurrence
    AND NOT EXISTS (
      SELECT 1 
      FROM "quizResponses" qr 
      WHERE qr."questionId" = d.id
    )
)
DELETE FROM questions
WHERE id IN (SELECT id FROM unused_duplicates)
RETURNING id, LEFT("questionText", 60) as question_preview;

-- ============================================
-- STEP 3: DEACTIVATE used duplicates (appeared in quizzes)
-- ============================================
\echo ''
\echo '=== DEACTIVATING USED DUPLICATES ==='
WITH duplicates AS (
  SELECT 
    id,
    "questionText",
    ROW_NUMBER() OVER (PARTITION BY "questionText" ORDER BY id) as rn
  FROM questions
  WHERE "isActive" = true
),
used_duplicates AS (
  SELECT d.id
  FROM duplicates d
  WHERE d.rn > 1  -- Not the first occurrence
    AND EXISTS (
      SELECT 1 
      FROM "quizResponses" qr 
      WHERE qr."questionId" = d.id
    )
)
UPDATE questions
SET "isActive" = false
WHERE id IN (SELECT id FROM used_duplicates)
RETURNING id, LEFT("questionText", 60) as question_preview;

-- ============================================
-- STEP 4: Summary
-- ============================================
\echo ''
\echo '=== CLEANUP SUMMARY ==='
SELECT 
  COUNT(*) FILTER (WHERE "isActive" = true) as active_questions,
  COUNT(*) FILTER (WHERE "isActive" = false) as inactive_questions,
  COUNT(*) as total_questions
FROM questions;

\echo ''
\echo '=== REMAINING DUPLICATES (should be 0) ==='
SELECT 
  "questionText",
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id ORDER BY id) as question_ids
FROM questions
WHERE "isActive" = true
GROUP BY "questionText"
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;
