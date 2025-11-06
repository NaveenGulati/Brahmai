-- ============================================
-- ADAPTIVE QUIZ MODULE - DATABASE MIGRATION
-- ============================================
-- This migration transitions from complexity-level based system
-- to Focus Area based adaptive quiz system
--
-- Run this BEFORE deploying the new code
-- ============================================

-- 1. Add focusArea column to quizSessions (if not exists)
ALTER TABLE "quizSessions" 
ADD COLUMN IF NOT EXISTS "focusArea" VARCHAR(20) DEFAULT 'balanced';

-- 2. Add focusArea column to challenges (if not exists)
ALTER TABLE "challenges" 
ADD COLUMN IF NOT EXISTS "focusArea" VARCHAR(20) DEFAULT 'balanced';

-- 3. Migrate existing challenges from complexity to focusArea
-- Complexity 1-4: Beginner -> 'improve' (focus on building foundation)
UPDATE "challenges" 
SET "focusArea" = 'improve' 
WHERE "complexity" >= 1 AND "complexity" <= 4 
AND "focusArea" IS NULL;

-- Complexity 5-7: Intermediate -> 'balanced' (comprehensive practice)
UPDATE "challenges" 
SET "focusArea" = 'balanced' 
WHERE "complexity" >= 5 AND "complexity" <= 7 
AND "focusArea" IS NULL;

-- Complexity 8-10: Advanced -> 'strengthen' (build on strengths)
UPDATE "challenges" 
SET "focusArea" = 'strengthen' 
WHERE "complexity" >= 8 AND "complexity" <= 10 
AND "focusArea" IS NULL;

-- 4. Set default for any remaining NULL values
UPDATE "challenges" 
SET "focusArea" = 'balanced' 
WHERE "focusArea" IS NULL;

UPDATE "quizSessions" 
SET "focusArea" = 'balanced' 
WHERE "focusArea" IS NULL;

-- 5. Make focusArea NOT NULL (now that all values are set)
ALTER TABLE "challenges" 
ALTER COLUMN "focusArea" SET NOT NULL;

-- 6. Remove old complexity-related columns (OPTIONAL - keep for now for rollback)
-- Uncomment these lines after confirming the new system works:
-- ALTER TABLE "challenges" DROP COLUMN IF EXISTS "complexity";
-- ALTER TABLE "challenges" DROP COLUMN IF EXISTS "useComplexityBoundaries";
-- ALTER TABLE "challenges" DROP COLUMN IF EXISTS "selectedQuestionIds";
-- ALTER TABLE "quizSessions" DROP COLUMN IF EXISTS "complexity";
-- ALTER TABLE "quizSessions" DROP COLUMN IF EXISTS "useComplexityBoundaries";

-- 7. Create index for performance
CREATE INDEX IF NOT EXISTS "idx_quizSessions_focusArea" ON "quizSessions"("focusArea");
CREATE INDEX IF NOT EXISTS "idx_challenges_focusArea" ON "challenges"("focusArea");

-- 8. Add comments for documentation
COMMENT ON COLUMN "quizSessions"."focusArea" IS 'Adaptive quiz focus: strengthen (build on strengths), improve (work on weaknesses), balanced (comprehensive)';
COMMENT ON COLUMN "challenges"."focusArea" IS 'Challenge focus area: strengthen, improve, or balanced';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration was successful:

-- Check focusArea distribution in challenges
-- SELECT "focusArea", COUNT(*) as count FROM "challenges" GROUP BY "focusArea";

-- Check focusArea distribution in quiz sessions
-- SELECT "focusArea", COUNT(*) as count FROM "quizSessions" GROUP BY "focusArea";

-- Check for any NULL focusArea values (should be 0)
-- SELECT COUNT(*) FROM "challenges" WHERE "focusArea" IS NULL;
-- SELECT COUNT(*) FROM "quizSessions" WHERE "focusArea" IS NULL;

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- If you need to rollback this migration:
-- 
-- ALTER TABLE "challenges" DROP COLUMN "focusArea";
-- ALTER TABLE "quizSessions" DROP COLUMN "focusArea";
-- 
-- Then restore from backup or redeploy old code
