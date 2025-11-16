# Advanced Challenge Feature - Testing Guide

**Date:** November 16, 2025  
**Status:** Ready for Testing  
**Deployed:** Production (Render auto-deploy in progress)

---

## 🎯 What to Test

This guide will help you test the new **Advanced Multi-Topic Challenge** feature end-to-end.

---

## 📋 Prerequisites

1. **Access:** Log in as a parent at https://brahmai-quiz.onrender.com
2. **Child Account:** Have at least one child profile created
3. **Question Bank:** Ensure you have questions in multiple topics (already done: Integers, Rational Numbers)

---

## 🧪 Test Scenarios

### **Test 1: Challenge Type Selection**

**Steps:**
1. Log in as parent
2. Go to child's profile
3. Click "Create Challenge"
4. **Verify:** You see two options:
   - ○ Simple Challenge (Single module)
   - ○ Advanced Challenge (Multiple topics) **[NEW badge]**

**Expected Result:**
- Both options are visible
- Advanced Challenge has a "NEW" badge
- Descriptions are clear and helpful

**Screenshot Location:** Take a screenshot of this screen

---

### **Test 2: Simple Challenge (Existing Flow)**

**Steps:**
1. Select "Simple Challenge"
2. Complete the existing challenge creation flow
3. **Verify:** Everything works as before

**Expected Result:**
- No changes to existing functionality
- Challenge creates successfully
- Can go back to type selection

---

### **Test 3: Advanced Challenge - Topic Selection**

**Steps:**
1. Select "Advanced Challenge"
2. **Verify Step 1 screen shows:**
   - Left panel: Collapsible subject/topic tree
   - Right panel: Selected topics summary (0/10)
3. Expand "Mathematics" subject
4. **Verify:** You see topics like "Integers", "Rational Numbers"
5. Click checkbox next to "Integers"
6. **Verify:**
   - Topic appears in right panel "Selected Topics"
   - Counter shows "1/10 topics selected"
7. Expand "Integers" topic
8. **Verify:** You see:
   - Radio button: "All subtopics (12)"
   - Radio button: "Select specific subtopics"
   - List of 12 subtopics with question counts

**Expected Result:**
- Tree view is intuitive and responsive
- Selection state updates immediately
- Can expand/collapse smoothly

**Screenshot Location:** Take screenshots of:
- Collapsed view
- Expanded view with subtopics
- Selected topics panel

---

### **Test 4: Multiple Topic Selection**

**Steps:**
1. Select "Integers" (all subtopics)
2. Select "Rational Numbers" (all subtopics)
3. **Verify:**
   - Counter shows "2/10 topics selected"
   - Both appear in right panel
4. Try to select 11th topic (if available)
5. **Verify:** Toast error: "Maximum 10 topics allowed"

**Expected Result:**
- Can select up to 10 topics
- Clear error message when limit reached
- Can remove topics with X button

---

### **Test 5: Specific Subtopic Selection**

**Steps:**
1. Select "Integers"
2. Expand "Integers" topic
3. Choose "Select specific subtopics"
4. Check only:
   - "Addition of Integers"
   - "Subtraction of Integers"
   - "Multiplication of Integers"
5. **Verify:** Right panel shows "3 subtopic(s) selected"

**Expected Result:**
- Can toggle between "all" and "specific"
- Subtopic checkboxes work correctly
- Summary updates in real-time

---

### **Test 6: Configuration Step**

**Steps:**
1. Select 2-3 topics (e.g., Integers + Rational Numbers)
2. Click "Next"
3. **Verify Step 2 screen shows:**
   - Blue suggestion box: "Recommended: 30 questions"
   - Reasoning text
   - Estimated duration
   - Question count slider (with min/max range)
   - Focus area radio buttons:
     - Strengthen (60% easy, 30% medium, 10% hard)
     - Balanced (33% each difficulty)
     - Improve (10% easy, 30% medium, 60% hard)
   - Distribution Preview section

**Expected Result:**
- Suggestion appears automatically
- Slider range matches backend calculation
- All UI elements render correctly

**Screenshot Location:** Take screenshot of configuration screen

---

### **Test 7: Real-time Distribution Preview**

**Steps:**
1. On Step 2, observe the "Distribution Preview" section
2. **Verify:** You see cards for each selected topic showing:
   - Topic name
   - Number of questions allocated
   - Percentage
   - Difficulty breakdown (Easy/Medium/Hard counts)
3. Move the slider to change total questions (e.g., 30 → 50)
4. **Verify:**
   - Distribution updates automatically
   - Percentages remain proportional
   - No page reload needed
