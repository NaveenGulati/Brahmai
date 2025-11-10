# Smart Notes Feature - Deployment Instructions

## 🚀 Overview

The Smart Notes feature has been fully developed and is ready for deployment. This document provides step-by-step instructions for deploying to production.

---

## ⚠️ Prerequisites

Before deploying, ensure you have:
1. Access to the production database (Neon PostgreSQL)
2. The database migration script ready
3. Git push access to trigger Render deployment

---

## 📋 Deployment Steps

### Step 1: Run Database Migration

The Smart Notes feature requires new database tables. Run the migration script on the production database.

**Option A: Using Neon Dashboard (Recommended)**
1. Go to https://console.neon.tech/
2. Select your Brahmai database
3. Open the SQL Editor
4. Copy and paste the contents of `migrations/create-smart-notes-tables.sql`
5. Click **Execute**
6. Verify all tables were created successfully

**Option B: Using psql**
```bash
psql "postgresql://neondb_owner:npg_Ki2cfdr3ETSY@ep-super-hall-a1obz0xf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -f migrations/create-smart-notes-tables.sql
```

**Tables Created:**
- `notes` - Stores user-highlighted text
- `tags` - Stores unique tag names (subject, topic, sub-topic)
- `note_tags` - Many-to-many relationship between notes and tags
- `generated_questions` - AI-generated practice questions
- `note_quiz_attempts` - Tracks user quiz performance

### Step 2: Push to Production

```bash
cd /home/ubuntu/Brahmai
git push origin main
```

This will trigger an automatic deployment on Render.

### Step 3: Monitor Deployment

1. Go to https://dashboard.render.com/
2. Select the **brahmai-quiz** service
3. Click on **Logs**
4. Watch for:
   - ✅ Build successful
   - ✅ Server started
   - ✅ No errors in logs

Expected deployment time: **3-5 minutes**

### Step 4: Verify Feature

After deployment completes:

1. **Test Text Highlighting:**
   - Log in as a child user
   - Take a quiz and view detailed explanation
   - Highlight some text - the "✨ Add to Notes" button should appear
   - Click to save a note
   - Verify toast notification appears

2. **Test My Notes Dashboard:**
   - Navigate to `/child/notes`
   - Verify the saved note appears
   - Test search functionality
   - Test subject/topic filters

3. **Test Question Generation:**
   - Click on a note to view details
   - Click "🧠 Generate Practice Questions"
   - Wait for AI to generate 5 questions
   - Take the mini-quiz
   - Verify immediate feedback and explanations work

---

## 🔍 Testing Checklist

- [ ] Database migration completed successfully
- [ ] Deployment completed without errors
- [ ] Text highlighting works in quiz explanations
- [ ] Notes are saved to database
- [ ] AI generates topic/sub-topic tags correctly
- [ ] My Notes dashboard displays all notes
- [ ] Search and filters work correctly
- [ ] Question generation creates 5 relevant questions
- [ ] Mini-quiz interface works properly
- [ ] Quiz results are recorded

---

## 🐛 Troubleshooting

### Issue: "Database not available" error
**Solution:** Check that the database migration completed successfully and all tables exist.

### Issue: AI services not working
**Solution:** Verify that `OPENAI_API_KEY` is set in Render environment variables.

### Issue: Routes not found (404 errors)
**Solution:** Clear browser cache and hard refresh (Ctrl+Shift+R). The frontend may be cached.

### Issue: Notes not appearing in dashboard
**Solution:** Check browser console for errors. Verify the tRPC router is properly mounted in `routers.ts`.

---

## 💰 Cost Monitoring

The Smart Notes feature uses AI services. Monitor usage to keep costs low:

1. **AI Indexing:** Runs once per note (cached in database)
2. **Question Generation:** Runs once per note (cached in database)
3. **Model Used:** `gpt-4.1-mini` (most cost-effective)

**Expected Costs:**
- Note indexing: ~$0.0001 per note
- Question generation: ~$0.001 per note
- For 1000 notes: ~$1.10 total

---

## 📊 Monitoring & Analytics

After deployment, monitor:
1. **Note Creation Rate:** How many notes are students saving?
2. **Question Generation Usage:** How many students are using the quiz feature?
3. **Quiz Performance:** Average scores on generated quizzes
4. **AI Service Costs:** Track OpenAI API usage

Access analytics via:
```sql
-- Total notes created
SELECT COUNT(*) FROM notes;

-- Notes by subject
SELECT t.name, COUNT(*) 
FROM notes n
JOIN note_tags nt ON n.id = nt."noteId"
JOIN tags t ON nt."tagId" = t.id
WHERE t.type = 'subject'
GROUP BY t.name;

-- Quiz attempts and average scores
SELECT 
  AVG(score::float / "totalQuestions") * 100 as avg_score_percentage,
  COUNT(*) as total_attempts
FROM note_quiz_attempts;
```

---

## 🎯 Success Metrics

Track these metrics to measure feature success:
1. **Adoption Rate:** % of students who save at least one note
2. **Engagement:** Average notes per active user
3. **Quiz Usage:** % of notes that generate practice quizzes
4. **Learning Outcomes:** Correlation between note-taking and quiz scores

---

## 🔄 Rollback Plan

If critical issues occur:

```bash
cd /home/ubuntu/Brahmai
git revert 70b4eba
git push origin main
```

Then drop the new tables (if needed):
```sql
DROP TABLE IF EXISTS note_quiz_attempts CASCADE;
DROP TABLE IF EXISTS generated_questions CASCADE;
DROP TABLE IF EXISTS note_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
```

---

## 📝 Post-Deployment Tasks

1. ✅ Announce the new feature to users
2. ✅ Create a tutorial video showing how to use Smart Notes
3. ✅ Monitor user feedback and bug reports
4. ✅ Track AI service costs daily for the first week
5. ✅ Gather analytics on feature usage

---

## 🎉 Feature Highlights

**For Students:**
- Effortless note-taking with text highlighting
- AI automatically organizes notes by topic
- Practice quizzes generated from their own notes
- Personal knowledge base that grows with them

**For Parents/Teachers:**
- Insights into what concepts students focus on
- Track note-taking habits and quiz performance
- Encourage active learning and self-testing

**For the Platform:**
- Increased engagement and time on platform
- Differentiation from competitors
- Foundation for future features (spaced repetition, sharing, etc.)

---

## 🚀 Ready to Deploy!

All code is committed and ready. Just run the database migration and push to production!
