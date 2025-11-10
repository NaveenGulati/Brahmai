-- Clear Image Cache for Regeneration with Validation
-- Run this script to remove cached explanations so they regenerate with proper image validation

-- Option 1: Clear ALL cached explanations (forces complete regeneration with validation)
-- Uncomment the lines below to use this option:
-- DELETE FROM "explanationVersions";
-- DELETE FROM "aiExplanationCache";

-- Option 2: Clear only simplified explanations (levels 1, 2, 3)
-- This keeps the original explanations but forces simplified versions to regenerate
DELETE FROM "explanationVersions" WHERE "simplificationLevel" IN (1, 2, 3);

-- Option 3: Clear cache for specific question IDs (replace with actual IDs)
-- Uncomment and modify the line below to clear specific questions:
-- DELETE FROM "explanationVersions" WHERE "questionId" IN (123, 456, 789);
-- DELETE FROM "aiExplanationCache" WHERE "questionId" IN (123, 456, 789);

-- Verify the cleanup
SELECT COUNT(*) as remaining_cached_explanations FROM "explanationVersions";
SELECT COUNT(*) as remaining_ai_cache FROM "aiExplanationCache";
