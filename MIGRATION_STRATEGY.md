# Database Migration Strategy: Single-Tenant → Multi-Tenant

## Current State
- Single parent-child relationship model
- User fields: `grade`, `totalPoints`, `currentStreak`, `longestStreak`, `lastActivityDate`, `parentId`
- Simple role enum: `user`, `admin`, `parent`, `child`

## Target State
- Multi-tenant platform with Parent-Child-Teacher-SuperAdmin-QB_Admin roles
- Separated profile tables: `parentProfiles`, `childProfiles`, `teacherProfiles`
- Grade progression tracking
- Teacher-student assignments
- Board-Grade-Subject hierarchy

## Migration Steps

### Option A: Fresh Start (Recommended for Development)
Since we're transforming the platform architecture and have limited production data:

1. **Backup existing data**
   ```sql
   -- Export current users, quiz sessions, questions
   SELECT * FROM users INTO OUTFILE '/tmp/users_backup.csv';
   SELECT * FROM quizSessions INTO OUTFILE '/tmp/sessions_backup.csv';
   SELECT * FROM questions INTO OUTFILE '/tmp/questions_backup.csv';
   ```

2. **Drop and recreate database**
   ```bash
   # This will create all new tables with correct schema
   pnpm drizzle-kit push --force
   ```

3. **Seed master data**
   - Boards (CBSE, ICSE, IB, State boards)
   - Grades (1-12)
   - Subjects (Math, Science, English, etc.)
   - Board-Grade-Subject mappings

4. **Migrate existing data**
   - Transform old `users` → new `users` + `childProfiles`/`parentProfiles`
   - Update `questions` with new boardId/gradeId/subjectId
   - Preserve quiz history

### Option B: Incremental Migration (For Production)
If we had significant production data to preserve:

1. Create new tables alongside old ones
2. Dual-write to both schemas during transition
3. Migrate data in batches
4. Switch over and drop old tables

## Data Transformation Logic

### Users Table Migration
```typescript
// Old user record
{
  id: 1,
  role: "parent",
  name: "Naveen",
  email: "naveen@example.com",
  ...
}

// Transforms to:
users: {
  id: 1,
  role: "parent",
  name: "Naveen",
  email: "naveen@example.com",
  ...
}
parentProfiles: {
  userId: 1,
  phone: null,
  timezone: "Asia/Kolkata",
  ...
}

// Old child record
{
  id: 2,
  role: "child",
  name: "Riddhansh",
  parentId: 1,
  grade: 7,
  totalPoints: 320,
  currentStreak: 2,
  ...
}

// Transforms to:
users: {
  id: 2,
  role: "child",
  name: "Riddhansh",
  username: "Riddhu",
  ...
}
childProfiles: {
  userId: 2,
  parentId: 1,
  currentGrade: 7,
  board: "ICSE",
  totalPoints: 320,
  currentStreak: 2,
  ...
}
gradeHistory: {
  childId: 2,
  grade: 7,
  board: "ICSE",
  startDate: "2024-04-01",
  endDate: null, // Current grade
  academicYear: "2024-25"
}
```

### Questions Table Migration
```typescript
// Old question
{
  id: 30001,
  moduleId: 1,
  board: "ICSE",
  grade: 7,
  subject: "Physics",
  ...
}

// Transforms to:
{
  id: 30001,
  moduleId: 1,
  boardId: 2, // ICSE board ID from boards table
  gradeId: 7, // Grade 7 ID from grades table
  subjectId: 5, // Physics ID from subjects table
  status: "approved", // Existing questions auto-approved
  submittedBy: 1, // SuperAdmin user ID
  ...
}
```

## Seed Data Required

### 1. Boards
```sql
INSERT INTO boards (code, name, country, displayOrder) VALUES
('CBSE', 'Central Board of Secondary Education', 'India', 1),
('ICSE', 'Indian Certificate of Secondary Education', 'India', 2),
('IB', 'International Baccalaureate', 'International', 3),
('STATE_UP', 'Uttar Pradesh State Board', 'India', 4),
('STATE_MH', 'Maharashtra State Board', 'India', 5);
```

### 2. Grades
```sql
INSERT INTO grades (level, name, displayOrder) VALUES
(1, 'Grade 1', 1),
(2, 'Grade 2', 2),
...
(12, 'Grade 12', 12);
```

### 3. Subjects
```sql
INSERT INTO subjects (name, code, category, icon, color, displayOrder) VALUES
('Mathematics', 'MATH', 'core', '🔢', '#3B82F6', 1),
('Physics', 'PHY', 'core', '⚛️', '#8B5CF6', 2),
('Chemistry', 'CHEM', 'core', '🧪', '#10B981', 3),
('Biology', 'BIO', 'core', '🧬', '#F59E0B', 4),
('English', 'ENG', 'language', '📚', '#EF4444', 5),
('Hindi', 'HIN', 'language', '🇮🇳', '#F97316', 6),
('History', 'HIST', 'core', '📜', '#6366F1', 7),
('Geography', 'GEO', 'core', '🌍', '#14B8A6', 8),
('Computer Science', 'CS', 'elective', '💻', '#06B6D4', 9);
```

### 4. Board-Grade-Subject Mappings
```sql
-- ICSE Grade 7 subjects
INSERT INTO boardGradeSubjects (boardId, gradeId, subjectId, isCompulsory, displayOrder)
SELECT 
  (SELECT id FROM boards WHERE code = 'ICSE'),
  (SELECT id FROM grades WHERE level = 7),
  id,
  true,
  displayOrder
FROM subjects
WHERE code IN ('MATH', 'PHY', 'CHEM', 'BIO', 'ENG', 'HIST', 'GEO');
```

## Post-Migration Tasks

1. **Create SuperAdmin account**
   ```sql
   INSERT INTO users (email, name, role, isActive) 
   VALUES ('admin@brahmai.ai', 'Platform Admin', 'superadmin', true);
   ```

2. **Assign QB Admin rights to existing parent**
   ```sql
   -- Give Naveen QB Admin rights for all ICSE Grade 7 content
   INSERT INTO qbAdminAssignments (userId, boardId, gradeId, subjectId, canCreate, canEdit, assignedBy)
   SELECT 
     1, -- Naveen's user ID
     (SELECT id FROM boards WHERE code = 'ICSE'),
     (SELECT id FROM grades WHERE level = 7),
     NULL, -- All subjects
     true,
     true,
     (SELECT id FROM users WHERE role = 'superadmin' LIMIT 1);
   ```

3. **Update existing modules with board/grade**
   ```sql
   UPDATE modules 
   SET 
     boardId = (SELECT id FROM boards WHERE code = 'ICSE'),
     gradeId = (SELECT id FROM grades WHERE level = 7)
   WHERE boardId IS NULL;
   ```

## Rollback Plan

If migration fails:
1. Restore from backup SQL dump
2. Revert schema.ts to previous version
3. Run `pnpm db:push` to restore old schema

## Testing Checklist

After migration:
- [ ] Existing parent can login
- [ ] Existing child can login
- [ ] Quiz history preserved
- [ ] Questions still accessible
- [ ] Points and streaks maintained
- [ ] New user registration works
- [ ] Teacher registration works
- [ ] Teacher-student assignment works
- [ ] QB Admin can create questions
- [ ] SuperAdmin can approve questions

## Timeline

- **Phase 1 (Now):** Schema design + TypeScript fixes
- **Phase 2 (Next):** Seed data scripts
- **Phase 3 (Then):** Migration execution
- **Phase 4 (After):** Data validation + testing

