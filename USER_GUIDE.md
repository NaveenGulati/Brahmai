# ICSE Grade 7 Quiz Master - User Guide

## 🎯 Overview

This is a comprehensive quiz application designed to help your son excel in Grade 7 ICSE board exams and prepare for Olympiads. The application features gamification, progress tracking, and a complete question bank management system.

---

## 🌟 Key Features

### For Parents
- **Question Bank Management**: Add, edit, and delete questions across all subjects
- **Bulk Upload**: Upload multiple questions using JSON format
- **Progress Monitoring**: Track your child's performance, scores, and streaks
- **Module Management**: Organize questions by subjects and topics
- **Real-time Analytics**: View detailed statistics and quiz history

### For Children
- **Interactive Quizzes**: Timed quizzes with 10-15 questions per session
- **Multiple Question Types**: MCQ, True/False, Fill in the Blanks, Match, Image-based
- **Gamification**: 
  - Points system for correct answers
  - Daily streak tracking
  - Achievement badges
  - Progress visualization
- **Instant Feedback**: Detailed explanations for every answer
- **Subject Coverage**: All ICSE Grade 7 subjects including Spanish

---

## 📚 Subjects Covered

1. **Mathematics** 🔢 - Algebra, Geometry, Arithmetic
2. **Science** 🔬 - Physics, Chemistry, Biology
3. **English** 📚 - Grammar, Literature, Composition
4. **Social Studies** 🌍 - History, Geography, Civics
5. **Hindi** 🇮🇳 - व्याकरण, साहित्य
6. **Spanish** 🇪🇸 - Gramática, Vocabulario
7. **Computer Science** 💻 - Programming, Digital Literacy

---

## 🚀 Getting Started

### First Time Setup

1. **Sign In**: Click "Sign In to Continue" on the home page
2. **Role Assignment**: Your account will be set as "Parent" (first user)
3. **Create Child Account**: Currently managed through database (see below)

### Creating a Child Account

Since the child account creation UI requires additional setup, you can create a child account by running this SQL command:

```sql
INSERT INTO users (openId, name, email, role, parentId, grade, totalPoints, currentStreak, longestStreak)
VALUES ('child-unique-id', 'Your Son Name', 'child@email.com', 'child', 1, 7, 0, 0, 0);
```

Replace:
- `'child-unique-id'` with a unique identifier
- `'Your Son Name'` with your child's name
- `'child@email.com'` with an email (optional)
- `1` with your parent user ID (check the users table)

---

## 👨‍👩‍👧 Parent Dashboard Guide

### Managing Question Bank

1. **Select Subject**: Choose from the dropdown (Math, Science, English, etc.)
2. **Select Module**: Pick a specific topic (e.g., "Integers", "Algebra")
3. **Add Questions**:
   - Click "Add Question" button
   - Fill in question details
   - Select question type, difficulty level
   - Set points and time limit
   - Add explanation for learning

### Bulk Upload Questions (JSON Format)

Click "Bulk Upload (JSON)" and paste questions in this format:

```json
[
  {
    "questionType": "mcq",
    "questionText": "What is 2+2?",
    "options": ["2", "3", "4", "5"],
    "correctAnswer": "4",
    "explanation": "2+2 equals 4",
    "difficulty": "easy",
    "points": 10,
    "timeLimit": 60
  },
  {
    "questionType": "true_false",
    "questionText": "The Earth is flat.",
    "correctAnswer": "False",
    "explanation": "The Earth is spherical in shape.",
    "difficulty": "easy",
    "points": 10,
    "timeLimit": 30
  }
]
```

**Question Types:**
- `mcq` - Multiple Choice (requires `options` array)
- `true_false` - True/False
- `fill_blank` - Fill in the Blank
- `match` - Match the Following
- `image_based` - Image-based questions

**Difficulty Levels:**
- `easy` - Basic concepts
- `medium` - Standard ICSE level
- `hard` - Advanced problems
- `olympiad` - Olympiad preparation level

### Monitoring Child Progress

1. Go to "Child Progress" tab
2. View statistics:
   - Total quizzes taken
   - Average score percentage
   - Total points earned
   - Current streak (consecutive days)
