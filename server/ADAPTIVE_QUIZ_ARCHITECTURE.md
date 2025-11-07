# Adaptive Quiz System - Architecture & Code Organization

## System Overview

The Brahmai adaptive quiz system consists of TWO separate systems that work together:

1. **Challenge Creation System** (Legacy) - Pre-selects questions for challenges
2. **Adaptive Quiz Execution System** (New) - Dynamically selects questions during quiz

## Component Breakdown

### 1. Challenge Creation (Parent Creates Challenge)

**Location:** `server/adaptive-challenge-router.ts`

**Purpose:** Allows parents to create quiz challenges for their children

**What it does:**
- Accepts: `childId`, `moduleId`, `questionCount`, `focusArea`
- Calls `question-selector.ts` (legacy code)
- Stores challenge metadata in `challenges` table
- **Does NOT store pre-selected questions**

**Files involved:**
- `server/adaptive-challenge-router.ts` - tRPC router
- `server/question-selector.ts` - **LEGACY** (output not used)

### 2. Quiz Execution (Student Takes Quiz)

**Location:** `server/adaptive-quiz/`

**Purpose:** Dynamically selects questions based on real-time performance

**What it does:**
- Reads `focusArea` and `questionCount` from challenge
- Fetches ALL questions from module
- Selects questions ONE AT A TIME based on performance
- Adapts difficulty in real-time

**Files involved:**
- `mutations.ts` - Main quiz logic (start, getNextQuestion)
- `engine.ts` - Difficulty algorithm & question scoring
- `db-adapter.ts` - Database operations
- `router.ts` - tRPC endpoints
- `types.ts` - TypeScript interfaces

## Data Flow

```
Parent Creates Challenge
  ↓
adaptive-challenge-router.ts
  ↓
Stores: { focusArea, questionCount, moduleId }
  ↓
Student Starts Quiz
  ↓
adaptive-quiz/mutations.ts → startQuizMutation()
  ↓
Reads challenge metadata
  ↓
Fetches ALL module questions
  ↓
Selects first question (medium)
  ↓
Student Answers
  ↓
adaptive-quiz/mutations.ts → getNextQuestion()
  ↓
Calculates performance metrics
  ↓
adaptive-quiz/engine.ts → determineOptimalDifficulty()
  ↓
Determines target difficulty (easy/medium/hard)
  ↓
Filters questions by difficulty + topic
  ↓
adaptive-quiz/engine.ts → selectBestQuestion()
  ↓
Scores candidates based on focus area & history
  ↓
Returns highest-scoring question
```

## Legacy Code Clarification

### `server/question-selector.ts`

⚠️ **This file is LEGACY and its output is NOT used during quiz execution.**

**Why it exists:**
- Called during challenge creation for backwards compatibility
- Calculates difficulty distribution (60% easy, 30% medium, 10% hard for "strengthen")
- Returns pre-selected question IDs

**Why it's not used:**
- The NEW adaptive system selects questions dynamically during quiz
- Pre-selection defeats the purpose of adaptive learning
- Real-time performance data is more accurate

**What should happen:**
- Challenge creation should ONLY store metadata
- Remove the call to `selectQuestionsForChallenge()`
- Let the adaptive system handle everything

## Performance Optimizations

### Database Indexes (Added)

```sql
-- Fast child session lookup
CREATE INDEX idx_quiz_sessions_child_id ON "quizSessions"("childId");

-- Fast response queries
CREATE INDEX idx_quiz_responses_session_id ON "quizResponses"("sessionId");

-- Composite index for question history
CREATE INDEX idx_quiz_responses_session_question 
ON "quizResponses"("sessionId", "questionId", "isCorrect");
```

### Caching (Implemented)

**Location:** `server/db.ts → getChildResponses()`

**Strategy:**
- In-memory cache (Map)
- TTL: 5 minutes
- Cleared on quiz completion
- Limits data to last 100 sessions or 90 days

**Benefits:**
- Reduces database load by ~90%
- Speeds up question selection
- No stale data (cache cleared on completion)

### Query Optimization

**Before:**
```typescript
// Fetched ALL responses with ALL fields
SELECT * FROM quizResponses 
WHERE sessionId IN (SELECT id FROM quizSessions WHERE childId = ?)
```

**After:**
```typescript
// Fetches only recent responses with only necessary fields
SELECT questionId, isCorrect, sessionId 
FROM quizResponses 
WHERE sessionId IN (
  SELECT id FROM quizSessions 
  WHERE childId = ? 
  AND createdAt > NOW() - INTERVAL '90 days'
  ORDER BY createdAt DESC 
  LIMIT 100
)
```

## Topic Boundaries

**Rule:** 100% of questions must come from the selected module's primary topic.

**Implementation:**
1. Fetch all questions from module (may include multiple topics)
2. Identify primary topic (most common topic in module)
3. Filter: `moduleQuestions = allQuestions.filter(q => q.topic === moduleTopic)`
4. All subsequent operations use `moduleQuestions`
5. Fallback logic respects topic boundary

## Focus Area Implementation

### Strengthen (Build Confidence)
- Question scoring: +40 for questions with ≥80% accuracy
- Difficulty distribution: More easy questions initially
- Goal: Reinforce mastery

### Improve (Challenge & Grow)
- Question scoring: +40 for questions with <50% accuracy
- Difficulty distribution: More hard questions
- Goal: Target weak areas

### Balanced (Mixed Practice)
- Question scoring: No adjustment
- Difficulty distribution: Even mix
- Goal: Comprehensive assessment

## Difficulty Progression Rules

See `server/adaptive-quiz/engine.ts → determineOptimalDifficulty()`

| Priority | Rule | Condition | Action |
|----------|------|-----------|--------|
| Highest | First Question | questionsAnswered === 0 | medium |
| High | RULE 1 | First in topic | medium |
| High | RULE 2a | recentAccuracy < 0.4 | easy |
| High | RULE 2b | recentAccuracy > 0.9 | hard |
| Medium | RULE 3a | topicAccuracy < 0.5 | easy |
| Medium | RULE 3b | topicAccuracy > 0.8 | hard |
| Medium | RULE 4a | difficultyAccuracy > 0.8 | progress up |
| Medium | RULE 4b | difficultyAccuracy < 0.5 | progress down |
| Low | RULE 5 | recentAccuracy 0.6-0.8 | maintain |
| Lowest | DEFAULT | No match | medium |

## Testing the System

### 1. Check Logs

Look for these messages in Render logs:
```
[Adaptive Quiz] Module topic: Metals and Non-Metals
[Difficulty] RULE 2: Recent accuracy < 0.4 -> easy
[Adaptive Quiz] Selected question 286 from 23 candidates
```

### 2. Verify Focus Area

- **Strengthen:** Should show mostly questions the student has mastered
- **Improve:** Should show mostly questions the student struggled with
- **Balanced:** Should show a mix

### 3. Check Difficulty Progression

- Answer correctly → difficulty should increase
- Answer incorrectly → difficulty should decrease
- 60-80% accuracy → difficulty should maintain

## Future Refactoring

### Remove Legacy Pre-Selection

**Current:**
```typescript
// adaptive-challenge-router.ts
const { questionIds } = await selectQuestionsForChallenge({...});
// questionIds are calculated but NOT stored
```

**Proposed:**
```typescript
// adaptive-challenge-router.ts
// Just store metadata, no question selection
await database.insert(challenges).values({
  focusArea,
  questionCount,
  moduleId,
  // No questionIds field
});
```

This would eliminate the unnecessary call to `question-selector.ts` and make the system cleaner.
