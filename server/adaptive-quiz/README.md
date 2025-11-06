# Adaptive Quiz Engine - Modular System

## Overview

This is a **self-contained, modular adaptive quiz system** that implements world-class adaptive learning algorithms with Focus Areas.

## Architecture

```
adaptive-quiz/
├── README.md                 # This file
├── types.ts                  # TypeScript interfaces and types
├── engine.ts                 # Core adaptive algorithm
├── router.ts                 # tRPC router (API endpoints)
├── db-adapter.ts             # Database abstraction layer
└── __tests__/                # Unit tests (future)
```

## Key Features

1. **Focus Area Based**: Strengthen, Improve, or Balanced
2. **Fully Adaptive**: No rigid complexity boundaries
3. **Multi-dimensional Performance Tracking**: Accuracy, time, topic mastery
4. **Intelligent Question Selection**: Quality scoring and diversity
5. **Modular Design**: Easy to test, debug, and replace

## Usage

### 1. Import the router

```typescript
import { adaptiveQuizRouter } from './adaptive-quiz/router';

export const appRouter = router({
  adaptiveQuiz: adaptiveQuizRouter,
  // ... other routers
});
```

### 2. Start a quiz

```typescript
const result = await trpc.adaptiveQuiz.start.mutate({
  moduleId: 123,
  childId: 456,
  focusArea: 'improve', // 'strengthen' | 'improve' | 'balanced'
  questionCount: 20,
});
```

### 3. Get next question

```typescript
const next = await trpc.adaptiveQuiz.next.mutate({
  sessionId: result.sessionId,
});
```

## Focus Areas

### Strengthen
- Targets topics where student is already performing well (>70% accuracy)
- Gradually increases difficulty within those topics
- Builds confidence and deepens mastery
- Good for: Exam prep, gifted students

### Improve
- Targets topics where student is struggling (<60% accuracy)
- Starts with easier questions to build foundation
- Gradually increases difficulty as understanding improves
- Good for: Remedial learning, filling gaps

### Balanced
- Random topic selection with diversity
- Adapts difficulty based on real-time performance
- Comprehensive assessment across all topics
- Good for: General practice, exploration

## Algorithm

### Performance Metrics
- Overall accuracy
- Recent accuracy (last 5 questions)
- Topic-wise performance
- Difficulty-wise performance
- Time metrics
- Mastery score (0-100)

### Topic Selection
Based on focus area and performance history

### Difficulty Selection
Fully adaptive based on:
1. Recent performance (last 5 questions)
2. Topic-specific performance
3. Difficulty progression
4. Zone of Proximal Development (60-80% sweet spot)

### Question Selection
Quality scoring based on:
- Topic diversity (avoid repetition)
- Question quality (historical data)
- Time appropriateness
- Freshness (not recently answered)

## Database Schema

### Required Tables
- `quizSessions` with `focusArea` field
- `quizResponses` with performance data
- `questions` with topic, difficulty, quality metrics

### Required Fields
```typescript
quizSessions {
  focusArea: 'strengthen' | 'improve' | 'balanced'
}

questions {
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  averageScore: number
  timesUsed: number
}
```

## Testing

Run unit tests:
```bash
npm test server/adaptive-quiz
```

## Future Enhancements

- Machine learning models for difficulty prediction
- Collaborative filtering for question recommendations
- Real-time analytics dashboard
- A/B testing framework
- Multi-armed bandit algorithms
