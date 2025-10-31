# Multi-Tenant Platform Completion Plan

## Current Status
✅ **Completed:**
- Database schema with multi-tenant architecture (users, childProfiles, parentProfiles, teacherProfiles, qbAdminAssignments)
- Fixed 57 TypeScript errors from schema migration
- Google OAuth integration for parent login
- Logout redirect issue fixed
- Child Dashboard with quiz functionality
- Parent Dashboard (needs refactoring)

## Role Definitions

### 1. **Parent Role**
**Purpose:** Monitor children's progress and manage child accounts

**Capabilities:**
- Create and manage child accounts (username/password)
- View children's quiz history and performance
- View children's achievements and streaks
- Assign challenges to children
- View detailed progress analytics per child
- Reset child passwords

**Should NOT have:**
- ❌ Question bank management
- ❌ Bulk question upload
- ❌ Subject/module creation

---

### 2. **Child Role**
**Purpose:** Take quizzes and learn

**Capabilities:**
- Login with username/password (local auth)
- Browse subjects and modules
- Take quizzes (MCQ, True/False, Fill in Blanks, Match, Image-based)
- View quiz results and AI explanations
- Track points, streaks, achievements
- View leaderboard
- Accept challenges from parents/teachers
- Reattempt quizzes

**Already Implemented:** ✅ Child Dashboard fully functional

---

### 3. **QB Admin (Question Bank Admin) Role**
**Purpose:** Centrally manage the question bank for the entire platform

**Capabilities:**
- **Question Management:**
  - Add/edit/delete questions
  - Bulk upload questions (JSON format)
  - Set question metadata (board, grade, subject, module, difficulty, scope)
  - Add explanations and images to questions
  
- **Content Organization:**
  - Create and manage subjects
  - Create and manage modules
  - Organize questions by topics and subtopics
  - Set prerequisites for modules
  
- **Quality Control:**
  - Review and approve community-submitted questions
  - Mark questions as active/inactive
  - Track question usage statistics

**To Be Implemented:**
- [ ] QB Admin Dashboard
- [ ] Question CRUD operations (restricted to QB Admin)
- [ ] Subject/Module management UI
- [ ] Bulk upload interface
- [ ] Question review workflow

---

### 4. **Teacher Role**
**Purpose:** Manage classes and assign quizzes to students

**Capabilities:**
- **Class Management:**
  - Create and manage classes
  - Add students to classes
  - View class roster
  
- **Assignment Management:**
  - Assign quizzes to entire class or individual students
  - Set due dates for assignments
  - Create custom challenges
  
- **Progress Monitoring:**
  - View class-wide performance analytics
  - View individual student progress
  - Generate reports for parents
  
- **Limited Question Access:**
  - Browse question bank (read-only)
  - Create custom quizzes from existing questions
  - Cannot add/edit/delete questions (that's QB Admin's job)

**To Be Implemented:**
- [ ] Teacher Dashboard
- [ ] Class management UI
- [ ] Assignment creation and tracking
- [ ] Class analytics dashboard

---

### 5. **Super Admin Role**
**Purpose:** Platform administration and user management

**Capabilities:**
- Manage all users (parents, children, teachers, QB admins)
- Assign QB Admin role to users
- Assign Teacher role to users
- View platform-wide analytics
- System configuration

**To Be Implemented:**
- [ ] Super Admin Dashboard
- [ ] User role management
- [ ] Platform analytics

---

## Implementation Plan

### Phase 1: Refactor Question Bank Management ✅ CURRENT PHASE
**Goal:** Move question bank from Parent Dashboard to QB Admin role

**Tasks:**
1. [ ] Create `qbAdminProcedure` in tRPC (similar to `parentProcedure`)
2. [ ] Move question management procedures from `parent` router to new `qbAdmin` router:
   - `createQuestion`
   - `bulkUploadQuestions`
   - `deleteQuestionPermanent`
   - `getAllQuestions`
   - `getUniqueSubjects`
   - `getUniqueTopics`
3. [ ] Create QB Admin authentication/authorization checks
4. [ ] Remove QuestionBankManager component from ParentDashboard
5. [ ] Update database helper functions to check QB Admin permissions

**Estimated Time:** 2-3 hours

---

### Phase 2: Update Parent Dashboard
**Goal:** Simplify Parent Dashboard to focus on child monitoring

**New Features:**
1. [ ] **Child Account Management**
   - Create child accounts (already exists ✅)
   - View list of children with stats
   - Delete child accounts (already exists ✅)
   - Reset child passwords

2. [ ] **Progress Monitoring**
   - View each child's quiz history
   - View performance trends (charts)
   - View achievements and streaks
   - Compare performance across subjects

3. [ ] **Challenge Assignment**
   - Create custom challenges for children
   - Assign specific modules/subjects
   - Set point rewards
   - Track challenge completion

4. [ ] **Reports**
   - Generate PDF reports for each child
   - Weekly/monthly progress summaries
   - Export quiz history to CSV

**Remove:**
- ❌ Question Bank tab
- ❌ Bulk upload interface
- ❌ Question creation form

**Estimated Time:** 4-5 hours

---

### Phase 3: Create QB Admin Dashboard
**Goal:** Build centralized question bank management interface

**Features:**
1. [ ] **Dashboard Overview**
   - Total questions by subject
   - Total questions by difficulty
   - Recent uploads
   - Question usage statistics

2. [ ] **Question Management**
   - List all questions with filters (subject, grade, difficulty, scope)
   - Add new question form
   - Edit existing questions
   - Delete questions
   - Mark questions as active/inactive

3. [ ] **Bulk Upload**
   - JSON file upload interface
   - Validation and error reporting
   - Preview before import
   - Import history

