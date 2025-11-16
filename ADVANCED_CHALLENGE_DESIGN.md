# Advanced Challenge Feature - Design Document

**Date:** November 16, 2025  
**Feature:** Multi-Topic Challenge Creation  
**Status:** Design Phase

---

## Overview

Allow parents to create advanced challenges by selecting multiple topics and subtopics across different subjects, with intelligent question count determination.

---

## User Stories

### Current (Simple Challenge)
> As a parent, I can create a challenge on **one module** (e.g., Integers) with a fixed question count.

### New (Advanced Challenge)
> As a parent, I can create a challenge spanning **multiple topics and subtopics** across **multiple subjects**, and the system intelligently determines the optimal question count.

---

## Use Cases

### 1. Single Topic, All Subtopics
**Selection:**
- Mathematics → Integers → All subtopics

**Result:**
- Draws questions from all 12 Integers subtopics
- Question count: Based on algorithm (see below)

### 2. Single Topic, Specific Subtopics
**Selection:**
- Mathematics → Integers → [Addition, Subtraction, Multiplication]

**Result:**
- Draws questions only from selected 3 subtopics
- Question count: Proportional to selection

### 3. Multiple Topics, Same Subject
**Selection:**
- Mathematics → Integers → All subtopics
- Mathematics → Rational Numbers → All subtopics

**Result:**
- Draws questions from both topics
- Question count: Distributed across both topics

### 4. Multiple Topics, Different Subjects
**Selection:**
- Mathematics → Integers → [Addition, Subtraction]
- Mathematics → Rational Numbers → All subtopics
- Chemistry → Metals and Non-Metals → All subtopics

**Result:**
- Cross-subject challenge
- Question count: Distributed across all selections

### 5. Complex Mixed Selection
**Selection:**
- Mathematics → Integers → All subtopics
- Mathematics → Rational Numbers → [Addition, Division]
- Physics → Energy → All subtopics
- Chemistry → Metals and Non-Metals → All subtopics

**Result:**
- Comprehensive multi-subject challenge
- Question count: Intelligently distributed

---

## Question Count Algorithm - Recommendations

### Option 1: **Fixed Total with Proportional Distribution** ⭐ RECOMMENDED

**Logic:**
1. Parent sets **total question count** (e.g., 20, 50, 100)
2. System distributes questions **proportionally** across selected topics/subtopics
3. Ensures minimum representation for each selection

**Example:**
```
Total: 30 questions
Selections:
- Integers (all subtopics): 609 available questions
- Rational Numbers (all subtopics): 600 available questions
- Metals and Non-Metals (all subtopics): 62 available questions

Distribution:
- Integers: 30 × (609/1271) = 14 questions
- Rational Numbers: 30 × (600/1271) = 14 questions
- Metals: 30 × (62/1271) = 2 questions
Total: 30 questions
```

**Pros:**
- ✅ Predictable total time
- ✅ Fair representation based on available content
- ✅ Parent controls quiz length
- ✅ Simple to understand

**Cons:**
- ⚠️ Small topics might get very few questions (1-2)

**Mitigation:**
- Set minimum per topic (e.g., 3 questions)
- If minimum can't be met, warn parent or adjust total

---

### Option 2: **Fixed Per-Topic Count**

**Logic:**
1. Parent sets **questions per topic** (e.g., 10 per topic)
2. Total = selections × questions per topic
3. Equal representation for all topics

**Example:**
```
Questions per topic: 10
Selections: 3 topics

Distribution:
- Integers: 10 questions
- Rational Numbers: 10 questions
- Metals: 10 questions
Total: 30 questions
```

**Pros:**
- ✅ Equal weight for all topics
- ✅ Simple calculation
- ✅ Good for comprehensive review

**Cons:**
- ❌ Total becomes unpredictable (depends on selections)
- ❌ May create very long quizzes
- ❌ Doesn't account for topic importance

---

### Option 3: **Adaptive Based on Difficulty and Performance**

**Logic:**
1. System analyzes child's performance history
2. Allocates more questions to weak areas
3. Fewer questions to strong areas
4. Total determined by complexity

