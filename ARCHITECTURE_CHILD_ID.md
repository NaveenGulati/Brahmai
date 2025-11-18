# Child ID Architecture - Simple & Consistent

**Date:** November 18, 2025  
**Status:** ✅ IMPLEMENTED

---

## The One Rule

**Always use `childProfileId` for all child-related operations.**

---

## Why This Matters

Previously, we had confusion between two IDs:
- `userId` (from users table) - Example: 45
- `childProfileId` (from childProfiles table) - Example: 1

This caused bugs where:
- Child login returned userId (45)
- Parent passed childProfileId (1)
- APIs didn't know which one to expect
- Challenges became invisible due to wrong ID type

---

## The Solution

### 1. Child Login Returns childProfileId

**File:** `server/authRouter.ts`

When a child logs in, the API:
1. Authenticates the user (gets userId)
2. Queries `childProfiles` table to get childProfileId
3. Returns `id: childProfileId` (not userId)
4. Also includes `userId` for reference if needed

```typescript
// Child login response
{
  user: {
    id: 1,           // childProfileId (THE ID TO USE)
    userId: 45,      // userId (for reference only)
    username: "riddhu1",
    role: "child"
  }
}
```

### 2. Frontend Always Uses childProfileId

**File:** `client/src/pages/CreateChallenge.tsx`

```typescript
// Child creates challenge
localStorage.childUser.id = 1  // childProfileId

// Parent creates challenge
route: /create-challenge/1     // childProfileId

// Both pass the same type!
actualChildId = 1  // Always childProfileId
```

### 3. Backend Always Expects childProfileId

**Files:** 
- `server/advanced-challenge/api.ts`
- `server/routers.ts`

```typescript
// Query by childProfileId
await db.select()
  .from(childProfiles)
  .where(eq(childProfiles.id, childId));  // childId is childProfileId

// Create challenge
await db.createChallenge({
  assignedTo: childId  // childProfileId
});
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ Child Login                                             │
│ Input: username, password                               │
│ Output: { id: 1 (childProfileId), userId: 45 }        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ localStorage.childUser                                  │
│ { id: 1, userId: 45, username: "riddhu1" }            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Frontend Components                                     │
│ CreateChallenge: actualChildId = 1 (childProfileId)   │
│ ChildDashboard: user.id = 1 (childProfileId)          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ API Calls                                               │
│ /api/advanced-challenge?childId=1 (childProfileId)    │
│ createChallenge({ childId: 1 }) (childProfileId)      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Backend APIs                                            │
│ Query: WHERE childProfiles.id = 1                      │
│ Insert: assignedTo = 1 (childProfileId)               │
└─────────────────────────────────────────────────────────┘
```

---

## Parent Flow (No Change Needed)

```
┌─────────────────────────────────────────────────────────┐
│ Parent Dashboard                                        │
│ Shows children with childProfileId                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Create Challenge Button                                 │
│ Navigate to: /create-challenge/1 (childProfileId)     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ CreateChallenge Page                                    │
│ actualChildId = 1 (childProfileId from route)          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Same API as Child                                       │
│ /api/advanced-challenge?childId=1 (childProfileId)    │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema Reference

```sql
-- users table
id: 45              -- userId
username: "riddhu1"
role: "child"

-- childProfiles table
id: 1               -- childProfileId (USE THIS)
userId: 45          -- FK to users.id (reference only)
parentId: 9         -- parent's userId

-- challenges table
assignedBy: 9       -- parent's userId OR child's userId
assignedTo: 1       -- childProfileId (ALWAYS)
```

---

## Benefits

1. **Consistency:** One ID type everywhere
2. **Simplicity:** No conditional logic needed
3. **Maintainability:** Easy to understand and debug
4. **Future-proof:** New features just use childProfileId

---

## Migration Notes

### What Changed
- `server/authRouter.ts`: Child login now returns childProfileId as `id`
- `server/advanced-challenge/api.ts`: Removed fallback logic, expects only childProfileId

### What Stayed the Same
- All frontend components (they already worked with the ID)
- Parent dashboard flow (already used childProfileId)
- Database schema (no changes needed)

### Backward Compatibility
- Old sessions will have userId in localStorage
- After re-login, new sessions will have childProfileId
- No data migration needed

---

## Testing Checklist

- [x] Child login returns childProfileId
- [x] Child can create simple challenges
- [x] Child can create advanced challenges
- [x] Parent can create simple challenges for child
- [x] Parent can create advanced challenges for child
- [x] Challenges appear in correct dashboards
- [x] No ID confusion errors

---

## Future Development

When adding new child-related features:

1. ✅ **DO:** Use childProfileId for all child operations
2. ✅ **DO:** Query `childProfiles.id = childId`
3. ✅ **DO:** Set `assignedTo = childId` (childProfileId)
4. ❌ **DON'T:** Mix userId and childProfileId
5. ❌ **DON'T:** Add fallback logic for "both ID types"
6. ❌ **DON'T:** Assume `id` means userId

---

**Remember: One ID to rule them all - childProfileId!**

---

**End of Architecture Documentation**
