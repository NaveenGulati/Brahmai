-- Add complexity boundary fields to quizSessions table
-- This enables adaptive quizzes to respect complexity guardrails

ALTER TABLE "quizSessions" 
ADD COLUMN IF NOT EXISTS "challengeId" INTEGER,
ADD COLUMN IF NOT EXISTS "complexity" INTEGER,
ADD COLUMN IF NOT EXISTS "useComplexityBoundaries" BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN "quizSessions"."challengeId" IS 'FK to challenges table - links session to challenge';
COMMENT ON COLUMN "quizSessions"."complexity" IS 'Complexity level (1-10) for boundary enforcement';
COMMENT ON COLUMN "quizSessions"."useComplexityBoundaries" IS 'Whether to enforce complexity boundaries during adaptive selection';
