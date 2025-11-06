# Adaptive Quiz Algorithm Fix

## Problems Identified

1. **Level 6 (30% easy, 70% medium)** → Getting hard questions (shouldn't exist)
2. **Level 9 (15% medium, 85% hard)** → Getting mostly medium questions
3. **Question mix doesn't match complexity boundaries**
4. **Adaptive logic not working within guardrails**

## Root Causes

### 1. Missing Complexity Tracking in Quiz Sessions
- `quizSessions` table had no fields for complexity, challengeId, or useComplexityBoundaries
- Quiz sessions couldn't remember what boundaries to enforce
- Adaptive algorithm had no context about restrictions

### 2. getNextQuestion Ignoring Pre-Selected Questions
- Challenges pre-select questions with correct distribution
- But `getNextQuestion` was fetching ALL module questions
- Pre-selected questions were completely ignored
- Result: Wrong distribution every time

### 3. Adaptive Algorithm Ignoring Boundaries
- Algorithm only looked at performance (accuracy)
- No check for allowed difficulties
- Could pick any difficulty regardless of complexity level

## Solutions Implemented

### 1. Database Schema Update
**File**: `drizzle/schema.ts`

Added to `quizSessions` table:
```typescript
challengeId: integer("challengeId"), // FK to challenges
complexity: integer("complexity"), // 1-10 complexity level
useComplexityBoundaries: boolean("useComplexityBoundaries").default(false),
```

**Migration**: `add-complexity-to-sessions.sql`

### 2. Store Complexity in Quiz Session
**File**: `server/routers.ts` - `startQuiz` mutation

Changes:
- Extract complexity settings from challenge
- Store in quiz session on creation
- Enables getNextQuestion to access boundaries

### 3. Use Pre-Selected Challenge Questions
**File**: `server/routers.ts` - `getNextQuestion` mutation

Changes:
- Check if session has challengeId and useComplexityBoundaries
- Fetch pre-selected questions from challenge
- Use those questions instead of entire module pool
- **Preserves correct distribution!**

### 4. Enforce Complexity Boundaries
**File**: `server/routers.ts` - `getNextQuestion` mutation

Added:
```typescript
const COMPLEXITY_BOUNDARIES: Record<number, string[]> = {
  1: ['easy'],
  2: ['easy'],
  3: ['easy'],
  4: ['easy'],
  5: ['easy', 'medium'],
  6: ['easy', 'medium'],
  7: ['easy', 'medium'],
  8: ['medium', 'hard'],
  9: ['medium', 'hard'],
  10: ['hard'],
};
```

Algorithm now:
1. Determines ideal difficulty based on performance
2. **Constrains to allowed difficulties** (enforces boundaries)
3. Picks closest allowed difficulty if target not allowed
4. Filters questions by allowed difficulties
5. Selects from filtered pool

## How It Works Now

### Level 6 Example (30% easy, 70% medium)

**Challenge Creation:**
- Pre-selects 6 easy + 14 medium questions (for 20 question quiz)
- Stores question IDs in challenge.selectedQuestionIds
- Sets complexity=6, useComplexityBoundaries=true

**Quiz Start:**
- Creates session with challengeId=X, complexity=6, useComplexityBoundaries=true
- Starts with first question from pre-selected pool

**Adaptive Selection:**
- getNextQuestion fetches pre-selected questions (6 easy + 14 medium)
- Allowed difficulties: ['easy', 'medium'] (from COMPLEXITY_BOUNDARIES[6])
- If performance is high → tries 'hard' → constrained to 'medium' (closest allowed)
- If performance is low → picks 'easy'
- **Never picks 'hard' because it's not in the pre-selected pool!**

### Level 9 Example (15% medium, 85% hard)

**Challenge Creation:**
- Pre-selects 3 medium + 17 hard questions (for 20 question quiz)
- Stores in challenge.selectedQuestionIds

**Adaptive Selection:**
- Fetches pre-selected questions (3 medium + 17 hard)
- Allowed difficulties: ['medium', 'hard']
- If performance is low → tries 'easy' → constrained to 'medium' (closest allowed)
- If performance is high → picks 'hard'
- **Distribution is 15% medium, 85% hard because that's what was pre-selected!**

## Benefits

✅ **Exact distribution match** - Uses pre-selected questions with correct percentages
✅ **Boundary enforcement** - Adaptive logic constrained to allowed difficulties
✅ **Performance-based adaptation** - Still adapts within guardrails
✅ **No boundary violations** - Can't pick difficulties outside complexity level
✅ **Predictable behavior** - Distribution set at challenge creation, maintained throughout

## Testing Checklist

- [ ] Level 1-4: Only easy questions
- [ ] Level 5-7: Mix of easy and medium (no hard)
- [ ] Level 8-9: Mix of medium and hard (no easy)
- [ ] Level 10: Only hard questions
- [ ] Adaptive logic works within boundaries
- [ ] High performance → harder questions (within allowed)
- [ ] Low performance → easier questions (within allowed)
- [ ] Distribution matches pre-selected percentages

## Migration Required

**IMPORTANT**: Run this SQL before deploying code changes:

```sql
ALTER TABLE "quizSessions" 
ADD COLUMN IF NOT EXISTS "challengeId" INTEGER,
ADD COLUMN IF NOT EXISTS "complexity" INTEGER,
ADD COLUMN IF NOT EXISTS "useComplexityBoundaries" BOOLEAN DEFAULT false;
```

Or use the provided migration file: `add-complexity-to-sessions.sql`
