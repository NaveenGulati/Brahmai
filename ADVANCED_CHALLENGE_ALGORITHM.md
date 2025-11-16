# Advanced Challenge Algorithm - Technical Specification

**Date:** November 16, 2025  
**Feature:** Multi-Topic Adaptive Challenge  
**Status:** Final Design - Ready for Implementation

---

## Core Requirements

1. ✅ **Max 10 topics** - Hard limit enforced
2. ✅ **No editing** - Immutable after creation
3. ✅ **Adaptive mixing** - Questions interleaved, not sequential
4. ✅ **Smart suggestions** - System suggests, parent can modify
5. ✅ **Proportional adjustment** - Maintains distribution when total changes
6. ✅ **Zero errors** - Bulletproof validation and edge case handling

---

## Algorithm Overview

### Phase 1: Topic Selection
Parent selects topics/subtopics → System calculates available questions

### Phase 2: Question Count Suggestion
System suggests optimal total → Parent can accept or modify

### Phase 3: Distribution Calculation
System calculates exact distribution → Shows preview

### Phase 4: Question Selection
System selects specific questions → Adaptive mixing

### Phase 5: Quiz Execution
Questions presented in mixed order → Adaptive difficulty

---

## Detailed Algorithm Specification

### 1. Calculate Available Questions

```typescript
interface TopicSelection {
  subject: string;
  topic: string;
  subtopics: string[] | 'all'; // 'all' or specific subtopic names
}

interface AvailableQuestions {
  selection: TopicSelection;
  totalAvailable: number;
  byDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
}

async function calculateAvailableQuestions(
  selections: TopicSelection[]
): Promise<AvailableQuestions[]> {
  const results: AvailableQuestions[] = [];
  
  for (const selection of selections) {
    // Query database for available questions
    const questions = await db.questions.findMany({
      where: {
        subject: selection.subject,
        topic: selection.topic,
        subTopic: selection.subtopics === 'all' 
          ? undefined 
          : { in: selection.subtopics },
        status: 'approved',
        isActive: true
      },
      select: {
        id: true,
        difficulty: true
      }
    });
    
    // Count by difficulty
    const byDifficulty = {
      easy: questions.filter(q => q.difficulty === 'easy').length,
      medium: questions.filter(q => q.difficulty === 'medium').length,
      hard: questions.filter(q => q.difficulty === 'hard').length
    };
    
    results.push({
      selection,
      totalAvailable: questions.length,
      byDifficulty
    });
  }
  
  return results;
}
```

**Validation:**
- ✅ Each selection must have at least 3 questions
- ✅ Warn if any selection has < 10 questions
- ✅ Error if any selection has 0 questions

---

### 2. Suggest Optimal Question Count

```typescript
interface QuestionCountSuggestion {
  recommended: number;
  minimum: number;
  maximum: number;
  reasoning: string;
  estimatedDuration: number; // in minutes
}

function suggestQuestionCount(
  available: AvailableQuestions[]
): QuestionCountSuggestion {
  const topicCount = available.length;
  const totalAvailable = available.reduce((sum, a) => sum + a.totalAvailable, 0);
  
  // Base recommendation on topic count
  let recommended: number;
  if (topicCount === 1) {
    recommended = 25;
  } else if (topicCount <= 3) {
    recommended = 30;
  } else if (topicCount <= 5) {
    recommended = 50;
  } else if (topicCount <= 7) {
    recommended = 75;
  } else {
    recommended = 100;
  }
  
  // Minimum: 3 questions per topic (or available if less)
  const minimum = Math.min(
    topicCount * 3,
    totalAvailable
  );
  
  // Maximum: total available or 200 (whichever is lower)
  const maximum = Math.min(totalAvailable, 200);
  
  // Adjust recommended if outside bounds
  recommended = Math.max(minimum, Math.min(recommended, maximum));
  
  // Generate reasoning
  let reasoning = `Based on ${topicCount} topic${topicCount > 1 ? 's' : ''} selected, `;
  reasoning += `we recommend ${recommended} questions for comprehensive coverage. `;
  reasoning += `This ensures at least ${Math.floor(recommended / topicCount)} questions per topic.`;
  
  // Estimate duration (assume 60 seconds per question)
  const estimatedDuration = recommended;
  
  return {
    recommended,
    minimum,
    maximum,
    reasoning,
    estimatedDuration
  };
}
```