3. Check recent quiz history with scores

### Creating Quiz Challenges

Assign specific quizzes to your child:

1. In the "Child Progress" tab, find your child's progress card
2. Click the **"🎯 Create Challenge"** button
3. Select the subject (e.g., Mathematics, Science)
4. Choose the specific module/topic
5. Click "Create Challenge" to assign

Your child will see a highlighted notification on their dashboard with a "Start Challenge" button.

### Resetting Child Password

If your child forgets their password:

1. Go to the "Child Progress" tab
2. Find your child's progress card
3. Click the **"🔑 Reset Password"** button
4. Enter a new password (minimum 4 characters)
5. Click "Reset Password" to confirm

Your child can immediately log in with the new password.

---

## 🎮 Child Dashboard Guide

### Responding to Challenges

When your parent assigns a challenge:

1. You'll see a **yellow notification banner** at the top of your dashboard
2. The banner shows "🎯 New Challenges from Your Parent!"
3. Read the challenge details (subject, module, due date)
4. Click **"Start Challenge 🚀"** to begin the quiz
5. Complete the quiz to mark the challenge as done

### Taking a Quiz

1. **Choose Subject**: Click on any subject card (Math, Science, etc.)
2. **Select Module**: Pick a topic you want to practice
3. **Start Quiz**: Click "Start Quiz" button
4. **Answer Questions**: 
   - Read each question carefully
   - Watch the timer (top right)
   - Select/type your answer
   - Click "Next Question" to submit
5. **View Results**: See your score, correct/wrong answers, points earned

### Understanding Your Stats

**Dashboard Overview:**
- **Total Points**: Cumulative points from all quizzes
- **Quizzes Taken**: Number of completed quizzes
- **Average Score**: Your overall performance percentage
- **Current Streak**: Consecutive days with quiz activity 🔥

### Achievements & Badges

Earn badges by:
- Completing your first quiz (First Steps - 50 pts)
- Scoring 100% (Perfect Score - 100 pts)
- Maintaining 7-day streak (Week Warrior - 150 pts)
- Answering 100 questions correctly (Century Club - 200 pts)
- Completing all modules in a subject (Subject Master - 300 pts)
- Speed + accuracy challenges (Speed Demon - 250 pts)
- Olympiad-level mastery (Olympiad Ready - 500 pts)

---

## 📊 Gamification System

### Points System

- **Easy questions**: 10 points
- **Medium questions**: 15 points
- **Hard questions**: 20 points
- **Olympiad questions**: 25 points

### Streak Tracking

- Practice daily to maintain your streak
- Longer streaks unlock special achievements
- Track your longest streak record

### Progress Visualization

- Real-time score percentages
- Subject-wise performance tracking
- Activity logs and history

---

## 💡 Tips for Parents

### Building an Effective Question Bank

1. **Start with Easy Questions**: Build confidence first
2. **Mix Difficulty Levels**: 40% easy, 30% medium, 20% hard, 10% olympiad
3. **Add Detailed Explanations**: Help your child learn from mistakes
4. **Use Real Exam Questions**: Reference ICSE textbooks and past papers
5. **Regular Updates**: Add new questions weekly to keep content fresh

### Sample Question Bank Structure

For each module, aim for:
- 20-30 easy questions (foundation building)
- 15-20 medium questions (exam preparation)
- 10-15 hard questions (challenging concepts)
- 5-10 olympiad questions (advanced preparation)

### Monitoring Strategy

- Check progress weekly
- Identify weak areas from quiz history
- Add more questions on topics with low scores
- Celebrate achievements and streaks

---

## 🎯 Tips for Students

### Maximizing Learning

1. **Practice Daily**: Maintain your streak for consistency
2. **Read Explanations**: Learn from every wrong answer
3. **Challenge Yourself**: Try harder difficulty levels gradually
4. **Time Management**: Practice completing quizzes within time limits
5. **Track Progress**: Monitor your improvement over time

### Study Strategy

- **Morning Practice**: Take one quiz before school
- **Evening Review**: Review explanations for wrong answers
- **Weekend Challenge**: Attempt olympiad-level questions
- **Subject Rotation**: Practice different subjects daily

