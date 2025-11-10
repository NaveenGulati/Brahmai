-- Clear cache for steam engine question (ID 515) to test improved validation
-- Run this after deployment completes

-- Clear from detailed explanation cache
DELETE FROM "aiExplanationCache" WHERE "questionId" = 515;

-- Clear from simplified explanation versions
DELETE FROM "explanationVersions" WHERE "questionId" = 515;

-- Verify deletion
SELECT 
  (SELECT COUNT(*) FROM "aiExplanationCache" WHERE "questionId" = 515) as detailed_cache_count,
  (SELECT COUNT(*) FROM "explanationVersions" WHERE "questionId" = 515) as simplified_cache_count;

-- Expected result: Both counts should be 0