**UI Display:**
```
┌─────────────────────────────────────────┐
│ Recommended Quiz Length                 │
├─────────────────────────────────────────┤
│ Based on 3 topics selected, we          │
│ recommend 30 questions for comprehensive │
│ coverage. This ensures at least 10       │
│ questions per topic.                     │
│                                         │
│ Total Questions: [30] ▼                 │
│   Range: 9 - 1,309 questions            │
│   Estimated time: ~30 minutes           │
│                                         │
│ [Use Recommended] [Customize]           │
└─────────────────────────────────────────┘
```

---

### 3. Calculate Proportional Distribution

```typescript
interface QuestionDistribution {
  selection: TopicSelection;
  allocated: number;
  percentage: number;
  byDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
}

const MIN_QUESTIONS_PER_TOPIC = 3;

function calculateDistribution(
  available: AvailableQuestions[],
  totalQuestions: number,
  focusArea: 'strengthen' | 'balanced' | 'improve'
): QuestionDistribution[] {
  // Step 1: Calculate total available across all topics
  const totalAvailable = available.reduce((sum, a) => sum + a.totalAvailable, 0);
  
  // Step 2: Initial proportional allocation
  let distribution = available.map(a => {
    const proportion = a.totalAvailable / totalAvailable;
    const allocated = Math.round(totalQuestions * proportion);
    
    return {
      selection: a.selection,
      allocated,
      percentage: proportion * 100,
      available: a.totalAvailable,
      byDifficultyAvailable: a.byDifficulty
    };
  });
  
  // Step 3: Apply minimum guarantee (3 questions per topic)
  distribution = distribution.map(d => {
    if (d.allocated < MIN_QUESTIONS_PER_TOPIC && d.available >= MIN_QUESTIONS_PER_TOPIC) {
      return { ...d, allocated: MIN_QUESTIONS_PER_TOPIC };
    }
    return d;
  });
  
  // Step 4: Adjust for rounding errors and minimum guarantees
  let currentTotal = distribution.reduce((sum, d) => sum + d.allocated, 0);
  let difference = totalQuestions - currentTotal;
  
  while (difference !== 0) {
    if (difference > 0) {
      // Need to add questions - give to largest allocation
      const largest = distribution.reduce((max, d) => 
        d.allocated > max.allocated ? d : max
      );
      largest.allocated++;
      difference--;
    } else {
      // Need to remove questions - take from largest allocation (above minimum)
      const largest = distribution
        .filter(d => d.allocated > MIN_QUESTIONS_PER_TOPIC)
        .reduce((max, d) => d.allocated > max.allocated ? d : max, distribution[0]);
      
      if (largest.allocated > MIN_QUESTIONS_PER_TOPIC) {
        largest.allocated--;
        difference++;
      } else {
        // Can't reduce further without violating minimum
        throw new Error(
          `Cannot allocate ${totalQuestions} questions while maintaining minimum of ${MIN_QUESTIONS_PER_TOPIC} per topic. ` +
          `Minimum required: ${distribution.length * MIN_QUESTIONS_PER_TOPIC}`
        );
      }
    }
  }
  
  // Step 5: Calculate difficulty distribution for each topic
  const difficultyWeights = getDifficultyWeights(focusArea);
  
  const finalDistribution = distribution.map(d => {
    const byDifficulty = calculateDifficultyDistribution(
      d.allocated,
      d.byDifficultyAvailable,
      difficultyWeights
    );
    
    return {
      selection: d.selection,
      allocated: d.allocated,
      percentage: (d.allocated / totalQuestions) * 100,
      byDifficulty
    };
  });
  
  return finalDistribution;
}

function getDifficultyWeights(focusArea: 'strengthen' | 'balanced' | 'improve') {
  switch (focusArea) {
    case 'strengthen':
      return { easy: 0.6, medium: 0.3, hard: 0.1 };
    case 'balanced':
      return { easy: 0.33, medium: 0.34, hard: 0.33 };
    case 'improve':
      return { easy: 0.1, medium: 0.3, hard: 0.6 };
  }
}

function calculateDifficultyDistribution(
  totalAllocated: number,
  available: { easy: number; medium: number; hard: number },
  weights: { easy: number; medium: number; hard: number }
): { easy: number; medium: number; hard: number } {
  // Calculate ideal distribution
  let easy = Math.round(totalAllocated * weights.easy);
  let medium = Math.round(totalAllocated * weights.medium);
  let hard = Math.round(totalAllocated * weights.hard);
  
  // Adjust for availability constraints
  easy = Math.min(easy, available.easy);
  medium = Math.min(medium, available.medium);
  hard = Math.min(hard, available.hard);
  
  // Adjust for rounding errors
  let current = easy + medium + hard;
  let diff = totalAllocated - current;
  
  // Distribute remaining questions to available difficulties
  while (diff > 0) {
    if (easy < available.easy) { easy++; diff--; }
    else if (medium < available.medium) { medium++; diff--; }
    else if (hard < available.hard) { hard++; diff--; }
    else break; // Can't allocate more
  }
  
  // If we still can't meet total, reduce from largest
  while (diff < 0) {
    if (easy > 0 && easy >= medium && easy >= hard) { easy--; diff++; }
    else if (medium > 0 && medium >= hard) { medium--; diff++; }
    else if (hard > 0) { hard--; diff++; }
    else break;
  }
  
  return { easy, medium, hard };
}
```