**Example:**
```
Child's performance:
- Integers: 85% accuracy (strong)
- Rational Numbers: 60% accuracy (weak)
- Metals: 70% accuracy (medium)

Distribution (Total: 30):
- Integers: 8 questions (26%)
- Rational Numbers: 15 questions (50%)
- Metals: 7 questions (24%)
```

**Pros:**
- ✅ Personalized learning
- ✅ Focuses on improvement areas
- ✅ Efficient use of time

**Cons:**
- ❌ Complex to explain to parents
- ❌ Requires performance history
- ❌ May frustrate students (too many hard topics)

---

### Option 4: **Time-Based Allocation**

**Logic:**
1. Parent sets **total time** (e.g., 30 minutes)
2. System calculates questions based on average time per question
3. Distributes across topics

**Example:**
```
Total time: 30 minutes
Average time per question: 60 seconds

Total questions: 30 minutes × 60 = 30 questions

Distribution (proportional to available questions):
- Integers: 14 questions
- Rational Numbers: 14 questions
- Metals: 2 questions
```

**Pros:**
- ✅ Predictable time commitment
- ✅ Good for scheduling
- ✅ Aligns with real-world constraints

**Cons:**
- ⚠️ Time per question varies by difficulty
- ⚠️ Students work at different speeds

---

## Recommended Approach: **Hybrid Model**

Combine **Option 1** (proportional) with **Option 4** (time-based) and add **minimum guarantees**.

### Algorithm

```typescript
function calculateQuestionDistribution(
  selections: TopicSelection[],
  totalQuestions: number,
  minQuestionsPerTopic: number = 3
) {
  // 1. Get available question counts
  const availability = selections.map(sel => ({
    ...sel,
    available: getAvailableQuestionCount(sel)
  }));
  
  // 2. Calculate total available
  const totalAvailable = availability.reduce((sum, a) => sum + a.available, 0);
  
  // 3. Calculate proportional distribution
  const distribution = availability.map(a => ({
    ...a,
    allocated: Math.round(totalQuestions * (a.available / totalAvailable))
  }));
  
  // 4. Apply minimum guarantee
  distribution.forEach(d => {
    if (d.allocated < minQuestionsPerTopic && d.available >= minQuestionsPerTopic) {
      d.allocated = minQuestionsPerTopic;
    }
  });
  
  // 5. Adjust for rounding errors
  const currentTotal = distribution.reduce((sum, d) => sum + d.allocated, 0);
  if (currentTotal !== totalQuestions) {
    // Adjust the largest allocation
    const largest = distribution.reduce((max, d) => 
      d.allocated > max.allocated ? d : max
    );
    largest.allocated += (totalQuestions - currentTotal);
  }
  
  return distribution;
}
```

### UI Flow

**Step 1: Choose Challenge Type**
```
○ Simple Challenge (Single module)
○ Advanced Challenge (Multiple topics) ← NEW
```

**Step 2: Select Topics (Advanced Only)**
```
┌─────────────────────────────────────────┐
│ Select Topics & Subtopics               │
├─────────────────────────────────────────┤
│ ☑ Mathematics                           │
│   ☑ Integers (609 questions)            │
│     ☑ All subtopics                     │
│     ☐ Select specific:                  │
│       ☐ Addition of Integers            │
│       ☐ Subtraction of Integers         │
│       ...                               │
│   ☑ Rational Numbers (600 questions)    │
│     ☐ All subtopics                     │
│     ☑ Select specific:                  │
│       ☑ Addition (50 questions)         │
│       ☑ Division (50 questions)         │
│                                         │
│ ☐ Chemistry                             │
│   ☐ Metals and Non-Metals               │
│                                         │
│ ☐ Physics                               │
│   ☐ Energy                              │
│                                         │
│ [+ Add More Topics]                     │
└─────────────────────────────────────────┘

Selected: 3 topics, 1,309 questions available
```

