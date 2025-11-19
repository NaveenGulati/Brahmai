-- Check quiz session 140 and its answers
SELECT 
    qs.id as session_id,
    qs."childId",
    qs."moduleId",
    qs.status,
    COUNT(qa.id) as total_answers
FROM "quizSessions" qs
LEFT JOIN "quizAnswers" qa ON qa."sessionId" = qs.id
WHERE qs.id = 140
GROUP BY qs.id, qs."childId", qs."moduleId", qs.status;

-- Check if answers have detailed explanations
SELECT 
    qa.id as answer_id,
    qa."questionId",
    qa."isCorrect",
    LENGTH(qa."detailedExplanation") as explanation_length,
    CASE 
        WHEN qa."detailedExplanation" IS NULL THEN 'NULL'
        WHEN qa."detailedExplanation" = '' THEN 'EMPTY'
        ELSE 'HAS_CONTENT'
    END as explanation_status
FROM "quizAnswers" qa
WHERE qa."sessionId" = 140
ORDER BY qa.id;

-- Check the actual questions used
SELECT 
    q.id,
    q.question,
    LENGTH(q."detailedExplanation") as cached_explanation_length,
    CASE 
        WHEN q."detailedExplanation" IS NULL THEN 'NULL'
        WHEN q."detailedExplanation" = '' THEN 'EMPTY'
        ELSE 'HAS_CONTENT'
    END as cached_status
FROM questions q
WHERE q.id IN (
    SELECT "questionId" FROM "quizAnswers" WHERE "sessionId" = 140
)
ORDER BY q.id;