**Validation:**
- ✅ Sum of allocated equals total requested
- ✅ Each topic has at least MIN_QUESTIONS_PER_TOPIC
- ✅ No allocation exceeds available questions
- ✅ Difficulty distribution respects availability

---

### 4. Select Specific Questions (Adaptive Mixing)

```typescript
interface SelectedQuestion {
  questionId: number;
  topicIndex: number; // Which topic this came from
  difficulty: 'easy' | 'medium' | 'hard';
  orderIndex: number; // Position in final quiz
}

async function selectQuestions(
  distribution: QuestionDistribution[]
): Promise<SelectedQuestion[]> {
  const allSelected: SelectedQuestion[] = [];
  
  // Step 1: Select questions for each topic
  for (let topicIndex = 0; topicIndex < distribution.length; topicIndex++) {
    const dist = distribution[topicIndex];
    
    // Get available questions for this topic
    const availableQuestions = await db.questions.findMany({
      where: {
        subject: dist.selection.subject,
        topic: dist.selection.topic,
        subTopic: dist.selection.subtopics === 'all'
          ? undefined
          : { in: dist.selection.subtopics },
        status: 'approved',
        isActive: true
      },
      select: {
        id: true,
        difficulty: true,
        questionText: true // For duplicate detection
      }
    });
    
    // Group by difficulty
    const byDifficulty = {
      easy: availableQuestions.filter(q => q.difficulty === 'easy'),
      medium: availableQuestions.filter(q => q.difficulty === 'medium'),
      hard: availableQuestions.filter(q => q.difficulty === 'hard')
    };
    
    // Randomly select from each difficulty
    const selectedEasy = randomSelect(byDifficulty.easy, dist.byDifficulty.easy);
    const selectedMedium = randomSelect(byDifficulty.medium, dist.byDifficulty.medium);
    const selectedHard = randomSelect(byDifficulty.hard, dist.byDifficulty.hard);
    
    // Add to collection
    [...selectedEasy, ...selectedMedium, ...selectedHard].forEach(q => {
      allSelected.push({
        questionId: q.id,
        topicIndex,
        difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
        orderIndex: 0 // Will be set in next step
      });
    });
  }
  
  // Step 2: Mix questions adaptively (not sequential by topic)
  const mixed = adaptiveMixing(allSelected, distribution.length);
  
  return mixed;
}

function randomSelect<T>(array: T[], count: number): T[] {
  if (count >= array.length) return [...array];
  
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Adaptive Mixing Algorithm
 * Ensures questions from different topics are interleaved, not sequential
 * 
 * Strategy:
 * 1. Create "buckets" for each topic
 * 2. Distribute questions round-robin across topics
 * 3. Add randomness to avoid predictable patterns
 * 4. Ensure no topic has more than 3 consecutive questions
 */
function adaptiveMixing(
  questions: SelectedQuestion[],
  topicCount: number
): SelectedQuestion[] {
  // Group questions by topic
  const byTopic: SelectedQuestion[][] = Array.from(
    { length: topicCount },
    () => []
  );
  
  questions.forEach(q => {
    byTopic[q.topicIndex].push(q);
  });
  
  // Shuffle within each topic to randomize order
  byTopic.forEach(bucket => {
    bucket.sort(() => Math.random() - 0.5);
  });
  
  const mixed: SelectedQuestion[] = [];
  const MAX_CONSECUTIVE = 3; // Max questions from same topic in a row
  let lastTopicIndex = -1;
  let consecutiveCount = 0;
  
  // Round-robin with adaptive selection
  while (mixed.length < questions.length) {
    // Find topics that still have questions
    const availableTopics = byTopic
      .map((bucket, index) => ({ index, count: bucket.length }))
      .filter(t => t.count > 0);
    
    if (availableTopics.length === 0) break;
    
    // Select next topic
    let nextTopicIndex: number;
    
    if (consecutiveCount >= MAX_CONSECUTIVE) {
      // Force switch to different topic
      const otherTopics = availableTopics.filter(t => t.index !== lastTopicIndex);
      if (otherTopics.length > 0) {
        nextTopicIndex = otherTopics[Math.floor(Math.random() * otherTopics.length)].index;
      } else {
        // No other topics available, continue with same
        nextTopicIndex = availableTopics[0].index;
      }
    } else if (availableTopics.length === 1) {
      // Only one topic left
      nextTopicIndex = availableTopics[0].index;
    } else {
      // Weighted random selection (prefer topics with more questions left)
      const totalRemaining = availableTopics.reduce((sum, t) => sum + t.count, 0);
      const weights = availableTopics.map(t => t.count / totalRemaining);
      nextTopicIndex = weightedRandomSelect(availableTopics, weights).index;
    }
    
    // Take next question from selected topic
    const question = byTopic[nextTopicIndex].shift()!;
    question.orderIndex = mixed.length;
    mixed.push(question);
    
    // Update consecutive tracking
    if (nextTopicIndex === lastTopicIndex) {
      consecutiveCount++;
    } else {
      consecutiveCount = 1;
      lastTopicIndex = nextTopicIndex;
    }
  }
  
  return mixed;
}

function weightedRandomSelect<T>(items: T[], weights: number[]): T {
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return items[i];
    }
  }
  
  return items[items.length - 1];
}
```

