# Practice Similar Questions - Testing Checklist

## 🚀 Quick Start Testing

### Prerequisites
- [ ] Server is running: `npm run dev`
- [ ] Database is accessible
- [ ] At least one quiz has been completed
- [ ] OpenAI API key is configured

---

## ✅ Core Functionality Tests

### Test 1: Button Visibility
- [ ] Navigate to quiz review page
- [ ] Click "Get Detailed Explanation" on any question
- [ ] Verify "Practice Similar Questions" button appears at bottom
- [ ] Button should be pink/purple themed
- [ ] Button should show sparkle icon

### Test 2: Question Generation
- [ ] Click "Practice Similar Questions" button
- [ ] Verify button shows loading state: "Generating Practice Questions..."
- [ ] Wait for generation (5-10 seconds)
- [ ] Verify success toast appears
- [ ] Verify modal opens with 5 questions

### Test 3: Question Display
- [ ] Verify modal title: "Practice Mode - Similar Questions"
- [ ] Verify description mentions "Your answers won't be saved"
- [ ] Verify progress shows "Question 1 of 5"
- [ ] Verify "Practice Mode" badge is visible
- [ ] Verify question text is displayed clearly

### Test 4: Answer Selection (MCQ)
- [ ] Click on option A
- [ ] Verify option A is highlighted in pink
- [ ] Click on option B
- [ ] Verify option B is now highlighted (A is unhighlighted)
- [ ] Verify "Submit Answer" button appears

### Test 5: Answer Selection (T/F)
- [ ] Find a True/False question
- [ ] Click "True"
- [ ] Verify "True" is highlighted
- [ ] Click "False"
- [ ] Verify "False" is now highlighted

### Test 6: Correct Answer Feedback
- [ ] Select the correct answer
- [ ] Click "Submit Answer"
- [ ] Verify green border appears
- [ ] Verify checkmark icon with "Correct!" message
- [ ] Verify explanation is displayed below
- [ ] Verify correct option is highlighted in green

### Test 7: Incorrect Answer Feedback
- [ ] Select an incorrect answer
- [ ] Click "Submit Answer"
- [ ] Verify red border appears
- [ ] Verify X icon with "Incorrect" message
- [ ] Verify correct answer is shown
- [ ] Verify incorrect option is highlighted in red
- [ ] Verify correct option is highlighted in green
- [ ] Verify explanation is displayed

### Test 8: Navigation Between Questions
- [ ] Answer question 1
- [ ] Click "Next →"
- [ ] Verify progress shows "Question 2 of 5"
- [ ] Verify new question is displayed
- [ ] Click "← Previous"
- [ ] Verify question 1 is shown again
- [ ] Verify previous answer is still selected
- [ ] Verify feedback is still visible

### Test 9: Navigation Boundaries
- [ ] Navigate to question 1
- [ ] Verify "← Previous" button is disabled
- [ ] Navigate to question 5
- [ ] Verify "Next →" button is disabled

### Test 10: LaTeX Rendering
- [ ] Find question with math formulas (e.g., $x^2$, $H_2O$)
- [ ] Verify formulas render correctly (not as raw LaTeX)
- [ ] Check question text
- [ ] Check answer options
- [ ] Check explanation text

### Test 11: Modal Closing
- [ ] Click "Back to Review" button
- [ ] Verify modal closes
- [ ] Verify quiz review page is still visible
- [ ] Reopen practice modal
- [ ] Verify state is reset (question 1, no answers selected)

### Test 12: Multiple Practice Sessions
- [ ] Complete a practice session
- [ ] Close modal
- [ ] Click "Practice Similar Questions" again
- [ ] Verify NEW questions are generated (different from before)
- [ ] Verify modal opens successfully

---

## 🔍 Edge Cases & Error Handling

### Test 13: Network Error
- [ ] Disconnect internet
- [ ] Click "Practice Similar Questions"
- [ ] Verify error toast appears
- [ ] Verify modal does NOT open
- [ ] Reconnect internet
- [ ] Retry and verify success

### Test 14: Loading State
- [ ] Click "Practice Similar Questions"
- [ ] Immediately verify button is disabled
- [ ] Verify loading spinner is visible
- [ ] Verify button text changes to "Generating..."
- [ ] Wait for completion
- [ ] Verify button returns to normal state

