# Child Dashboard - Baseline Documentation
**Date:** November 18, 2025  
**Status:** ✅ STABLE - All critical bugs fixed  
**Last Commit:** f407751

---

## ✅ FIXED ISSUES

### 1. Advanced Challenge Display Crash
**Issue:** Dashboard crashed when displaying advanced challenges with "all" subtopics selected  
**Error:** `g.subtopics.map is not a function`

**Root Cause:**
- `challengeScope` stored in TWO different formats in database:
  - Old format: `[{subject, topic, subtopics}]` (direct array)
  - New format: `{topics: [{subject, topic, subtopics}]}` (wrapped in object)
- `subtopics` field can be string `"all"` OR array of strings
- Component only handled array format

**Fix:** (Commit f02f5a6)
- Added backward compatibility in `ChallengeNotification.tsx`
- Handle both challengeScope formats (array and object with topics key)
- Handle subtopics as both string "all" and array of strings

**File:** `/home/ubuntu/Brahmai/client/src/components/ChallengeNotification.tsx`

---

### 2. Child Self-Practice Challenges Not Showing in Dashboard
**Issue:** Simple challenges created by child appeared to succeed but were invisible in dashboard

**Root Cause:**
- Challenges created with `assignedTo: 45` (userId)
- Dashboard filters by `assignedTo: 1` (childProfileId)
- userId ≠ childProfileId, so challenges were invisible

**Affected Endpoints:**
1. `challenge.createAdaptiveChallenge` - Simple challenge from ChildDashboard
2. `child.createSelfChallenge` - Reattempt from QuizPlay/QuizReview

**Fix:** (Commits a18eb3e, b1ec589, f407751)
- Detect self-practice: `childId === ctx.user.id && role === 'child'`
- Query childProfiles table to get childProfileId
- Use childProfileId for `assignedTo` field
- Use userId for `assignedBy` field

**Files:**
- `/home/ubuntu/Brahmai/server/routers.ts` (lines 87-131, 1378-1424)

---

## 🔑 CRITICAL PATTERN: userId vs childProfileId

### Database Schema
```typescript
users {
  id: number              // userId (e.g., 45)
  role: 'child' | 'parent' | 'teacher'
  username: string
}

childProfiles {
  id: number              // childProfileId (e.g., 1)
  userId: number          // FK to users.id (e.g., 45)
  parentId: number
  totalPoints: number
}

challenges {
  id: number
  assignedBy: number      // userId who created it
  assignedTo: number      // childProfileId who should see it
  status: 'pending' | 'completed'
}
```

### The Relationship
- **One user can have one childProfile**
- `childProfiles.userId` → `users.id`
- Example: userId 45 → childProfileId 1

### When to Use What

| Context | Use userId | Use childProfileId |
|---------|-----------|-------------------|
| `assignedBy` field | ✅ YES | ❌ NO |
| `assignedTo` field | ❌ NO | ✅ YES |
| Authentication (ctx.user.id) | ✅ YES | N/A |
| Dashboard filtering | ❌ NO | ✅ YES |
| Creating challenges for child | ❌ NO | ✅ YES |
| Tracking who created | ✅ YES | ❌ NO |

### Query Pattern
```typescript
// When child creates self-practice challenge:
if (input.childId === ctx.user.id && ctx.user.role === 'child') {
  // Get database instance
  const database = await getDb();
  if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
  
  // Query childProfileId from userId
  const childProfileResult = await database
    .select({ id: childProfiles.id })
    .from(childProfiles)
    .where(eq(childProfiles.userId, ctx.user.id))
    .limit(1);
  
  if (childProfileResult.length === 0) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Child profile not found' });
  }
  
  assignedToId = childProfileResult[0].id; // Use childProfileId
}

// Create challenge
await db.createChallenge({
  assignedBy: ctx.user.id,        // userId
  assignedTo: assignedToId,       // childProfileId
  assignedToType: 'individual',
  moduleId: input.moduleId,
  title,
  focusArea: input.focusArea,
});
```

### Database Query Patterns in This Codebase

**✅ CORRECT:**
```typescript
const database = await getDb();
const result = await database
  .select()
  .from(childProfiles)
  .where(eq(childProfiles.userId, userId));
```