**Key Features:**
- ✅ Questions from different topics are interleaved
- ✅ No more than 3 consecutive questions from same topic
- ✅ Weighted random selection (topics with more questions appear more often)
- ✅ Maintains difficulty distribution within each topic
- ✅ Unpredictable pattern (not simple round-robin)

---

### 5. Handle Parent Modifications

```typescript
function adjustDistribution(
  currentDistribution: QuestionDistribution[],
  newTotal: number,
  focusArea: 'strengthen' | 'balanced' | 'improve'
): QuestionDistribution[] {
  // Recalculate with new total, maintaining proportions
  const currentTotal = currentDistribution.reduce((sum, d) => sum + d.allocated, 0);
  
  if (newTotal === currentTotal) {
    return currentDistribution; // No change needed
  }
  
  // Calculate new allocations proportionally
  let newDistribution = currentDistribution.map(d => {
    const proportion = d.allocated / currentTotal;
    const newAllocated = Math.round(newTotal * proportion);
    
    return {
      ...d,
      allocated: newAllocated
    };
  });
  
  // Apply minimum guarantee and adjust for rounding
  newDistribution = newDistribution.map(d => {
    if (d.allocated < MIN_QUESTIONS_PER_TOPIC) {
      return { ...d, allocated: MIN_QUESTIONS_PER_TOPIC };
    }
    return d;
  });
  
  // Adjust for rounding errors (same logic as calculateDistribution)
  let currentSum = newDistribution.reduce((sum, d) => sum + d.allocated, 0);
  let diff = newTotal - currentSum;
  
  while (diff !== 0) {
    if (diff > 0) {
      const largest = newDistribution.reduce((max, d) => 
        d.allocated > max.allocated ? d : max
      );
      largest.allocated++;
      diff--;
    } else {
      const largest = newDistribution
        .filter(d => d.allocated > MIN_QUESTIONS_PER_TOPIC)
        .reduce((max, d) => d.allocated > max.allocated ? d : max, newDistribution[0]);
      
      if (largest.allocated > MIN_QUESTIONS_PER_TOPIC) {
        largest.allocated--;
        diff++;
      } else {
        throw new Error(`Cannot reduce to ${newTotal} questions while maintaining minimum per topic`);
      }
    }
  }
  
  // Recalculate difficulty distribution
  const difficultyWeights = getDifficultyWeights(focusArea);
  
  return newDistribution.map(d => {
    const byDifficulty = calculateDifficultyDistribution(
      d.allocated,
      d.byDifficultyAvailable,
      difficultyWeights
    );
    
    return {
      ...d,
      percentage: (d.allocated / newTotal) * 100,
      byDifficulty
    };
  });
}
```