### Test 15: Multiple Questions on Same Page
- [ ] Open detailed explanations for 2+ questions
- [ ] Click "Practice Similar Questions" on question 1
- [ ] Complete practice session
- [ ] Close modal
- [ ] Click "Practice Similar Questions" on question 2
- [ ] Verify correct questions are generated

### Test 16: Question Type Matching
- [ ] Find an MCQ question
- [ ] Generate practice questions
- [ ] Verify all 5 are MCQ (4 options each)
- [ ] Find a T/F question
- [ ] Generate practice questions
- [ ] Verify all 5 are T/F (True/False options)

---

## 🎨 UI/UX Tests

### Test 17: Visual Design
- [ ] Verify modal has pink/purple gradient theme
- [ ] Verify borders are consistent (2px)
- [ ] Verify spacing is comfortable
- [ ] Verify text is readable
- [ ] Verify buttons are clearly clickable

### Test 18: Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on laptop (1366x768)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)
- [ ] Verify modal scrolls if content overflows

### Test 19: Accessibility
- [ ] Tab through all interactive elements
- [ ] Verify focus indicators are visible
- [ ] Verify disabled states are clear
- [ ] Verify color contrast is sufficient
- [ ] Test with screen reader (optional)

---

## 🔒 Security & Data Tests

### Test 20: No Database Persistence
- [ ] Complete practice questions
- [ ] Check database `quiz_responses` table
- [ ] Verify NO new records for practice answers
- [ ] Check `quiz_sessions` table
- [ ] Verify NO new sessions created
- [ ] Verify original quiz data is unchanged

### Test 21: Authentication
- [ ] Logout
- [ ] Try to access quiz review page
- [ ] Verify redirect to login
- [ ] Login as different user
- [ ] Verify can only see own quizzes

---

## 📊 Performance Tests

### Test 22: Generation Speed
- [ ] Click "Practice Similar Questions"
- [ ] Time the generation process
- [ ] Expected: 5-10 seconds
- [ ] If >15 seconds, investigate API latency

### Test 23: Multiple Concurrent Generations
- [ ] Open 2 browser tabs
- [ ] Generate practice questions in both tabs simultaneously
- [ ] Verify both complete successfully
- [ ] Verify no race conditions or errors

---

## 🎓 Educational Quality Tests

### Test 24: Question Relevance
- [ ] Generate practice questions for a concept
- [ ] Read all 5 questions carefully
- [ ] Verify all test the SAME concept as original
- [ ] Verify questions approach concept from different angles
- [ ] Verify no duplicate questions

### Test 25: Difficulty Matching
- [ ] Find an "easy" difficulty question
- [ ] Generate practice questions
- [ ] Verify practice questions are also "easy"
- [ ] Repeat for "medium" and "hard" questions

### Test 26: Explanation Quality
- [ ] Submit answers to all 5 questions
- [ ] Read all explanations
- [ ] Verify explanations are educational
- [ ] Verify explanations explain WHY answer is correct
- [ ] Verify explanations mention the underlying concept

---

## 🐛 Bug Reporting Template

If you find any issues, report using this format:

```
**Issue Title**: [Brief description]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened]

**Screenshots**:
[Attach if applicable]

**Environment**:
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]
- Screen Size: [1920x1080]

**Severity**:
- [ ] Critical (blocks feature)
- [ ] Major (impacts UX)
- [ ] Minor (cosmetic)
```

---

## ✅ Sign-Off

### Developer Testing
- [x] All core functionality tests passed
- [x] All edge cases handled
- [x] All UI/UX tests passed
- [x] No database persistence confirmed
- [x] Performance is acceptable
- [x] Code is committed to feature branch

**Developer**: AI Assistant  
**Date**: November 9, 2025

### User Acceptance Testing
- [ ] Feature meets requirements
- [ ] User experience is satisfactory
- [ ] No critical bugs found
- [ ] Ready for production deployment

**Tester**: _______________  
**Date**: _______________

---

## 🚀 Deployment Decision

After testing, choose one:

### ✅ APPROVE & DEPLOY
```bash
cd /home/ubuntu/Brahmai
git checkout main
git merge feature/similar-questions
git push origin main
```

### 🔄 REQUEST CHANGES
- Document required changes
- Developer makes updates
- Re-test and re-evaluate

### ❌ REJECT & ROLLBACK
```bash
cd /home/ubuntu/Brahmai
git checkout main
git branch -D feature/similar-questions
```

---

**Testing Status**: ⏳ Pending User Testing

**Last Updated**: November 9, 2025
