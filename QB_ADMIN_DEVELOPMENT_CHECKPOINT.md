# QB Admin Development Checkpoint
**Date**: November 14, 2024  
**Branch**: `feature/qb-admin` (to be created from `main`)  
**Main Branch Last Commit**: `0ffca2e` - Performance: Disable image generation in simplification

---

## 🎯 Your Mission

Develop the **QB Admin** (Question Bank Administrator) module in a separate branch. This will allow QB Admins to manage questions, quizzes, and content for the BrahmAI platform.

---

## 📋 Project Overview

### What is BrahmAI?
BrahmAI is an AI-powered educational platform for ICSE Grade 7 students. It provides:
- **Adaptive Quizzes** with AI-generated explanations
- **Smart Notes** with automatic tagging and organization
- **Practice Questions** with difficulty progression
- **Audio Explanations** with natural TTS voices

### Current User Roles
1. **Child** - Students taking quizzes and making notes
2. **Parent** - Monitoring child's progress
3. **Teacher** - Managing students and content
4. **QB Admin** - Managing question bank (YOUR FOCUS)
5. **Superadmin** - Platform administration

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: TanStack Query (React Query)
- **API**: tRPC for type-safe client-server communication
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation

### Backend
- **Runtime**: Node.js 22
- **Framework**: Express.js
- **API**: tRPC v10
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Authentication**: Cookie-based sessions
- **File Storage**: AWS S3 (via custom storage module)
- **AI**: Manus Forge API (gemini-2.5-flash)
- **TTS**: Google Cloud Text-to-Speech (WaveNet)

### Infrastructure
- **Deployment**: Render.com (auto-deploy from GitHub)
- **Database**: Neon PostgreSQL (serverless)
- **Storage**: AWS S3
- **Version Control**: GitHub

---

## 📁 Project Structure

```
/home/ubuntu/Brahmai/
├── client/                    # Frontend React app
│   ├── src/
│   │   ├── pages/            # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── QuizReview.tsx
│   │   │   ├── MyNotes.tsx
│   │   │   └── ...
│   │   ├── components/       # Reusable components
│   │   ├── lib/             # Utilities
│   │   └── main.tsx         # Entry point
│   └── package.json
├── server/                   # Backend Node.js app
│   ├── _core/               # Core modules
│   │   ├── index.ts         # Main Express app & routes
│   │   ├── llm.ts           # Manus Forge API wrapper
│   │   ├── env.ts           # Environment variables
│   │   └── googleTTS.ts     # Text-to-speech
│   ├── routers.ts           # tRPC routers (parent/child/teacher)
│   ├── db.ts                # Database operations
│   ├── db-schema-notes.ts   # Notes schema
│   ├── async-note-processor.ts  # Background note processing
│   ├── adaptive-explanation.ts  # Simplification logic
│   └── ...
├── drizzle/                 # Database schema & migrations
│   └── schema.ts
├── shared/                  # Shared types between client/server
└── package.json
```

---

## 🗄️ Database Schema (Relevant Tables)

### Users Table
```typescript
{
  id: number (primary key)
  email: string
  username: string
  name: string
  role: 'parent' | 'child' | 'teacher' | 'qb_admin' | 'superadmin'
  passwordHash: string
  createdAt: timestamp
  lastSignedIn: timestamp
}
```

### Questions Table
```typescript
{
  id: number (primary key)
  questionText: string
  questionType: 'multiple_choice' | 'true_false' | 'short_answer'
  options: string[] (JSON)
  correctAnswer: string
  explanation: string
  subject: string (e.g., 'Physics', 'Chemistry')
  topic: string (e.g., 'Mechanics', 'Energy')
  difficulty: 'easy' | 'medium' | 'hard'
  grade: number (default: 7)
  createdBy: number (user id)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Quizzes Table
```typescript
{
  id: number (primary key)
  title: string
  description: string
  moduleId: number (foreign key)
  questionIds: number[] (JSON array)
  createdBy: number (user id)
  createdAt: timestamp
}
```

---

## 🔑 Authentication & Authorization

### How Authentication Works
1. **Cookie-based sessions** stored in `brahmai_session` cookie
2. Session contains: `{ userId, role, name, email }`
3. Middleware checks session for protected routes

### QB Admin Access
```typescript
// In routers.ts, you'll need to create:
const qbAdminProcedure = t.procedure.use(async ({ ctx, next }) => {
  const session = ctx.session;
  if (!session || session.role !== 'qb_admin') {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, session } });
});