**❌ WRONG (API not available):**
```typescript
const result = await db.query.childProfiles.findFirst({
  where: (childProfiles, { eq }) => eq(childProfiles.userId, userId)
});
```

**❌ WRONG (db is namespace, not instance):**
```typescript
const result = await db
  .select()
  .from(childProfiles);
```

---

## 📊 TEST DATA

### Test Account
- **Username:** riddhu1
- **Password:** riddhu
- **userId:** 45
- **childProfileId:** 1
- **Role:** child

### Database State
```sql
-- User
users.id = 45
users.username = 'riddhu1'
users.role = 'child'

-- Child Profile
childProfiles.id = 1
childProfiles.userId = 45

-- Old broken challenges (invisible)
challenges.id IN (43, 44, 46)
challenges.assignedBy = 45
challenges.assignedTo = 45  -- ❌ WRONG (should be 1)

-- New working challenges (visible)
challenges.assignedBy = 45
challenges.assignedTo = 1   -- ✅ CORRECT
```

---

## 🧪 VERIFIED WORKING FEATURES

### Child Dashboard
- ✅ Login with riddhu1/riddhu
- ✅ Dashboard loads without crash
- ✅ Pending challenges display correctly
- ✅ Advanced challenges with "all" subtopics show badge
- ✅ Advanced challenges with specific subtopics show list

### Simple Challenge Creation
- ✅ Click "Create Challenge" button
- ✅ Select "Simple Challenge"
- ✅ Choose subject, module, question count, focus area
- ✅ Challenge created successfully
- ✅ Challenge appears immediately in "Pending Challenges"
- ✅ Can click "Start Challenge" to attempt

### Advanced Challenge Creation
- ✅ Click "Create Challenge" button
- ✅ Select "Advanced Challenge"
- ✅ Choose topics and subtopics
- ✅ Select "all" subtopics option works
- ✅ Challenge created successfully
- ✅ Challenge appears in dashboard

### Quiz Reattempt
- ✅ Complete a quiz
- ✅ Click "Reattempt" from QuizPlay or QuizReview
- ✅ Select question count and focus area
- ✅ Challenge created successfully
- ✅ Challenge appears in dashboard

---

## 🔧 FILES MODIFIED

### Frontend
- `client/src/components/ChallengeNotification.tsx` - Fixed challengeScope parsing

### Backend
- `server/routers.ts` - Fixed userId vs childProfileId in challenge creation
  - Lines 87-131: `challenge.createAdaptiveChallenge`
  - Lines 1378-1424: `child.createSelfChallenge`

---

## 📝 LESSONS LEARNED

### 1. Understand Before Changing
- Original code was working, just had wrong value
- Should have only changed the value, not the entire approach
- Introduced 3 bugs while fixing 1 bug

### 2. Follow Existing Patterns
- Codebase uses `getDb()` then `database.select()`
- Don't introduce new patterns without understanding why

### 3. Test Incrementally
- Each change should be tested before adding more changes
- Don't stack multiple untested changes

### 4. Database Schema is Critical
- userId vs childProfileId distinction is fundamental
- Must be consistent across all endpoints
- Document the pattern once discovered

---

## 🚀 NEXT STEPS

### Ready for Parent Dashboard Testing
- Child dashboard is stable
- All self-practice flows working
- Ready to test parent creating challenges for child
- Ready to test parent viewing child's progress

### Known Issues (Not Critical)
- Old challenges (43, 44, 46) still have wrong assignedTo value
- These are invisible but harmless
- Could be fixed with database migration if needed

---

## 📚 REFERENCE

### Related Files
- `server/advanced-challenge/api.ts` - Advanced challenge creation (REST API)
- `server/db.ts` - Database helper functions
- `drizzle/schema.ts` - Database schema definitions
- `client/src/pages/ChildDashboard.tsx` - Child dashboard component
- `client/src/pages/CreateChallenge.tsx` - Challenge creation page

### Commits
- `f02f5a6` - Fix challengeScope format handling
- `a18eb3e` - Fix userId vs childProfileId in challenge creation
- `b1ec589` - Fix database query API
- `f407751` - Fix database instance access

---

**End of Baseline Documentation**
