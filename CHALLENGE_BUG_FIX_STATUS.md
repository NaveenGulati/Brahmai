# Challenge Creation Bug Fix Status

## Issues Identified

### 1. ✅ FIXED: Missing useAuth Import
**Problem**: CreateChallenge page was importing `useAuth` from wrong path  
**Solution**: Changed from `@/hooks/useAuth` to `@/_core/hooks/useAuth`  
**Status**: Fixed and building successfully

### 2. ❌ CRITICAL: API Endpoint Mismatch
**Problem**: ChallengeCreator and AdvancedChallengeCreator components are hardcoded to use `trpc.parent.*` endpoints  
**Impact**: When a child user tries to create a challenge, they get 403 Forbidden errors  
**Root Cause**: Components were originally designed only for parents

**Affected API Calls**:
- `trpc.parent.getUniqueSubjects` (line 67 in ChallengeCreator.tsx)
- `trpc.parent.getModulesForSubject` (line 68)
- `trpc.parent.getPerformanceSummary` (line 72)
- `trpc.parent.estimateChallengeDuration` (line 91)
- `trpc.parent.createAdaptiveChallenge` (line 101)

**Similar issues in AdvancedChallengeCreator.tsx**

### 3. Solution Options

#### Option A: Create Child-Specific Endpoints (Recommended)
Add equivalent endpoints in child router:
- `child.getAvailableSubjects`
- `child.getAvailableModules`
- `child.createSelfChallenge`
- etc.

#### Option B: Make Parent Endpoints Universal
Modify parent endpoints to accept optional childId parameter and work for both parents and children

#### Option C: Create Unified Challenge Router
Create a new `challenge` router that works for all user types

## Immediate Fix Needed

The ChallengeCreator components need to:
1. Detect the current user's role
2. Call appropriate endpoints based on role
3. Handle permissions correctly

## Temporary Workaround

Until proper fix is implemented:
- Parents can create challenges (works)
- Children CANNOT create self-challenges (broken)
- Need to either:
  - Revert to modal-based approach for parents only
  - OR fix the API endpoints immediately

## Files That Need Changes

1. `/server/routers.ts` - Add child-accessible endpoints
2. `/client/src/components/ChallengeCreator.tsx` - Use role-based endpoint selection
3. `/client/src/components/AdvancedChallengeCreator.tsx` - Use role-based endpoint selection

## Priority

**HIGH** - This breaks a core feature that was working before
