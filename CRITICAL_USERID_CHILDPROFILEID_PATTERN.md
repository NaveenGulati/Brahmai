# 🔴 CRITICAL PATTERN: userId vs childProfileId

## ⚠️ MUST MEMORIZE - READ BEFORE ANY CHALLENGE-RELATED CODE CHANGES

---

## The Problem

In Brahmai Quiz App, there are TWO different IDs for a child user:

1. **userId** (from `users` table) - Example: 45
2. **childProfileId** (from `childProfiles` table) - Example: 1

**They are NOT the same!** Mixing them up causes challenges to be invisible in dashboards.

---

## The Relationship

```
users table                childProfiles table
┌─────────────┐           ┌──────────────────┐
│ id: 45      │◄──────────│ userId: 45       │
│ username    │           │ id: 1            │
│ role: child │           │ parentId: 9      │
└─────────────┘           │ totalPoints: 100 │
                          └──────────────────┘
     userId                   childProfileId
```

**Key Facts:**
- One user → One childProfile
- `childProfiles.userId` is a foreign key to `users.id`
- Example: userId 45 has childProfileId 1

---

## The Rule

### challenges table
```typescript
{
  assignedBy: number,    // ← ALWAYS userId (who created it)
  assignedTo: number,    // ← ALWAYS childProfileId (who should see it)
}
```

### Why This Matters

**Dashboard filtering:**
```typescript
// Child dashboard queries:
WHERE challenges.assignedTo = childProfileId  // NOT userId!
```

**If you use userId for assignedTo:**
- Challenge is created ✅
- Challenge is in database ✅
- Dashboard can't find it ❌ (filtering by different ID)
- User sees nothing ❌

---

## When to Use What

| Scenario | assignedBy | assignedTo |
|----------|-----------|-----------|
| Child creates self-practice | userId (45) | childProfileId (1) |
| Parent creates for child | parent's userId (9) | child's childProfileId (1) |
| Teacher creates for child | teacher's userId (X) | child's childProfileId (1) |

---

## The Code Pattern

### ❌ WRONG (What We Did Before)
```typescript
// Child creates self-practice challenge
createChallenge({
  assignedBy: ctx.user.id,    // 45 (userId) ✅
  assignedTo: ctx.user.id,    // 45 (userId) ❌ WRONG!
});
// Result: Challenge invisible in dashboard
```

### ✅ CORRECT (What We Do Now)
```typescript
// Child creates self-practice challenge
if (input.childId === ctx.user.id && ctx.user.role === 'child') {
  // Step 1: Get database instance
  const database = await getDb();
  if (!database) {
    throw new TRPCError({ 
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Database not available'
    });
  }
  
  // Step 2: Query childProfileId from userId
  const childProfileResult = await database
    .select({ id: childProfiles.id })
    .from(childProfiles)
    .where(eq(childProfiles.userId, ctx.user.id))
    .limit(1);
  
  // Step 3: Validate result
  if (childProfileResult.length === 0) {
    throw new TRPCError({ 
      code: 'NOT_FOUND',
      message: 'Child profile not found'
    });
  }
  
  // Step 4: Use childProfileId for assignedTo
  assignedToId = childProfileResult[0].id;
}

// Step 5: Create challenge with correct IDs
createChallenge({
  assignedBy: ctx.user.id,        // 45 (userId) ✅
  assignedTo: assignedToId,       // 1 (childProfileId) ✅
});
// Result: Challenge visible in dashboard ✅
```

---

## Detection Logic

### How to Detect Self-Practice
```typescript
// When a child creates a challenge for themselves:
if (input.childId === ctx.user.id && ctx.user.role === 'child') {
  // This is self-practice, need to convert userId to childProfileId
}
```

### When Parent/Teacher Creates for Child
```typescript
// input.childId is already childProfileId (not userId)
// No conversion needed
assignedTo: input.childId  // Already childProfileId ✅
```

---

## Database Query Pattern

### ✅ CORRECT (This Codebase Uses)
```typescript
const database = await getDb();
if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

const result = await database
  .select({ id: childProfiles.id })
  .from(childProfiles)
  .where(eq(childProfiles.userId, userId))
  .limit(1);
```

### ❌ WRONG (Don't Use)
```typescript
// API not available in this project
const result = await db.query.childProfiles.findFirst({
  where: (childProfiles, { eq }) => eq(childProfiles.userId, userId)
});
```

### ❌ WRONG (Don't Use)
```typescript
// db is namespace, not instance
const result = await db
  .select()
  .from(childProfiles);
```

---

## Affected Endpoints

### 1. challenge.createAdaptiveChallenge
**File:** `server/routers.ts` (lines 87-131)  
**Used by:** Simple challenge creation from ChildDashboard  
**Status:** ✅ Fixed

### 2. child.createSelfChallenge
**File:** `server/routers.ts` (lines 1378-1424)  
**Used by:** Reattempt from QuizPlay/QuizReview  
**Status:** ✅ Fixed

### 3. Advanced Challenge API
**File:** `server/advanced-challenge/api.ts`  
**Used by:** Advanced challenge creation  
**Status:** ✅ Already correct (was fixed earlier)

---

## Checklist Before Modifying Challenge Code

- [ ] Am I dealing with `assignedBy` or `assignedTo`?
- [ ] If `assignedTo`, is this a childProfileId or userId?
- [ ] If child self-practice, did I query childProfileId from userId?
- [ ] Did I use `await getDb()` to get database instance?
- [ ] Did I use `database.select()` not `db.select()`?
- [ ] Did I validate the query result before using it?
- [ ] Did I test that challenges appear in the dashboard?

---

## Test Account Reference

```
Username: riddhu1
Password: riddhu
userId: 45
childProfileId: 1
Role: child
```

### Test Query
```sql
-- Check if challenge is visible
SELECT * FROM challenges 
WHERE "assignedTo" = 1  -- childProfileId (correct)
-- NOT WHERE "assignedTo" = 45  -- userId (wrong)
```

---

## Common Mistakes

### Mistake 1: Using userId for assignedTo
```typescript
assignedTo: ctx.user.id  // ❌ This is userId!
```

### Mistake 2: Assuming input.childId is always childProfileId
```typescript
// When child creates self-practice, input.childId might be userId!
assignedTo: input.childId  // ❌ Could be wrong
```

### Mistake 3: Not querying childProfileId
```typescript
// Forgot to query childProfiles table
assignedTo: someId  // ❌ Is this userId or childProfileId?
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────┐
│  CHILD USER HAS TWO IDs                     │
├─────────────────────────────────────────────┤
│  userId (users.id)          Example: 45     │
│  childProfileId (childProfiles.id)  Ex: 1   │
├─────────────────────────────────────────────┤
│  CHALLENGE FIELDS                           │
├─────────────────────────────────────────────┤
│  assignedBy  → ALWAYS userId                │
│  assignedTo  → ALWAYS childProfileId        │
├─────────────────────────────────────────────┤
│  SELF-PRACTICE PATTERN                      │
├─────────────────────────────────────────────┤
│  1. Detect: childId === ctx.user.id         │
│  2. Query: childProfiles WHERE userId       │
│  3. Use: childProfileId for assignedTo      │
└─────────────────────────────────────────────┘
```

---

**🔴 REMEMBER: When in doubt, query the childProfiles table!**

**End of Critical Pattern Documentation**