**Real-time Preview:**
```
Parent changes total from 30 → 50

Distribution updates instantly:
• Integers: 14 → 23 questions (47%)
• Rational Numbers: 14 → 23 questions (47%)
• Metals: 2 → 4 questions (6%)

✅ All topics maintain proportions
✅ Minimums still respected
✅ Sum equals 50
```

---

## Edge Cases & Error Handling

### Edge Case 1: Insufficient Questions
```typescript
// Scenario: Parent wants 100 questions, only 50 available
const available = calculateAvailableQuestions(selections);
const totalAvailable = available.reduce((sum, a) => sum + a.totalAvailable, 0);

if (requestedTotal > totalAvailable) {
  throw new ValidationError(
    `Only ${totalAvailable} questions available. ` +
    `Please reduce total to ${totalAvailable} or fewer.`
  );
}
```

### Edge Case 2: Minimum Not Met
```typescript
// Scenario: 10 topics, 25 questions requested (< 3 per topic)
const minRequired = topicCount * MIN_QUESTIONS_PER_TOPIC;

if (requestedTotal < minRequired) {
  throw new ValidationError(
    `With ${topicCount} topics selected, minimum ${minRequired} questions required ` +
    `(${MIN_QUESTIONS_PER_TOPIC} per topic). Please increase total or reduce topics.`
  );
}
```

### Edge Case 3: Topic with No Questions
```typescript
// Scenario: Parent selects subtopic with 0 questions
const emptyTopics = available.filter(a => a.totalAvailable === 0);

if (emptyTopics.length > 0) {
  throw new ValidationError(
    `The following selections have no questions available: ` +
    emptyTopics.map(t => `${t.selection.topic} (${t.selection.subtopics})`).join(', ')
  );
}
```