**Step 3: Configure Quiz**
```
┌─────────────────────────────────────────┐
│ Quiz Configuration                      │
├─────────────────────────────────────────┤
│ Total Questions: [30] ▼                 │
│   Options: 10, 20, 30, 50, 100, Custom  │
│                                         │
│ OR                                      │
│                                         │
│ Total Time: [30 minutes] ▼              │
│   Options: 15m, 30m, 45m, 60m, Custom   │
│                                         │
│ ─────────────────────────────────────   │
│                                         │
│ Distribution Preview:                   │
│ • Integers: 14 questions (47%)          │
│ • Rational Numbers: 14 questions (47%)  │
│ • Metals: 2 questions (6%)              │
│                                         │
│ ⚠️ Note: Metals has limited questions   │
│    Consider adding more topics          │
│                                         │
│ Focus Area: [Balanced] ▼                │
│   • Strengthen (easier)                 │
│   • Balanced (mixed)                    │
│   • Improve (harder)                    │
└─────────────────────────────────────────┘

[Cancel] [Create Challenge]
```

---

## Question Count Recommendations

### By Quiz Purpose

| Purpose | Recommended Count | Duration | Use Case |
|---------|------------------|----------|----------|
| Quick Check | 10-15 questions | 10-15 min | Daily practice |
| Standard Practice | 20-30 questions | 20-30 min | Regular homework |
| Comprehensive Review | 40-60 questions | 40-60 min | Weekly review |
| Exam Preparation | 80-100 questions | 80-100 min | Before tests |
| Full Assessment | 100+ questions | 2+ hours | Comprehensive evaluation |

### By Number of Topics

| Topics Selected | Recommended Total | Min per Topic | Rationale |
|----------------|------------------|---------------|-----------|
| 1 topic | 20-30 | 20-30 | Deep focus |
| 2-3 topics | 30-45 | 10-15 | Balanced coverage |
| 4-5 topics | 50-75 | 10-15 | Broad review |
| 6+ topics | 60-100 | 8-12 | Comprehensive |

### Smart Defaults

```typescript
function getRecommendedQuestionCount(topicCount: number): number {
  if (topicCount === 1) return 25;
  if (topicCount <= 3) return 30;
  if (topicCount <= 5) return 50;
  if (topicCount <= 8) return 75;
  return 100;
}
```

---

## Database Schema Changes

### Option A: Store as JSON (Flexible)

```typescript
// challenges table - add new column
challengeScope: jsonb // Stores multi-topic selection

// Example data:
{
  "type": "advanced",
  "selections": [
    {
      "subject": "Mathematics",
      "topic": "Integers",
      "subtopics": "all" // or ["Addition", "Subtraction"]
    },
    {
      "subject": "Mathematics",
      "topic": "Rational Numbers",
      "subtopics": ["Addition", "Division"]
    }
  ],
  "distribution": {
    "Integers": 14,
    "Rational Numbers": 14,
    "Metals and Non-Metals": 2
  }
}
```

**Pros:**
- ✅ Flexible schema
- ✅ Easy to extend
- ✅ No migration needed for existing challenges

**Cons:**
- ⚠️ Harder to query
- ⚠️ No referential integrity

---

### Option B: Relational (Normalized)

```sql
-- New table: challenge_topics
CREATE TABLE challenge_topics (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
  subject VARCHAR(100),
  topic VARCHAR(200),
  subtopics JSONB, -- null = all, or ["subtopic1", "subtopic2"]
  question_count INTEGER, -- allocated count
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for queries
CREATE INDEX idx_challenge_topics_challenge_id ON challenge_topics(challenge_id);
```

**Pros:**
- ✅ Proper normalization
- ✅ Easy to query
- ✅ Referential integrity

**Cons:**
- ⚠️ More complex queries
- ⚠️ Requires migration

---

## Recommended: **Hybrid Approach**

Use **Option A** (JSON) for storage, but add a helper table for querying:

```sql
-- Main storage (in challenges table)
ALTER TABLE challenges ADD COLUMN challenge_scope JSONB;

-- Helper table for quick lookups (optional)
CREATE TABLE challenge_topic_index (
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
  subject VARCHAR(100),
  topic VARCHAR(200),
  PRIMARY KEY (challenge_id, subject, topic)
);
```

---

## Implementation Phases

### Phase 1: Backend (Week 1)
- [ ] Update database schema
- [ ] Create API endpoint: `getAvailableTopicsAndSubtopics()`
- [ ] Create API endpoint: `createAdvancedChallenge()`
- [ ] Implement question distribution algorithm
- [ ] Add validation logic

