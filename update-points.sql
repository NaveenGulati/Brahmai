-- Update points based on difficulty
-- Easy: 5 points, Medium: 10 points, Hard: 15 points

-- Check current distribution
SELECT difficulty, points, COUNT(*) as count 
FROM questions 
GROUP BY difficulty, points
ORDER BY difficulty, points;

-- Update easy questions to 5 points
UPDATE questions 
SET points = 5 
WHERE difficulty = 'easy';

-- Update medium questions to 10 points
UPDATE questions 
SET points = 10 
WHERE difficulty = 'medium';

-- Update hard questions to 15 points
UPDATE questions 
SET points = 15 
WHERE difficulty = 'hard';

-- Verify the update
SELECT difficulty, points, COUNT(*) as count 
FROM questions 
GROUP BY difficulty, points
ORDER BY difficulty, points;

-- Summary
SELECT 
  'Total Questions' as metric,
  COUNT(*) as value
FROM questions
UNION ALL
SELECT 
  'Easy (5 pts)' as metric,
  COUNT(*) as value
FROM questions WHERE difficulty = 'easy'
UNION ALL
SELECT 
  'Medium (10 pts)' as metric,
  COUNT(*) as value
FROM questions WHERE difficulty = 'medium'
UNION ALL
SELECT 
  'Hard (15 pts)' as metric,
  COUNT(*) as value
FROM questions WHERE difficulty = 'hard';