### Edge Case 4: Duplicate Questions
```typescript
// Scenario: Same question appears in multiple subtopics
const seenQuestionTexts = new Set<string>();
const duplicates: number[] = [];

allSelected.forEach(q => {
  const questionText = q.questionText.trim().toLowerCase();
  if (seenQuestionTexts.has(questionText)) {
    duplicates.push(q.id);
  } else {
    seenQuestionTexts.add(questionText);
  }
});

// Remove duplicates, replace with other questions
if (duplicates.length > 0) {
  // Log for monitoring
  console.warn(`Removed ${duplicates.length} duplicate questions`);
  
  // Filter out duplicates and select replacements
  // (implementation details...)
}
```

### Edge Case 5: Rounding Errors
```typescript
// Scenario: Distribution doesn't sum to exact total
const sum = distribution.reduce((s, d) => s + d.allocated, 0);

if (sum !== requestedTotal) {
  // This should never happen due to adjustment logic
  // But add safety check
  throw new InternalError(
    `Distribution error: allocated ${sum}, expected ${requestedTotal}`
  );
}
```

---

## Validation Checklist

Before creating challenge, verify:

- [ ] 1 ≤ topic count ≤ 10
- [ ] All topics have questions available
- [ ] Total ≥ (topic count × 3)
- [ ] Total ≤ total available
- [ ] Distribution sums to exact total
- [ ] Each topic allocated ≥ 3 questions
- [ ] No allocation exceeds available
- [ ] Difficulty distribution valid
- [ ] No duplicate questions selected
- [ ] Questions properly mixed (not sequential)

---

## Performance Optimization

### Caching Strategy
```typescript
// Cache available question counts (updated on import)
const questionCountCache = new Map<string, number>();

function getCachedQuestionCount(
  subject: string,
  topic: string,
  subtopic?: string
): number {
  const key = `${subject}:${topic}:${subtopic || 'all'}`;
  
  if (!questionCountCache.has(key)) {
    const count = db.questions.count({
      where: { subject, topic, subTopic: subtopic, status: 'approved', isActive: true }
    });
    questionCountCache.set(key, count);
  }
  
  return questionCountCache.get(key)!;
}

// Invalidate cache on question import
function onQuestionImport() {
  questionCountCache.clear();
}
```

### Batch Queries
```typescript
// Instead of N queries (one per topic), use single query with OR conditions
const allQuestions = await db.questions.findMany({
  where: {
    OR: selections.map(sel => ({
      subject: sel.subject,
      topic: sel.topic,
      subTopic: sel.subtopics === 'all' ? undefined : { in: sel.subtopics }
    })),
    status: 'approved',
    isActive: true
  }
});

// Group in memory
const grouped = groupBy(allQuestions, q => `${q.subject}:${q.topic}`);
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('calculateDistribution', () => {
  it('should allocate exact total', () => {
    const result = calculateDistribution(mockAvailable, 30, 'balanced');
    const sum = result.reduce((s, r) => s + r.allocated, 0);
    expect(sum).toBe(30);
  });
  
  it('should respect minimum per topic', () => {
    const result = calculateDistribution(mockAvailable, 30, 'balanced');
    result.forEach(r => {
      expect(r.allocated).toBeGreaterThanOrEqual(3);
    });
  });
  
  it('should maintain proportions on adjustment', () => {
    const initial = calculateDistribution(mockAvailable, 30, 'balanced');
    const adjusted = adjustDistribution(initial, 60, 'balanced');
    
    // Proportions should roughly double
    initial.forEach((init, i) => {
      const ratio = adjusted[i].allocated / init.allocated;
      expect(ratio).toBeCloseTo(2, 0.2); // Within 20% of 2x
    });
  });
});

describe('adaptiveMixing', () => {
  it('should not have more than 3 consecutive from same topic', () => {
    const mixed = adaptiveMixing(mockQuestions, 3);
    
    let consecutive = 1;
    for (let i = 1; i < mixed.length; i++) {
      if (mixed[i].topicIndex === mixed[i-1].topicIndex) {
        consecutive++;
        expect(consecutive).toBeLessThanOrEqual(3);
      } else {
        consecutive = 1;
      }
    }
  });
  
  it('should include all questions', () => {
    const mixed = adaptiveMixing(mockQuestions, 3);
    expect(mixed.length).toBe(mockQuestions.length);
  });
});
```

