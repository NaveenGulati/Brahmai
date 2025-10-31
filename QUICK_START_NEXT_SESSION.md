# ⚡ Quick Start for Next Session

## 🎯 Immediate Goal
Fix remaining 57 TypeScript errors to get the multi-tenant platform fully functional.

## 🚀 Start Here

### 1. Read Context (2 minutes)
```bash
# Read these files in order:
1. HANDOFF_NEXT_SESSION.md (comprehensive context)
2. PLATFORM_ANALYSIS.md (strategic vision)
3. MIGRATION_STRATEGY.md (what changed)
4. todo.md (task tracking)
```

### 2. Understand Current State (1 minute)
- ✅ Database: 30+ tables, fully seeded
- ✅ Backend: 70% complete, 57 TypeScript errors remaining
- ⚪ Frontend: Not updated yet
- 🎯 Server: Running at https://3000-ic9iv0eso9t5lb1xe42db-e86e9bcc.manus-asia.computer

### 3. Fix TypeScript Errors (30-60 minutes)

#### Quick Win: Fix aiExplanationCache (Fixes ~40 errors)
```typescript
// In server/routers.ts, lines 508-514 and 1131-1137
// Current (broken):
await database.insert(aiExplanationCache).values({
  questionId: input.questionId,
  detailedExplanation: explanation,
  timesUsed: 1,
  generatedAt: new Date(),
  lastUsedAt: new Date(),
});

// Fix Option 1 (quickest):
await database.insert(aiExplanationCache).values({
  questionId: input.questionId,
  detailedExplanation: explanation,
  timesUsed: 1,
  generatedAt: new Date(),
  lastUsedAt: new Date(),
} as any);

// Fix Option 2 (better):
import { sql } from 'drizzle-orm';
await database.execute(sql`
  INSERT INTO aiExplanationCache (questionId, detailedExplanation, timesUsed, generatedAt, lastUsedAt)
  VALUES (${input.questionId}, ${explanation}, 1, NOW(), NOW())
  ON DUPLICATE KEY UPDATE 
    timesUsed = timesUsed + 1,
    lastUsedAt = NOW()
`);
```

#### Fix Remaining Errors (~17 errors)
```bash
# Check TypeScript errors
cd /home/ubuntu/grade7-quiz-app
pnpm run type-check 2>&1 | tee typescript-errors.txt

# Most common issues:
# 1. Input schema missing fields (boardId, gradeId, subjectId)
# 2. Function signature mismatches
# 3. Missing imports
```

### 4. Test Core Functionality (15 minutes)
```bash
# 1. Check server is running
curl http://localhost:3000/api/trpc/auth.me

# 2. Test database connection
npx tsx -e "import { getDb } from './server/db'; getDb().then(db => console.log('DB OK'));"

# 3. Open in browser
# https://3000-ic9iv0eso9t5lb1xe42db-e86e9bcc.manus-asia.computer
```

### 5. Update Frontend (1-2 hours)
Once TypeScript errors are fixed, update these components:
- `client/src/pages/ParentDashboard.tsx` - Add child account management
- `client/src/pages/ChildDashboard.tsx` - Update for new schema
- `client/src/pages/QuizPlay.tsx` - Use childId instead of userId
- `client/src/pages/QuizReview.tsx` - Update data fetching

## 📝 Commands You'll Need

```bash
# Development
pnpm run dev              # Start dev server
pnpm run type-check       # Check TypeScript errors

# Database
pnpm db:push              # Push schema changes
npx tsx scripts/seed.ts   # Re-seed database
pnpm drizzle-kit studio   # Open database UI

# Debugging
tail -f /tmp/w*           # Watch server logs
grep -r "PATTERN" server/ # Search code
```

## 🎓 Key Concepts

### Multi-Tenant Architecture
- **Parent** creates and manages **Child** accounts
- **Teacher** can be assigned to multiple **Children**
- **SuperAdmin** manages platform
- **QB Admin** manages question bank
- Each role has specific permissions and data access

### Database Changes
- `users` table → role-based (parent, child, teacher, superadmin, qb_admin)
- New `childProfiles` table → child-specific data (points, streaks)
- New `parentProfiles` table → parent-specific data
- New `teacherProfiles` table → teacher-specific data
- New `teacherStudentAssignments` → links teachers to children with subjects

### Performance Optimizations
- Selective field fetching
- Efficient joins
- Batch operations
- Pagination built-in
- Connection pooling ready

## ⚠️ Important Notes

1. **Don't regenerate schema** - It's already perfect
2. **Don't drop database** - Seed data is good
3. **Focus on TypeScript fixes first** - Server runs despite errors
4. **Test incrementally** - Fix, test, fix, test
5. **User wants bug-free code** - Quality over speed

## 🎯 Success Criteria

### Phase 1 (This Session)
- [ ] 0 TypeScript errors
- [ ] Server compiles cleanly
- [ ] Parent can create child account
- [ ] Child can take a quiz
- [ ] Data isolation verified

### Phase 2 (Next Session)
- [ ] Teacher dashboard built
- [ ] Teacher-student assignment working
- [ ] SuperAdmin dashboard built
- [ ] QB Admin question management working

## 🔗 Useful File Locations

```
Key Files:
├── drizzle/schema.ts              # Database schema (30+ tables)
├── server/db.ts                   # Database helpers (1076 lines)
├── server/routers.ts              # API endpoints (1200+ lines, has errors)
├── scripts/seed.ts                # Seed data script
├── HANDOFF_NEXT_SESSION.md        # Detailed context
├── PLATFORM_ANALYSIS.md           # Strategic vision
└── todo.md                        # Task tracking

Frontend (needs updates):
├── client/src/pages/ParentDashboard.tsx
├── client/src/pages/ChildDashboard.tsx
├── client/src/pages/QuizPlay.tsx
└── client/src/pages/QuizReview.tsx
```

## 💬 User Preferences

- Values **clean, optimized code**
- Wants **bug-free** implementation
- Prefers **performance-first** approach
- Doesn't want **rework** - build it right the first time
- Willing to **invest time** for quality
- Plans to onboard **50 families** soon

## 🚨 If You Get Stuck

1. **Check HANDOFF_NEXT_SESSION.md** for detailed context
2. **Read the error message carefully** - TypeScript is usually right
3. **Check db.ts** - Function might not exist or have wrong signature
4. **Look at schema.ts** - Verify field names and types
5. **Test in isolation** - Comment out broken code, test piece by piece

## ✅ Pre-Flight Checklist

Before starting, verify:
- [ ] Read HANDOFF_NEXT_SESSION.md
- [ ] Understand multi-tenant architecture
- [ ] Know where TypeScript errors are (routers.ts)
- [ ] Have dev server URL handy
- [ ] Ready to test incrementally

---

**Ready to go! Start with fixing the aiExplanationCache errors - that's the biggest blocker.**

Good luck! 🚀