// Then use it:
export const qbAdminRouter = t.router({
  getQuestions: qbAdminProcedure
    .input(z.object({ ... }))
    .query(async ({ input }) => {
      // Your logic here
    }),
});
```

---

## 🎨 UI Components Available

### From shadcn/ui
- `Button` - Various styles and sizes
- `Input` - Text inputs
- `Select` - Dropdowns
- `Dialog` - Modals
- `Table` - Data tables
- `Card` - Content containers
- `Tabs` - Tab navigation
- `Badge` - Status indicators
- `Toast` - Notifications (via sonner)
- `Form` - Form components with validation

### Custom Components
- `NotesHierarchySidebar` - Hierarchical tag navigation
- `RichTextEditor` - Tiptap-based editor

---

## 🚀 Development Workflow

### 1. Setup Your Environment
```bash
# Clone the repo (if not already done)
git clone https://github.com/NaveenGulati/Brahmai.git
cd Brahmai

# Create your feature branch from main
git checkout main
git pull origin main
git checkout -b feature/qb-admin

# Install dependencies
npm install

# Set up environment variables (ask for credentials)
# Create .env file with:
# - DATABASE_URL
# - OPENAI_API_KEY (Manus Forge)
# - GOOGLE_TTS_API_KEY
# - AWS credentials
```

### 2. Run Development Server
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend (if needed separately)
cd client && npm run dev

# Or run both together:
npm run dev
```

### 3. Build & Test
```bash
# Build both client and server
npm run build

# Check for TypeScript errors
npm run typecheck
```

### 4. Commit & Push
```bash
git add -A
git commit -m "feat(qb-admin): Your feature description"
git push origin feature/qb-admin
```

---

## 🎯 QB Admin Features to Implement

### Phase 1: Basic CRUD
- [ ] View all questions (with filters)
- [ ] Create new questions
- [ ] Edit existing questions
- [ ] Delete questions
- [ ] Bulk import questions (CSV/JSON)

### Phase 2: Quiz Management
- [ ] Create quizzes from questions
- [ ] Edit quiz metadata
- [ ] Assign quizzes to modules
- [ ] Preview quizzes

### Phase 3: Analytics
- [ ] Question performance metrics
- [ ] Usage statistics
- [ ] Difficulty analysis
- [ ] Tag management

### Phase 4: Advanced Features
- [ ] AI-assisted question generation
- [ ] Duplicate detection
- [ ] Version control for questions
- [ ] Collaborative editing

---

## 🔧 Key APIs & Utilities

### Manus Forge API (AI)
```typescript
import { invokeLLM } from './_core/llm';

const response = await invokeLLM({
  messages: [
    { role: 'system', content: 'You are a helpful teacher.' },
    { role: 'user', content: 'Explain photosynthesis.' }
  ]
});

const result = response.choices[0].message.content;
```

### Database Operations
```typescript
import { getDb } from './db';
import { questions } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

const db = await getDb();

// Select
const allQuestions = await db.select().from(questions);

// Insert
const [newQuestion] = await db
  .insert(questions)
  .values({ questionText: '...', ... })
  .returning();

// Update
await db
  .update(questions)
  .set({ questionText: 'Updated text' })
  .where(eq(questions.id, questionId));

// Delete
await db.delete(questions).where(eq(questions.id, questionId));
```

### File Upload (S3)
```typescript
import { storagePut } from './storage';

const buffer = Buffer.from(fileContent);
const { url } = await storagePut(
  `qb-admin/imports/${filename}`,
  buffer,
  'application/json'
);
```

---

## 📚 Important Files to Review

### Frontend
1. `client/src/pages/Dashboard.tsx` - Example of role-based routing
2. `client/src/pages/MyNotes.tsx` - Complex CRUD with filtering
3. `client/src/pages/QuizReview.tsx` - Quiz display and interactions

