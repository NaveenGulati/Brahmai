# Bugs to Fix - Batch Deployment

## Bug #1: Duplicate Questions in Quiz
**Status**: 🔴 To Fix  
**Priority**: HIGH  
**Description**: Same questions getting repeated in quiz (e.g., questions 13-20 repeated back-to-back in Quiz #55)  
**Location**: Quiz generation logic  
**Fix Required**: 
- Amend logic to prevent duplicate questions across entire quiz
- Ensure questions are unique throughout the quiz session
- Check question selection algorithm

---

## Bug #2: Word Meaning Explanations Too Complex
**Status**: 🔴 To Fix  
**Priority**: MEDIUM  
**Description**: Word meaning explanations are too difficult for Grade 7 students without parental help  
**Location**: Word meaning feature  
**Fix Required**: 
- Adjust explanation level based on grade metadata from question
- Simplify language to match Grade 7 intellect
- Make explanations age-appropriate and self-understandable

---

## Bug #3: Audio Pauses Missing
**Status**: 🔴 To Fix  
**Priority**: MEDIUM  
**Description**: No pause between headings/subheadings and following paragraphs - sounds like running speech  
**Location**: Audio explanation generation (TTS)  
**Fix Required**: 
- Add pauses after headings
- Add pauses after subheadings
- Add pauses between heading and paragraph
- Improve natural speech flow

---

## Bug #4: Auto-Scroll Missing in Explanations
**Status**: 🔴 To Fix  
**Priority**: LOW  
**Description**: When pressing "Make it simpler" or "Go back", page doesn't auto-scroll to start of explanation  
**Location**: QuizReview.tsx - Detailed Explanation section  
**Fix Required**: 
- Auto-scroll to top when "Make it simpler" is pressed
- Auto-scroll to top when "Go back" is pressed
- Smooth scroll animation for better UX

---

## Bug #5: Practice Similar Questions Button Not Prominent
**Status**: 🔴 To Fix  
**Priority**: LOW  
**Description**: Button blends with background, not visually prominent  
**Location**: QuizReview.tsx - Practice Similar Questions button  
**Fix Required**: 
- Add gradient background (pink/purple)
- Add shadow for depth
- Increase contrast
- Add hover effects
- Make button more eye-catching

---

**Total Bugs**: 5  
**Status**: Ready to fix all together  
**Deployment**: Single batch deployment after all fixes