### Phase 2: Frontend (Week 2)
- [ ] Design UI mockups
- [ ] Build topic/subtopic selection component
- [ ] Add question count calculator
- [ ] Show distribution preview
- [ ] Add validation and warnings

### Phase 3: Testing (Week 3)
- [ ] Unit tests for distribution algorithm
- [ ] Integration tests for challenge creation
- [ ] User acceptance testing with parents
- [ ] Performance testing with large selections

### Phase 4: Deployment (Week 4)
- [ ] Deploy to staging
- [ ] Beta test with select parents
- [ ] Collect feedback
- [ ] Deploy to production
- [ ] Monitor usage and performance

---

## Edge Cases to Handle

### 1. Insufficient Questions
**Scenario:** Parent selects 100 questions but only 50 available

**Solution:**
- Show warning: "Only 50 questions available. Adjusted total to 50."
- Auto-adjust to maximum available

### 2. Minimum Not Met
**Scenario:** Distribution gives 1 question to a topic (below minimum of 3)

**Solution:**
- Option A: Increase to minimum, reduce from largest allocation
- Option B: Warn parent and suggest removing small topics

### 3. No Questions Available
**Scenario:** Parent selects a subtopic with 0 questions

**Solution:**
- Disable selection in UI (show "0 questions")
- If already selected, show error on submit

### 4. Duplicate Questions
**Scenario:** Same question appears in multiple subtopics

**Solution:**
- Track used question IDs across all topics
- Ensure no duplicates in final question set

### 5. Performance Issues
**Scenario:** Selecting 10+ topics with 1000+ questions each

**Solution:**
- Lazy load subtopics
- Cache available question counts
- Show loading indicators

---

## Success Metrics

### Adoption
- % of parents using advanced challenges vs simple
- Average number of topics selected per challenge
- Most common topic combinations

### Effectiveness
- Student completion rate (advanced vs simple)
- Average score comparison
- Time to complete

### Usability
- Time to create advanced challenge
- Error rate during creation
- Parent satisfaction survey

---

## Future Enhancements

### Phase 2 Features
1. **Save Templates** - Save common topic combinations
2. **Smart Suggestions** - Recommend topics based on child's weak areas
3. **Difficulty Balancing** - Ensure mix of easy/medium/hard across topics
4. **Progress Tracking** - Show coverage of curriculum
5. **Collaborative Challenges** - Multiple children, same challenge

### Phase 3 Features
1. **AI-Powered Selection** - "Create a challenge to prepare for Chapter 3 exam"
2. **Adaptive Challenges** - Adjust topics mid-quiz based on performance
3. **Gamification** - Unlock new topics as child progresses
4. **Analytics Dashboard** - Visualize topic mastery over time

---

## Open Questions

1. **Should we limit the number of topics?**
   - Recommendation: Max 10 topics to keep quiz manageable

2. **How to handle subtopic selection UI?**
   - Recommendation: Collapsible tree with checkboxes

3. **Should we show estimated time?**
   - Recommendation: Yes, based on average time per question

4. **Allow editing after creation?**
   - Recommendation: No, create new challenge instead (simpler)

5. **What if child runs out of time?**
   - Recommendation: Same as current - auto-submit

---

## Recommendation Summary

### Question Count Algorithm
**Use: Fixed Total with Proportional Distribution + Minimum Guarantee**

- Parent sets total (default: smart based on topic count)
- System distributes proportionally
- Minimum 3 questions per topic (or warn)
- Show preview before creation

### Database Schema
**Use: JSON storage in challenges table**

```sql
ALTER TABLE challenges ADD COLUMN challenge_scope JSONB;
```

### UI Flow
**Three-step process:**
1. Choose challenge type (Simple vs Advanced)
2. Select topics/subtopics (tree view with checkboxes)
3. Configure (total questions, focus area, preview)

### Default Question Counts
| Topics | Default |
|--------|---------|
| 1 | 25 |
| 2-3 | 30 |
| 4-5 | 50 |
| 6-8 | 75 |
| 9+ | 100 |

---

**Next Steps:**
1. Review and approve design
2. Create detailed UI mockups
3. Begin backend implementation
4. Parallel frontend development
5. Beta testing with parents

---

**Prepared by:** Manus AI  
**Date:** November 16, 2025  
**Status:** Awaiting Approval