### Backend
1. `server/routers.ts` - tRPC router examples
2. `server/db.ts` - Database operation patterns
3. `server/_core/index.ts` - REST endpoints (if needed)

---

## 🎨 Design Guidelines

### Color Scheme
- **Primary**: Purple (`purple-600`, `purple-700`)
- **Secondary**: Pink (`pink-500`, `pink-600`)
- **Success**: Green (`green-600`)
- **Warning**: Orange (`orange-600`)
- **Error**: Red (`red-600`)
- **Info**: Blue (`blue-600`)

### Typography
- **Headings**: Font-bold, larger sizes
- **Body**: Font-normal, readable sizes
- **Code**: Font-mono

### Layout
- **Sidebar Navigation** (left) - For main sections
- **Content Area** (center) - Main workspace
- **Details Panel** (right, optional) - Additional info

---

## 🐛 Common Issues & Solutions

### Issue: tRPC Type Errors
**Solution**: Run `npm run build` to regenerate types

### Issue: Database Connection Fails
**Solution**: Check `DATABASE_URL` in `.env` and Neon dashboard

### Issue: CORS Errors
**Solution**: Backend already configured for CORS, check cookie settings

### Issue: Session Not Persisting
**Solution**: Ensure `COOKIE_NAME` constant is correct in `shared/const.ts`

---

## 📞 Getting Help

### Resources
- **tRPC Docs**: https://trpc.io/docs
- **Drizzle ORM**: https://orm.drizzle.team/docs
- **shadcn/ui**: https://ui.shadcn.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

### Code Patterns
Look at existing routers and pages for patterns:
- Parent router: `server/routers.ts` (lines 100-400)
- Child router: `server/routers.ts` (lines 700-1000)
- Notes CRUD: `client/src/pages/MyNotes.tsx`

---

## ✅ Pre-Development Checklist

Before you start coding:
- [ ] Clone/pull latest `main` branch
- [ ] Create `feature/qb-admin` branch
- [ ] Install dependencies (`npm install`)
- [ ] Set up `.env` file with credentials
- [ ] Run `npm run dev` to ensure everything works
- [ ] Review existing code patterns
- [ ] Plan your first feature (e.g., "View Questions" page)

---

## 🎯 Recommended First Task

**Create a basic "QB Admin Dashboard" page:**

1. **Frontend**: Create `client/src/pages/QBAdminDashboard.tsx`
   - Simple page with "Questions", "Quizzes", "Analytics" tabs
   - Use existing `Dashboard.tsx` as reference

2. **Backend**: Add QB Admin router in `server/routers.ts`
   - Create `qbAdminProcedure` middleware
   - Add basic `getStats` query

3. **Routing**: Add route in `client/src/main.tsx`
   - Protected route for `qb_admin` role

4. **Test**: Login as QB Admin and verify page loads

---

## 📊 Current Platform Status

### Recent Updates (Last 24 Hours)
- ✅ Async note creation (instant save + background processing)
- ✅ Hierarchical tag navigation (Topics/Sub-Topics)
- ✅ Automatic spelling correction
- ✅ Softer TTS voice (WaveNet)
- ✅ Disabled image generation (performance)
- ✅ Fixed note editing bugs

### Active Features
- Adaptive quizzes with AI explanations
- Smart notes with auto-tagging
- Practice questions with difficulty progression
- Audio explanations with natural voices
- Tag-based note filtering

### Known Issues
- None critical at the moment
- Image generation disabled (will re-enable later)

---

## 🚀 Ready to Start?

1. **Pull latest main**: `git checkout main && git pull origin main`
2. **Create your branch**: `git checkout -b feature/qb-admin`
3. **Start coding**: Begin with QB Admin Dashboard
4. **Commit often**: Small, focused commits
5. **Push regularly**: `git push origin feature/qb-admin`
6. **Merge when ready**: Create PR to merge into `main`

---

## 📝 Notes

- **Main branch** is actively maintained by another developer
- **Your branch** is isolated - no conflicts
- **Merge** will happen when QB Admin is complete
- **Communication** via commit messages and PR descriptions

---

**Good luck with QB Admin development! 🎉**

If you have questions, refer to existing code patterns or ask in your chat window.