---

## 🔧 Technical Details

### Current Sample Data

The application comes pre-loaded with:
- **7 Subjects** with icons and descriptions
- **14 Sample Modules** across Math, Science, and English
- **18 Sample Questions** for Mathematics modules
- **7 Achievements** to unlock

### Database Structure

- **Users**: Parent and child accounts with role-based access
- **Subjects**: ICSE Grade 7 subjects
- **Modules**: Topics within each subject
- **Questions**: Complete question bank with metadata
- **Quiz Sessions**: Tracks each quiz attempt
- **Achievements**: Badge system
- **Activity Log**: Daily practice tracking

---

## 📱 Access Information

**Development URL**: Available in your Manus dashboard

**Deployment**: Click the "Publish" button in Manus UI to deploy to production

**Authentication**: Managed through Manus OAuth system

---

## 🆘 Troubleshooting

### Common Issues

**Q: Child can't see any quizzes**
A: Make sure questions are added to the modules. Check that the module has active questions.

**Q: Quiz doesn't start**
A: Ensure the selected module has at least one question. Check browser console for errors.

**Q: Streak not updating**
A: Streaks update after completing a quiz. Make sure to finish the quiz completely.

**Q: Can't add questions**
A: Verify you're logged in as a parent. Check that subject and module are selected.

### Getting Help

For technical support or feature requests, contact Manus support at https://help.manus.im

---

## 🎓 Olympiad Preparation Tips

### Mathematics Olympiads
- Focus on problem-solving techniques
- Practice time-bound challenges
- Master fundamental concepts thoroughly
- Attempt olympiad-difficulty questions regularly

### Science Olympiads
- Understand concepts, don't just memorize
- Practice application-based questions
- Stay updated with current scientific developments
- Use diagrams and visual learning

### General Strategy
- Start with ICSE syllabus mastery (foundation)
- Gradually increase difficulty to olympiad level
- Regular practice is key (daily 15-20 minutes)
- Review and learn from mistakes

---

## 📈 Roadmap & Future Enhancements

Potential features to add:
- [ ] Leaderboards (compete with classmates)
- [ ] Timed challenges and tournaments
- [ ] PDF export of quiz results
- [ ] Mobile app version
- [ ] AI-generated questions
- [ ] Video explanations
- [ ] Parent-child messaging
- [ ] Study reminders and notifications

---

## 📝 Sample JSON for Bulk Upload

Here's a comprehensive example for uploading questions:

```json
[
  {
    "questionType": "mcq",
    "questionText": "What is the capital of India?",
    "options": ["Mumbai", "New Delhi", "Kolkata", "Chennai"],
    "correctAnswer": "New Delhi",
    "explanation": "New Delhi is the capital city of India, located in the National Capital Territory.",
    "difficulty": "easy",
    "points": 10,
    "timeLimit": 30
  },
  {
    "questionType": "fill_blank",
    "questionText": "The process by which plants make food is called _____.",
    "correctAnswer": "photosynthesis",
    "explanation": "Photosynthesis is the process by which green plants use sunlight to synthesize nutrients from carbon dioxide and water.",
    "difficulty": "medium",
    "points": 15,
    "timeLimit": 45
  },
  {
    "questionType": "true_false",
    "questionText": "Water boils at 100°C at sea level.",
    "correctAnswer": "True",
    "explanation": "At standard atmospheric pressure (sea level), water boils at exactly 100 degrees Celsius or 212 degrees Fahrenheit.",
    "difficulty": "easy",
    "points": 10,
    "timeLimit": 30
  }
]
```

---

## 🎉 Success Metrics

Track these indicators for your child's progress:
- **Consistency**: Daily login and quiz completion
- **Improvement**: Rising average scores over time
- **Coverage**: Attempting quizzes across all subjects
- **Mastery**: Achieving 80%+ scores consistently
- **Challenge**: Progressing to harder difficulty levels

---

## 📞 Support

For questions, issues, or feature requests:
- Visit: https://help.manus.im
- Check the troubleshooting section above
- Review the sample data and examples provided

---

**Good luck with your studies! Aim high and practice consistently! 🚀📚**