### Integration Tests
```typescript
describe('Advanced Challenge Creation', () => {
  it('should create challenge with multiple topics', async () => {
    const challenge = await createAdvancedChallenge({
      childId: 1,
      selections: [
        { subject: 'Mathematics', topic: 'Integers', subtopics: 'all' },
        { subject: 'Mathematics', topic: 'Rational Numbers', subtopics: ['Addition'] }
      ],
      totalQuestions: 30,
      focusArea: 'balanced'
    });
    
    expect(challenge.id).toBeDefined();
    expect(challenge.questionIds.length).toBe(30);
  });
});
```

---

## UI Flow (Detailed)

### Step 1: Choose Challenge Type
```
┌─────────────────────────────────────────┐
│ Create Challenge                        │
├─────────────────────────────────────────┤
│ ○ Simple Challenge                      │
│   Quick setup - select one module       │
│                                         │
│ ● Advanced Challenge ⭐ NEW             │
│   Mix multiple topics for comprehensive │
│   review across subjects                │
│                                         │
│ [Continue]                              │
└─────────────────────────────────────────┘
```

### Step 2: Select Topics (Max 10)
```
┌─────────────────────────────────────────┐
│ Select Topics (3/10 selected)           │
├─────────────────────────────────────────┤
│ ☑ Mathematics                           │
│   ☑ Integers (609 questions)            │
│     ● All subtopics (12)                │
│     ○ Select specific                   │
│   ☑ Rational Numbers (600 questions)    │
│     ○ All subtopics (12)                │
│     ● Select specific (2/12 selected)   │
│       ☑ Addition (50 questions)         │
│       ☑ Division (50 questions)         │
│       ☐ Subtraction (50 questions)      │
│       ... [Show more]                   │
│                                         │
│ ☐ Chemistry                             │
│   ☑ Metals and Non-Metals (62 questions)│
│     ● All subtopics                     │
│                                         │
│ ☐ Physics                               │
│   ☐ Energy (117 questions)              │
│   ☐ Motion (50 questions)               │
│                                         │
│ [+ Add More Topics]                     │
│                                         │
│ Summary:                                │
│ • 3 topics selected                     │
│ • 771 questions available               │
│ • Estimated range: 9-200 questions      │
│                                         │
│ [Back] [Continue]                       │
└─────────────────────────────────────────┘
```

### Step 3: Configure Quiz
```
┌─────────────────────────────────────────┐
│ Configure Quiz                          │
├─────────────────────────────────────────┤
│ 💡 Recommended: 30 questions            │
│                                         │
│ Based on 3 topics selected, we recommend│
│ 30 questions for comprehensive coverage.│
│ This ensures at least 10 questions per  │
│ topic.                                  │
│                                         │
│ Total Questions: [30] ▼                 │
│   • Minimum: 9 (3 per topic)            │
│   • Maximum: 200                        │
│   • Available: 771                      │
│                                         │
│ Estimated Duration: ~30 minutes         │
│                                         │
│ ─────────────────────────────────────   │
│                                         │
│ Distribution Preview:                   │
│ • Integers (all): 19 questions (63%)    │
│ • Rational Numbers (Add): 6 questions   │
│ • Rational Numbers (Div): 6 questions   │
│   Subtotal: 12 questions (37%)          │
│                                         │
│ Questions will be mixed across all      │
│ topics, not presented sequentially.     │
│                                         │
│ ─────────────────────────────────────   │
│                                         │
│ Focus Area: [Balanced] ▼                │
│   • Strengthen (60% easy, 30% med, 10% hard)│
│   • Balanced (33% each)                 │
│   • Improve (10% easy, 30% med, 60% hard)│
│                                         │
│ Challenge Name: [Optional]              │
│ Message to Child: [Optional]            │
│                                         │
│ [Back] [Create Challenge]               │
└─────────────────────────────────────────┘
```

