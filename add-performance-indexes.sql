-- ============================================
-- Performance Optimization Indexes
-- ============================================
-- Add indexes to speed up adaptive quiz queries
-- Run this migration on production database

-- Index for getChildResponses query
-- Speeds up: SELECT * FROM quizSessions WHERE childId = ?
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_child_id 
ON "quizSessions"("childId");

-- Index for session responses lookup
-- Speeds up: SELECT * FROM quizResponses WHERE sessionId IN (...)
CREATE INDEX IF NOT EXISTS idx_quiz_responses_session_id 
ON "quizResponses"("sessionId");

-- Composite index for question history lookup
-- Speeds up: SELECT * FROM quizResponses WHERE sessionId IN (...) ORDER BY id
CREATE INDEX IF NOT EXISTS idx_quiz_responses_session_question 
ON "quizResponses"("sessionId", "questionId", "isCorrect");

-- Index for challenge lookup
-- Speeds up: SELECT * FROM challenges WHERE id = ?
CREATE INDEX IF NOT EXISTS idx_challenges_id 
ON "challenges"("id");

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('quizSessions', 'quizResponses', 'challenges')
ORDER BY tablename, indexname;