5. Change focus area from "Balanced" to "Strengthen"
6. **Verify:** Difficulty distribution changes (more easy questions)

**Expected Result:**
- Preview updates in real-time (< 1 second)
- Proportions are maintained when total changes
- Difficulty distribution reflects focus area

**Screenshot Location:** Take screenshots showing:
- Distribution at 30 questions
- Distribution at 50 questions
- Different focus areas

---

### **Test 8: Review Step**

**Steps:**
1. Click "Next" from Step 2
2. **Verify Step 3 screen shows:**
   - Challenge title (auto-generated)
   - List of selected topics with checkmarks
   - Total questions (large number)
   - Estimated duration
   - Focus area badge

**Expected Result:**
- All information is accurate
- Title makes sense
- Can go back to edit

---

### **Test 9: Challenge Creation**

**Steps:**
1. On Step 3, click "Create Challenge"
2. **Verify:**
   - Button shows "Creating..." with spinner
   - Toast notification: "Challenge created successfully with X questions"
   - Dialog closes
   - Challenge appears in pending challenges list

**Expected Result:**
- Challenge creates without errors
- Success message is clear
- Can see challenge in list immediately

---

### **Test 10: Question Mixing (Critical Test)**

**Steps:**
1. Create an advanced challenge with 2 topics:
   - Integers (all subtopics)
   - Rational Numbers (all subtopics)
   - Total: 30 questions
2. Have the child start the challenge
3. **Observe the first 15 questions:**
   - Note which topic each question belongs to
   - Count consecutive questions from same topic

**Expected Result:**
- ✅ Questions are MIXED (not all Integers then all Rational Numbers)
- ✅ No more than 3 consecutive questions from same topic
- ✅ Example good pattern:
  ```
  Q1: Integers
  Q2: Rational Numbers
  Q3: Integers
  Q4: Integers
  Q5: Rational Numbers
  Q6: Integers
  ...
  ```
- ❌ Bad pattern (should NOT happen):
  ```
  Q1-Q15: Integers
  Q16-Q30: Rational Numbers
  ```

**Screenshot Location:** Take screenshots of first 10 questions showing topic mixing

---

### **Test 11: No Duplicate Questions**

**Steps:**
1. Create a challenge with 50 questions from 1-2 topics
2. Have child complete the entire challenge
3. Review all questions
4. **Verify:** No question appears twice

**Expected Result:**
- Every question is unique
- No repeated question text
- No repeated question IDs

---

### **Test 12: Graceful Degradation (Edge Case)**

**Steps:**
1. Try to create a challenge with:
   - 1 topic that has very few questions (< 10)
   - Request 50 total questions
2. **Verify:**
   - Challenge still creates
   - Uses all available questions from that topic
   - No error shown to parent
   - Success message mentions actual question count

**Expected Result:**
- System doesn't crash
- Uses what's available
- Parent doesn't see technical errors
- Challenge is still usable

---

### **Test 13: Cross-Subject Challenge**

**Steps:**
1. Select topics from different subjects:
   - Mathematics > Integers
   - Mathematics > Rational Numbers
   - Chemistry > Metals and Non-Metals (if available)
2. Create challenge with 30 questions
3. **Verify:**
   - Title shows "Multi-Subject Challenge - 3 Topics"
   - Distribution allocates proportionally
   - All subjects appear in quiz

**Expected Result:**
- Cross-subject challenges work
- Questions are mixed across subjects
- Title reflects multi-subject nature

---

### **Test 14: Back Navigation**

**Steps:**
1. Start creating advanced challenge
2. Go to Step 2
3. Click "Back"
4. **Verify:** Returns to Step 1 with selections preserved
5. Modify selections
6. Go forward again
7. **Verify:** Preview updates with new selections

**Expected Result:**
- Can navigate back and forth
- Selections are preserved
- Changes reflect immediately

---

### **Test 15: Cancel and Return**

**Steps:**
1. Start creating advanced challenge
2. Select some topics
3. Click "Cancel" (or "Back" on Step 1)
4. **Verify:** Returns to type selection screen
5. Select "Advanced Challenge" again
6. **Verify:** Starts fresh (no previous selections)

**Expected Result:**
- Cancel works at any step
- State is reset on re-entry
- No stale data

---

## 🐛 Known Issues to Watch For

### **Issue 1: Topic Filtering Bug (FIXED)**
- **Symptom:** Rational Numbers challenge shows Integers questions
- **Status:** ✅ FIXED (commit 9679e24)
- **Test:** Create Rational Numbers challenge, verify questions are correct