4. [ ] **Subject & Module Management**
   - Create/edit/delete subjects
   - Create/edit/delete modules
   - Set module prerequisites
   - Organize module hierarchy

5. [ ] **Quality Control**
   - Review flagged questions
   - View question usage stats
   - Identify low-quality questions

**Estimated Time:** 6-8 hours

---

### Phase 4: Implement Teacher Dashboard
**Goal:** Enable teachers to manage classes and assignments

**Features:**
1. [ ] **Class Management**
   - Create classes
   - Add students (by username or invite code)
   - View class roster
   - Remove students

2. [ ] **Assignment Creation**
   - Browse question bank (read-only)
   - Create quiz assignments from questions
   - Set due dates
   - Assign to class or individual students

3. [ ] **Progress Tracking**
   - View class performance dashboard
   - View individual student progress
   - Track assignment completion
   - Generate class reports

4. [ ] **Communication**
   - Send announcements to class
   - Message individual students/parents

**Estimated Time:** 8-10 hours

---

### Phase 5: Implement Super Admin Dashboard
**Goal:** Platform administration and user management

**Features:**
1. [ ] **User Management**
   - List all users with filters
   - Assign roles (QB Admin, Teacher)
   - Deactivate users
   - View user activity logs

2. [ ] **Platform Analytics**
   - Total users by role
   - Total quizzes taken
   - Most popular subjects
   - User engagement metrics

3. [ ] **System Configuration**
   - Manage achievement definitions
   - Set point values
   - Configure leaderboard rules

**Estimated Time:** 4-5 hours

---

### Phase 6: Authentication & Authorization
**Goal:** Ensure proper access control for all roles

**Tasks:**
1. [ ] Create role-based route guards
2. [ ] Add QB Admin login page (or unified login with role detection)
3. [ ] Add Teacher login page
4. [ ] Update OAuth callback to redirect based on role
5. [ ] Add "Unauthorized" error pages
6. [ ] Test all role-based access controls

**Estimated Time:** 2-3 hours

---

### Phase 7: Testing & Polish
**Goal:** Ensure all workflows work end-to-end

**Tasks:**
1. [ ] Test parent workflow (create child → view progress → assign challenge)
2. [ ] Test child workflow (login → take quiz → view results)
3. [ ] Test QB Admin workflow (add questions → bulk upload → manage subjects)
4. [ ] Test teacher workflow (create class → assign quiz → view results)
5. [ ] Test super admin workflow (manage users → assign roles)
6. [ ] Fix any bugs discovered
7. [ ] Add loading states and error handling
8. [ ] Improve UI/UX based on testing

**Estimated Time:** 4-5 hours

---

## Database Changes Needed

### New Tables (Already Created ✅)
- `parentProfiles` ✅
- `childProfiles` ✅
- `teacherProfiles` ✅
- `qbAdminAssignments` ✅
- `classes` ✅
- `classEnrollments` ✅
- `assignments` ✅
- `challenges` ✅

### Schema Adjustments Needed
- [ ] Add `createdBy` field to `questions` table (FK to users, QB Admin who created it)
- [ ] Add `isActive` field to `questions` table (for soft delete)
- [ ] Add `usageCount` field to `questions` table (track how many times used)
- [ ] Add `lastUsedAt` field to `questions` table

---

## API Routes Structure

```
/api/trpc/
├── auth.*              # Authentication (me, logout)
├── child.*             # Child-specific operations
├── parent.*            # Parent-specific operations (NO question bank)
├── qbAdmin.*           # QB Admin operations (question bank management)
├── teacher.*           # Teacher operations (classes, assignments)
├── superadmin.*        # Super admin operations (user management)
└── public.*            # Public operations (leaderboard, etc.)
```

---

## UI Routes Structure

```
/                       # Home page (login options)
/child-login            # Child local auth login
/child                  # Child Dashboard ✅
/parent                 # Parent Dashboard (needs refactoring)
/qb-admin               # QB Admin Dashboard (to be created)
/teacher                # Teacher Dashboard (to be created)
/superadmin             # Super Admin Dashboard (to be created)
/quiz/:sessionId        # Quiz play interface ✅
/quiz-review/:sessionId # Quiz review interface ✅
```

---

## Priority Order

### High Priority (Must Have)
1. ✅ Fix TypeScript errors (DONE)
2. ✅ Google OAuth integration (DONE)
3. ✅ Logout redirect fix (DONE)
4. **Refactor question bank to QB Admin** ← NEXT
5. Update Parent Dashboard
6. Create QB Admin Dashboard

### Medium Priority (Should Have)
7. Implement Teacher Dashboard
8. Add challenge assignment feature
9. Add progress reports

### Low Priority (Nice to Have)
10. Super Admin Dashboard
11. Advanced analytics
12. Communication features

---

## Estimated Total Time
- **High Priority:** 15-20 hours
- **Medium Priority:** 15-18 hours
- **Low Priority:** 8-10 hours
- **Total:** 38-48 hours of development work

---

## Next Steps
1. Start with Phase 1: Refactor question bank management to QB Admin
2. Create QB Admin authentication and authorization
3. Move question management procedures to qbAdmin router
4. Update Parent Dashboard to remove question bank features
5. Create QB Admin Dashboard with question management UI

---

## Questions to Resolve
1. How should QB Admins be created? (Super Admin assigns role, or self-registration?)
2. Should teachers have limited question creation (for their own classes only)?
3. Should parents be able to create custom questions for their children only?
4. What level of analytics should each role have access to?

---

**Document Created:** December 2024
**Last Updated:** December 2024
**Status:** Planning Phase

