# MANUS WORK COMMITMENT
## Mandatory Process for ALL Future Work

**Date:** November 18, 2025  
**Context:** User frustrated with expensive debugging cycles, trial-and-error deployments, and wasted time  
**Agreement:** One week to prove improved process, or help migrate to Replit

---

## CORE COMMITMENTS

### 1. TEST EVERYTHING IN SANDBOX BEFORE USER TESTS
**NEVER ask user to test without sandbox verification first**

**Process:**
- [ ] Write test script for the change
- [ ] Run test in sandbox with actual data
- [ ] Verify fix works completely
- [ ] Show user the test results
- [ ] Only then deploy

**Example Failure:** localStorage issue - didn't test Home.tsx login path, wasted 2 hours of user's time

---

### 2. UNDERSTAND FULL CONTEXT BEFORE CODING
**NEVER make assumptions - verify everything**

**Process:**
- [ ] Search for ALL files that might be affected
- [ ] Check for similar patterns in codebase
- [ ] Understand the full data flow
- [ ] Plan complete fix before coding

**Example Failure:** Fixed ChildLogin.tsx but missed Home.tsx and DevLogin.tsx - should have searched for all login paths

---

### 3. NO TRIAL-AND-ERROR DEPLOYMENTS
**ONE deployment per bug, not 5+**

**Process:**
- [ ] Think through solution completely
- [ ] Write fix once, correctly
- [ ] Test thoroughly in sandbox
- [ ] Deploy once
- [ ] It works

**Example Failure:** userId/childProfileId - made 5+ deployments trying different things

---

### 4. BETTER COMMUNICATION
**Be transparent and honest**

**Process:**
- [ ] Explain what I'm testing and why
- [ ] Show test results before deployment
- [ ] Set clear expectations
- [ ] Admit uncertainty instead of guessing
- [ ] No "try this" - only "this will work because..."

---

### 5. DOCUMENT AS I GO
**Keep codebase maintainable**

**Process:**
- [ ] Update architecture docs with each change
- [ ] Maintain changelog of fixes
- [ ] Create troubleshooting guides
- [ ] Make it easy for others to understand

---

## MANDATORY BUG FIX WORKFLOW

### Step 1: Investigation (15-30 min)
- [ ] Reproduce the issue
- [ ] Check ALL related code
- [ ] Understand root cause completely
- [ ] Plan the complete fix (not partial)

### Step 2: Write Test Scripts (10-15 min)
- [ ] Create sandbox test
- [ ] Test with actual data from database
- [ ] Verify fix works

### Step 3: Show Results (5 min)
- [ ] Share test output with user
- [ ] Explain what was tested
- [ ] Confirm ready to deploy

### Step 4: Single Deployment (5 min)
- [ ] Deploy once
- [ ] User tests once
- [ ] It works

**Total: 35-55 minutes per bug (not 2-3 hours)**

---

## SUCCESS METRICS (Weekly)

User should see:
- ✅ **90% fewer deployments** - Most bugs fixed in 1 deployment
- ✅ **50% less testing time** - Manus tests first, user verifies once
- ✅ **Zero "try this" moments** - Every fix is confident
- ✅ **Clear documentation** - User understands what was fixed

---

## FAILURE CONDITION

If after 1 week, Manus is still:
- ❌ Making user test multiple times per bug
- ❌ Not testing properly in sandbox
- ❌ Wasting time with trial-and-error
- ❌ Making careless mistakes

**Then:** Help user migrate to Replit efficiently (minimize credits used)

---

## CRITICAL REMINDERS

### Before EVERY code change:
1. **Have I tested this in sandbox?**
2. **Have I checked ALL related files?**
3. **Am I confident this will work?**
4. **Have I shown the user my test results?**

### Before EVERY deployment:
1. **Is this the ONLY deployment needed?**
2. **Have I verified it works in sandbox?**
3. **Can I explain exactly why this fixes the issue?**

### After EVERY bug fix:
1. **Did I document what was learned?**
2. **Did I update architecture docs?**
3. **Did I test thoroughly before user tested?**

---

## USER'S EXPECTATION

**"I don't want to be reminding you of this over and over"**

This document exists so user NEVER has to remind me. I must:
- Reference this document for EVERY task
- Follow the process religiously
- Prove I can be trusted
- Earn back confidence

---

## ARCHITECTURAL LEARNINGS (Must Remember)

### Child ID Architecture
- **ALWAYS use childProfileId (not userId) for child-related operations**
- Child login returns: `{ id: childProfileId, userId: userId }`
- Store in localStorage: `childUser.id = childProfileId`
- All challenge APIs expect childProfileId
- See: `ARCHITECTURE_CHILD_ID.md` and `CRITICAL_USERID_CHILDPROFILEID_PATTERN.md`

### Challenge System
- Simple challenges: moduleId + questionCount + focusArea
- Advanced challenges: challengeScope (topics array) + questionCount
- ALWAYS pass questionCount to createChallenge (default is 10)
- challengeScope can be array OR object with topics key

### Testing Requirements
- Test ALL login paths (Home.tsx, ChildLogin.tsx, DevLogin.tsx)
- Test with ACTUAL database data (not mock data)
- Test on both child and parent flows
- Verify localStorage is set correctly

---

**This is my contract with the user. I will honor it.**