### **Issue 2: Duplicate Options (FIXED)**
- **Symptom:** Same answer appears twice
- **Status:** ✅ FIXED (database cleaned)
- **Test:** Check that all questions have unique options

### **Issue 3: Module Name Whitespace (FIXED)**
- **Symptom:** "Metals and Non-Metals" module not found
- **Status:** ✅ FIXED (trimmed in database)
- **Test:** Verify Metals topic appears and works

---

## 📊 Success Criteria

### **Functional Requirements**
- [ ] Can select up to 10 topics
- [ ] Can choose all or specific subtopics
- [ ] Real-time preview works
- [ ] Questions are mixed (not sequential)
- [ ] No duplicate questions
- [ ] Challenge creates successfully
- [ ] Works across subjects

### **User Experience**
- [ ] UI is intuitive and responsive
- [ ] Loading states are clear
- [ ] Error messages are helpful
- [ ] Navigation is smooth
- [ ] Mobile-friendly (if applicable)

### **Performance**
- [ ] Topic tree loads < 2 seconds
- [ ] Preview updates < 1 second
- [ ] Challenge creation < 3 seconds
- [ ] No browser freezing

---

## 🎬 Testing Workflow

### **Quick Test (15 minutes)**
1. Test 1: Type selection
2. Test 3: Topic selection
3. Test 6: Configuration
4. Test 9: Challenge creation
5. Test 10: Question mixing (critical)

### **Full Test (45 minutes)**
- Run all 15 test scenarios
- Take screenshots
- Document any issues
- Test edge cases

### **Regression Test (10 minutes)**
- Test 2: Verify simple challenge still works
- Check existing features aren't broken

---

## 📸 Screenshot Checklist

Please capture screenshots of:
- [ ] Challenge type selection screen
- [ ] Topic selection with collapsed subjects
- [ ] Topic selection with expanded topics and subtopics
- [ ] Selected topics panel (2-3 topics)
- [ ] Configuration screen with suggestion
- [ ] Distribution preview
- [ ] Review screen
- [ ] First 10 questions showing topic mixing
- [ ] Success toast notification
- [ ] Challenge in pending list

---

## 🔧 Troubleshooting

### **Problem: Topics not loading**
- **Check:** Network tab in browser DevTools
- **Look for:** `/api/advanced-challenge/available-topics` request
- **Expected:** 200 status, JSON response with topics

### **Problem: Preview not updating**
- **Check:** Console for errors
- **Look for:** `/api/advanced-challenge/preview` request
- **Expected:** 200 status, distribution data

### **Problem: Challenge creation fails**
- **Check:** Console and network tab
- **Look for:** `/api/advanced-challenge/create` request
- **Expected:** 200 status, challengeId in response

### **Problem: Questions not mixed**
- **Check:** Database `challenges` table
- **Look at:** `challenge_scope` JSONB field
- **Verify:** `questionOrder` array has mixed `topicIndex` values

---

## 📝 Feedback Template

After testing, please provide feedback using this template:

```
## Test Results

**Date:** [Date]
**Tester:** [Your Name]
**Browser:** [Chrome/Safari/Firefox]
**Device:** [Desktop/Mobile]

### What Worked ✅
- [List features that worked well]

### Issues Found 🐛
- [List any bugs or problems]
- Include: Steps to reproduce, expected vs actual behavior

### UX Feedback 💡
- [Suggestions for improvement]
- [Confusing elements]
- [Missing features]

### Screenshots
- [Attach screenshots]

### Overall Rating
- [ ] Ready for production
- [ ] Needs minor fixes
- [ ] Needs major fixes
```

---

## 🚀 Post-Testing Actions

### **If All Tests Pass:**
1. Mark feature as "Production Ready"
2. Announce to users
3. Monitor usage metrics
4. Collect user feedback

### **If Issues Found:**
1. Document issues with screenshots
2. Prioritize by severity
3. Fix critical bugs
4. Re-test
5. Deploy fixes

---

## 📈 Metrics to Monitor

After deployment, track:
- **Adoption Rate:** % of parents using advanced vs simple
- **Average Topics:** How many topics per challenge
- **Completion Rate:** Do students finish advanced challenges?
- **Error Rate:** Any backend errors in logs
- **Performance:** API response times

---

## 🎓 Training Materials

### **For Parents:**
Create a quick guide:
1. "What is an Advanced Challenge?"
2. "When to use Simple vs Advanced"
3. "How to select topics"
4. "Understanding the distribution"

### **For Support:**
- FAQ document
- Common issues and solutions
- How to check challenge details

---

**Happy Testing! 🎉**

If you encounter any issues or have questions, document them and we'll address them together.
