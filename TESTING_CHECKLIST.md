# Focus Area System - Testing Checklist

## Prerequisites
- [ ] Fix login flow (quick login buttons or manual login)
- [ ] Log in as Demo Parent (username: `demo_parent`, password: `demo123`)
- [ ] Navigate to Parent Dashboard

## Phase 1: Challenge Creation Testing

### Test 1: Create Challenge with "Strengthen" Focus
- [ ] Click "Create Challenge" or "Assign Challenge"
- [ ] Select a child (e.g., "Demo Child")
- [ ] Select a subject (e.g., "Mathematics")
- [ ] Select a module/topic
- [ ] Set question count (e.g., 20 questions)
- [ ] Select **"Strengthen"** focus area
- [ ] Click "Create Challenge"
- [ ] **Expected:** Success toast, challenge appears in pending list
- [ ] **Verify:** Challenge message shows "with strengthen focus"

### Test 2: Create Challenge with "Balanced" Focus
- [ ] Repeat above steps
- [ ] Select **"Balanced"** focus area
- [ ] **Expected:** Success, message shows "with balanced focus"

### Test 3: Create Challenge with "Improve" Focus
- [ ] Repeat above steps
- [ ] Select **"Improve"** focus area
- [ ] **Expected:** Success, message shows "with improve focus"

### Test 4: Verify Database Records
```sql
-- Check that challenges were created with correct focusArea
SELECT id, title, focusArea, questionCount, estimatedDuration, status
FROM challenges
ORDER BY id DESC
LIMIT 3;
```
- [ ] **Expected:** Three challenges with focusArea values: 'strengthen', 'balanced', 'improve'

## Phase 2: Quiz Flow Testing

### Test 5: Take Quiz with "Strengthen" Focus
- [ ] Log in as Demo Child
- [ ] Navigate to available challenges
- [ ] Start the "Strengthen" challenge
- [ ] **Observe:** First few questions should be mostly easy
- [ ] Answer questions (mix of correct and incorrect)
- [ ] Complete the quiz
- [ ] **Verify:** Quiz completion success, results shown

### Test 6: Check Question Distribution
```sql
-- After completing quiz, check actual difficulty distribution
SELECT 
  q.difficulty,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM quizAnswers WHERE sessionId = <SESSION_ID>), 1) as percentage
FROM quizAnswers qa
JOIN questions q ON qa.questionId = q.id
WHERE qa.sessionId = <SESSION_ID>
GROUP BY q.difficulty;
```
- [ ] **Expected for Strengthen:** ~60% easy, ~30% medium, ~10% hard
- [ ] **Expected for Balanced:** ~33% each
- [ ] **Expected for Improve:** ~10% easy, ~30% medium, ~60% hard

## Phase 3: Adaptive Algorithm Verification

### Test 7: Verify Difficulty Adaptation
- [ ] Start a new "Balanced" challenge
- [ ] Answer first 5 questions **correctly**
- [ ] **Observe:** Next questions should trend harder
- [ ] Answer next 5 questions **incorrectly**
- [ ] **Observe:** Questions should adjust to easier/medium
- [ ] **Expected:** Algorithm adapts based on performance

### Test 8: Check Performance Tracking
```sql
-- Verify performance data is being tracked
SELECT * FROM studentTopicPerformance
WHERE childId = <CHILD_ID>
ORDER BY updatedAt DESC
LIMIT 5;
```
- [ ] **Expected:** Records show updated accuracy, avgScore, totalAttempts

## Phase 4: Edge Cases

### Test 9: Minimum Questions (10)
- [ ] Create challenge with 10 questions
- [ ] **Expected:** Works correctly, proper distribution

### Test 10: Maximum Questions (100)
- [ ] Create challenge with 100 questions
- [ ] **Expected:** Works correctly, maintains distribution ratios

### Test 11: Module with Few Questions
- [ ] Select a module that has < 20 questions
- [ ] Try to create 20-question challenge
- [ ] **Expected:** Either works with available questions or shows appropriate error

## Phase 5: UI/UX Verification

### Test 12: Focus Area UI
- [ ] Check that Focus Area selector shows:
  - [ ] "Strengthen" with green styling and description
  - [ ] "Balanced" with blue styling and description
  - [ ] "Improve" with orange/red styling and description
- [ ] **Expected:** Clear, intuitive interface

### Test 13: Challenge List Display
- [ ] View pending challenges list
- [ ] **Verify:** Each challenge shows:
  - [ ] Subject and module name
  - [ ] Question count
  - [ ] Focus area (in message or badge)
  - [ ] Estimated duration

## Phase 6: Backend Verification

### Test 14: Check Server Logs
```bash
# Monitor server logs while creating challenges
cd /home/ubuntu/Brahmai
# Server logs should show:
# - Successful challenge creation
# - Question selection process
# - No errors or warnings
```

### Test 15: API Response Validation
- [ ] Open browser DevTools → Network tab
- [ ] Create a challenge
- [ ] Check the `createAdaptiveChallenge` mutation response
- [ ] **Expected:** Returns `{ challengeId, questionCount, estimatedDuration, distribution }`

## Success Criteria

### ✅ All Tests Pass If:
1. Challenges can be created with all three focus areas
2. Database records show correct `focusArea` values
3. Question difficulty distribution matches expected ratios
4. Adaptive algorithm adjusts difficulty based on performance
5. No errors in console or server logs
6. UI is clear and intuitive
7. Performance data is tracked correctly

### 🔴 Critical Issues:
- Cannot create challenges → Check router and validation
- Wrong difficulty distribution → Check `calculateDifficultyDistribution()`
- No adaptation → Check adaptive quiz engine
- Database errors → Check schema and insert statements

### ⚠️ Known Issues (Non-Critical):
- Drizzle ORM TypeScript warning at line 204 (has workaround)
- Login flow issues (unrelated to focus area system)

---
**Last Updated:** 2025-11-06  
**Status:** Ready for testing once login is fixed
