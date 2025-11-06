-- Migration: Convert from Complexity Levels to Focus Areas
-- This migration removes complexity-based fields and adds focusArea

-- ============================================
-- 1. Update challenges table
-- ============================================

-- Add focusArea column if it doesn't exist
ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS "focusArea" VARCHAR(20) DEFAULT 'balanced';

-- Migrate existing complexity values to focusArea
-- Levels 1-4: improve (struggling students)
-- Levels 5-7: balanced (average students)
-- Levels 8-10: strengthen (advanced students)
UPDATE challenges 
SET "focusArea" = CASE 
  WHEN complexity <= 4 THEN 'improve'
  WHEN complexity >= 8 THEN 'strengthen'
  ELSE 'balanced'
END
WHERE "focusArea" IS NULL OR "focusArea" = 'neutral';

-- Drop old columns
ALTER TABLE challenges 
DROP COLUMN IF EXISTS complexity,
DROP COLUMN IF EXISTS "difficultyDistribution",
DROP COLUMN IF EXISTS "selectedQuestionIds",
DROP COLUMN IF EXISTS "useComplexityBoundaries";

-- ============================================
-- 2. Update quizSessions table
-- ============================================

-- Add focusArea column if it doesn't exist
ALTER TABLE "quizSessions" 
ADD COLUMN IF NOT EXISTS "focusArea" VARCHAR(20) DEFAULT 'balanced';

-- Migrate existing complexity values to focusArea
UPDATE "quizSessions" 
SET "focusArea" = CASE 
  WHEN complexity <= 4 THEN 'improve'
  WHEN complexity >= 8 THEN 'strengthen'
  ELSE 'balanced'
END
WHERE "focusArea" IS NULL;

-- Drop old columns
ALTER TABLE "quizSessions" 
DROP COLUMN IF EXISTS complexity,
DROP COLUMN IF EXISTS "useComplexityBoundaries";

-- ============================================
-- 3. Verify migration
-- ============================================

-- Check focusArea distribution in challenges
SELECT "focusArea", COUNT(*) as count
FROM challenges
GROUP BY "focusArea";

-- Check focusArea distribution in quizSessions
SELECT "focusArea", COUNT(*) as count
FROM "quizSessions"
GROUP BY "focusArea";

-- ============================================
-- Migration complete!
-- ============================================
