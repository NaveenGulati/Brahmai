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



## Challenge System Improvements
- [x] Remove X dismiss button from child challenge notifications
- [x] Challenges should only disappear when quiz is completed successfully
- [x] If quiz is incomplete (child left in between), notification should stay
- [x] Add completed challenges section in Parent Dashboard
- [x] Show brief summary of challenge results (score, time, accuracy)
- [x] Make completed challenges clickable to redirect to quiz review page
- [x] Display challenge results in well-formatted cards



## Reattempt Quiz Fixes
- [x] Fix "Reattempt Test" button in quiz review - only show to children, not parents
- [x] Ensure reattempt uses random questions from the same module pool, not the exact same questions (already implemented)
- [x] Add completed challenges section in Parent Dashboard showing results summary
- [x] Make completed challenges clickable to view full quiz review



## Bugs Fixed
- [x] Points mismatch: Header shows 40 points but dashboard shows 60 points - fixed by using live stats query instead of cached localStorage
- [x] Completed challenges not showing in Parent Dashboard - fixed by passing sessionId and invalidating queries
- [x] Input validation: Keeping alphanumeric input (not restricting to numbers only) to support diverse answer formats: negative numbers, percentages, powers, fractions, decimals, and variables



## UI Improvements
- [x] Change completed challenge date format from "10/29/2025" to "29th Oct 2025, 11:22 AM"



## Points Ledger Feature
- [x] Make "Total Points" clickable on Child Dashboard
- [x] Make "Total Points" clickable on Parent Dashboard (in Child Progress cards)
- [x] Create Points Ledger modal showing transaction history
- [x] Display date/time, subject, module, points earned for each quiz
- [x] Make ledger line items clickable to navigate to quiz review page
- [x] Add backend API to fetch points history with quiz details



## UI/UX Improvements
- [x] Swap Parent Dashboard tab order: "Child Progress" first, "Question Bank" second
- [x] Set "Child Progress" as default tab on Parent Dashboard
- [x] Fix child points ledger quiz links to use child-quiz-review route instead of parent route



## Critical Bug
- [x] Fix QuizReview to support both parent and child authentication - currently only works for parents
- [x] Revert child points ledger link back to /quiz-review/:id after fixing QuizReview
- [x] Added getQuizReview procedure to child router with AI analysis
- [x] QuizReview now detects child vs parent login and uses appropriate API



## Points Ledger Enhancement
- [x] Add graphical chart to visualize points earned over time in Points Ledger modal
- [x] Use line chart to show points progression with Recharts
- [x] Display chart above the transaction list in the modal
- [x] Make chart responsive and visually appealing with purple theme
- [x] Added to both Child Dashboard and Parent Dashboard



## Chart Bug
- [x] Points chart showing blank/empty - fixed by using correct field name 'totalPoints' instead of 'pointsEarned'
- [x] Updated both Child and Parent dashboard charts



## Parent Dashboard UI Improvements
- [x] Add close button to completed challenge cards so parents can dismiss them
- [x] Added dismissChallenge mutation and backend API
- [x] Improve Recent Quizzes format to show: "Quiz #450001 | Subject | Topics" instead of just quiz number
- [x] Updated getUserQuizHistory to include subject and module names



## Recent Quizzes Enhancement
- [x] Add completion date to Recent Quizzes format: "Quiz #450001 | Subject | Module | 29th Oct'25, 11:20 AM"



## Question Bank Metadata Enhancement
- [x] Add Board field (CBSE, ICSE, IB, State, Other) to questions table
- [x] Add Grade field to questions table
- [x] Add Topic field to questions table (in addition to existing Subject)
- [x] Add SubTopic field to questions table
- [x] Add Scope field (School, Olympiad, Competitive, Advanced) to questions table
- [x] Update database schema with new fields
- [x] Run database migration (pnpm db:push)
- [x] Provide revised JSON format for question generation (question-format.json)

