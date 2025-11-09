-- Clear all audio URLs from cache tables
-- This allows regenerating audio for testing

-- Clear audio from main explanation cache
UPDATE "aiExplanationCache" 
SET "audioUrl" = NULL 
WHERE "audioUrl" IS NOT NULL;

-- Clear audio from simplified explanation versions
UPDATE "explanationVersions" 
SET "audioUrl" = NULL 
WHERE "audioUrl" IS NOT NULL;

-- Show results
SELECT 
  (SELECT COUNT(*) FROM "aiExplanationCache" WHERE "audioUrl" IS NOT NULL) as cache_remaining,
  (SELECT COUNT(*) FROM "explanationVersions" WHERE "audioUrl" IS NOT NULL) as versions_remaining;