**Real-time Updates:**
When parent changes total from 30 → 50:
```
Distribution Preview:
• Integers (all): 32 questions (64%)
• Rational Numbers (Add): 9 questions
• Rational Numbers (Div): 9 questions
  Subtotal: 18 questions (36%)

✅ Distribution updated
```

---

## Database Schema

```sql
-- Add to challenges table
ALTER TABLE challenges 
ADD COLUMN challenge_type VARCHAR(20) DEFAULT 'simple',
ADD COLUMN challenge_scope JSONB;

-- Example data for advanced challenge
{
  "type": "advanced",
  "selections": [
    {
      "subject": "Mathematics",
      "topic": "Integers",
      "subtopics": "all"
    },
    {
      "subject": "Mathematics",
      "topic": "Rational Numbers",
      "subtopics": ["Addition", "Division"]
    }
  ],
  "distribution": {
    "Mathematics-Integers-all": 19,
    "Mathematics-Rational Numbers-Addition": 6,
    "Mathematics-Rational Numbers-Division": 5
  },
  "totalQuestions": 30,
  "focusArea": "balanced",
  "questionMixing": "adaptive"
}

-- Index for querying
CREATE INDEX idx_challenges_type ON challenges(challenge_type);
```

---

## Success Metrics

### Accuracy Metrics
- ✅ Distribution sum = requested total (100% accuracy)
- ✅ No topic below minimum (100% compliance)
- ✅ No duplicate questions (100% uniqueness)
- ✅ Proper mixing (max 3 consecutive from same topic)

### Performance Metrics
- ⏱️ Topic selection load time < 500ms
- ⏱️ Distribution calculation < 100ms
- ⏱️ Question selection < 2s (for 100 questions)
- ⏱️ Total challenge creation < 3s

### User Experience Metrics
- 📊 % of parents using advanced vs simple
- 📊 Average topics selected per challenge
- 📊 Most common topic combinations
- 📊 Student completion rate
- 📊 Parent satisfaction score

---

## Implementation Checklist

### Backend
- [ ] Add `challenge_type` and `challenge_scope` columns
- [ ] Implement `calculateAvailableQuestions()`
- [ ] Implement `suggestQuestionCount()`
- [ ] Implement `calculateDistribution()`
- [ ] Implement `adjustDistribution()`
- [ ] Implement `selectQuestions()` with adaptive mixing
- [ ] Add validation for all edge cases
- [ ] Add caching for question counts
- [ ] Write unit tests (95%+ coverage)
- [ ] Write integration tests

### Frontend
- [ ] Build challenge type selector
- [ ] Build topic/subtopic tree view
- [ ] Add topic counter (X/10 selected)
- [ ] Build question count configurator
- [ ] Add real-time distribution preview
- [ ] Add validation messages
- [ ] Add loading states
- [ ] Add error handling
- [ ] Write component tests

### Testing
- [ ] Test with 1 topic
- [ ] Test with 10 topics (max)
- [ ] Test with 11 topics (should error)
- [ ] Test minimum questions (3 per topic)
- [ ] Test maximum questions (200)
- [ ] Test adjustment (30 → 50 → 30)
- [ ] Test edge cases (0 questions, duplicates)
- [ ] Performance test (100 questions, 10 topics)
- [ ] User acceptance testing

---

**Status:** Ready for Implementation  
**Priority:** High (USP Feature)  
**Estimated Effort:** 2-3 weeks  
**Risk Level:** Medium (complex algorithm, needs thorough testing)

---

**Next Step:** Approve design and begin backend implementation
