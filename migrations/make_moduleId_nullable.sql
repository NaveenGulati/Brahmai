-- Migration: Make moduleId nullable in quizSessions table
-- This allows advanced challenges (multi-topic quizzes) to not have a single moduleId

ALTER TABLE "quizSessions" 
ALTER COLUMN "moduleId" DROP NOT NULL;

-- Add comment to explain the change
COMMENT ON COLUMN "quizSessions"."moduleId" IS 'Module ID for single-module quizzes. NULL for advanced multi-topic challenges.';
