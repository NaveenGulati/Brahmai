# Project TODO

## Completed Features
- [x] Database schema with subjects, modules, questions, users, quiz sessions
- [x] Parent dashboard with question bank management
- [x] Child dashboard with subject and module selection
- [x] Quiz play interface with multiple question types
- [x] Local authentication for child accounts (username/password)
- [x] Parent can create child accounts
- [x] Parent can delete child accounts
- [x] Gamification (points, streaks, achievements)
- [x] Progress tracking and statistics
- [x] Sample questions for Mathematics modules
- [x] Timer and scoring system
- [x] Quiz session management

## Pending Features
- [x] Clickable quiz names in "Recent Quizzes" section
- [x] Quiz review page showing all questions and answers
- [x] Display correct/incorrect answers for each question
- [x] AI-generated summary of strengths and weaknesses
- [x] Overall performance analysis per quiz



## New Tasks
- [x] Improve AI analysis text formatting with HTML/Markdown rendering
- [x] Add proper bullets, bold text, and visual structure to recommendations



- [x] Remove confusing backtick symbols from AI analysis
- [x] Replace code formatting with child-friendly visual styling for math expressions



- [x] Add "Reattempt Test" button in quiz review page
- [x] Place button under stats (time and question count)
- [x] Create new quiz session with same module and complexity
- [x] Pull fresh questions from question bank for reattempt



- [x] Show comparison with previous attempt after reattempting a test
- [x] Display side-by-side performance metrics (score, time, accuracy)
- [x] Highlight areas of improvement with positive indicators
- [x] Identify persistent weaknesses that need more practice
- [x] Add visual progress indicators (arrows, colors)



## Bugs to Fix
- [x] Remove "Reattempt Test" button from parent's quiz review view
- [x] Only show "Reattempt Test" when child views their own quiz results
- [x] Fix "Loading quiz..." stuck issue when parent clicks Reattempt Test




## New Features to Implement
- [x] Challenge system: Parent can assign specific quiz/module as challenge to child
- [x] Backend API: createChallenge in parent router
- [x] Database schema: challenges table with childId, moduleId, status, etc.
- [x] Parent Dashboard UI: "Create Challenge" button in Child Progress cards
- [x] Challenge creation modal with subject and module selection
- [x] Child dashboard shows "New Challenge!" notification banner
- [x] Track challenge completion status
- [x] Backend API: getChallenges and completeChallenge in child router
- [x] Password reset: Add "Reset Password" button in Parent Dashboard for each child
- [x] Backend API: resetChildPassword in parent router
- [x] Password reset modal with new password input
- [x] Parent can set new password for child account



## New Bugs to Fix
- [x] Make subject and module names bold in challenge notification (e.g., "Mathematics - Integers")
- [x] Fix 404 error when starting challenge - challengeId not being passed correctly in URL
- [x] Store challengeId in localStorage and use correct route format (/quiz/:moduleId)
- [x] Mark challenge as completed when quiz is finished



## New Features
- [x] Add dismiss (X) button to challenge notifications so children can manually remove them after reading

