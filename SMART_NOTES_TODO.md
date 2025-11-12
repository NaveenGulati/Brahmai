# Smart Notes - Bugs & Enhancements TODO

## 🐛 CRITICAL BUGS (Priority 1 - Fix Immediately)

### ✅ FIXED
- [x] **Back to Dashboard 404 Error** - Fixed routing from `/child/dashboard` to `/child`
- [x] **Save to Notes Button Layout** - Improved spacing and made more compact
- [x] **Generate Audio Button** - Replaced text with speaker icon only

### 🔴 IN PROGRESS
- [ ] **Compact Note Cards with Headlines**
  - Generate smart headline from first 50-60 chars
  - Show 2-3 line preview with "..."
  - Click to expand full note inline
  - Change grid from 3 to 4 columns (lg:grid-cols-4)
  
- [ ] **AI Quiz Not Interactive**
  - Currently showing all answers immediately
  - Should be interactive quiz like main quiz page
  - User selects answer, then sees if correct/incorrect
  - Show explanation after answering

- [ ] **AI Quiz Difficulty Levels**
  - Generate 2 Easy, 2 Medium, 1 Hard questions
  - Show difficulty badge on each question
  - Match quiz page styling and functionality

- [ ] **Tag Cleanup - Auto Capitalize**
  - Convert all tags to proper case (Energy not energy)
  - Apply on manual tag creation
  - Apply on AI tag generation

- [ ] **Tag Deduplication**
  - Merge "Energy" and "energy" into one
  - Use AI for spelling correction (enrgy → Energy, energi → Energy)
  - Implement fuzzy matching for similar tags
  - Show suggestion dialog before merging

---

## 🎨 ENHANCEMENTS (Priority 2 - After Bugs Fixed)

### Rich Text Editor Improvements
- [ ] **Add Color & Highlight to Notes**
  - Currently only bold and italic
  - Add text color picker
  - Add background highlight color
  - Add underline, strikethrough

### AI Tags Auto-Generation
- [ ] **Auto-generate tags when note is created**
  - Generate tags automatically when child saves note
  - No need for separate "AI Tags" button
  - Show loading indicator during generation
  - Allow editing before final save

### Quiz Integration
- [ ] **Add AI Quiz Questions to Question Bank**
  - When AI generates 5 questions from note
  - Add them to quiz database
  - Use same metadata (subject, topic, sub-topic) as source note
  - Link to original note for reference

### Search Highlighting
- [ ] **Highlight search terms in note content**
  - Like Ctrl+F in browser or MS Word
  - Yellow highlight on matched text
  - Show match count (1 of 5, 2 of 5, etc.)
  - Next/Previous navigation buttons

### Smart Note Creation Flow
- [ ] **Auto Spell Correction on Create**
  1. Child clicks "Create Note"
  2. Child types content
  3. On save, run AI spell check
  4. Highlight corrections in different color
  5. Show "Accept Changes" button
  6. Then generate AI tags inline
  7. Allow tag modification before final save
  8. Save note with corrected text and tags

### UI Redesign - Subject/Topic Navigation
- [ ] **Add Left Sidebar with Subject Tree**
  - List all subjects for child's grade
  - Show note count in brackets: "Physics (12)"
  - Click subject → show topics list
  - Topics in display sequence order
  - Show note count per topic: "Energy (5)"
  - "All Subjects" at top showing total notes
  
- [ ] **Add Board & Grade to Subjects**
  - Create `board` and `grade` fields in subjects table
  - Default to "ICSE" and "Grade 7"
  - Add board/grade to child profile
  - Map child → applicable subjects
  - Filter subjects by child's board/grade

- [ ] **Right Pane - Filtered Notes**
  - Show notes matching selected subject/topic
  - Ordered by timestamp (descending)
  - Same card layout as current
  - Show all tags for filtered notes

### Quiz Bank Integration
- [ ] **AI Questions → Quiz Bank Workflow**
  - When user generates 5 questions from note
  - Extract subject, topic, sub-topic from note tags
  - Add metadata: book, author, school (TBD)
  - Add to quiz bank with proper categorization
  - OR: Show to parent/teacher for approval
  - Let parent/teacher check/uncheck AI questions
  - Include in syllabus boundary

---

## 📊 IMPLEMENTATION PRIORITY

### Sprint 1 (Current) - Critical Bugs
1. ✅ Back to Dashboard routing
2. ✅ Button layout fixes
3. 🔄 Compact note cards with expand
4. 🔄 Interactive AI Quiz
5. 🔄 Quiz difficulty levels
6. 🔄 Tag cleanup & deduplication

### Sprint 2 - Core Enhancements
1. Rich text color & highlight
2. Auto-generate tags on note creation
3. Search term highlighting
4. Spell correction workflow

### Sprint 3 - Major UI Redesign
1. Subject/Topic sidebar navigation
2. Board & Grade system
3. Child → Subject mapping
4. Filtered note views

### Sprint 4 - Quiz Integration
1. AI questions → Quiz bank
2. Metadata extraction
3. Parent/Teacher approval workflow
4. Syllabus boundary integration

---

## 🎯 TESTING CHECKLIST (After Bug Fixes)

### Routing & Navigation
- [ ] Back to Dashboard works from notes page
- [ ] My Smart Notes card works from dashboard
- [ ] No 404 errors anywhere

### Button Layout
- [ ] Save to Notes button visible and not cut off
- [ ] Generate Audio shows only speaker icon
- [ ] All buttons fit properly on mobile

### Note Cards
- [ ] Cards show headline + preview
- [ ] Click expands to full note
- [ ] 4 columns on large screens
- [ ] Responsive on mobile

### AI Quiz
- [ ] Shows questions one by one
- [ ] User can select answer
- [ ] Shows correct/incorrect after selection
- [ ] Shows explanation
- [ ] Difficulty levels displayed
- [ ] 2 Easy + 2 Medium + 1 Hard

### Tags
- [ ] Manual tags auto-capitalized
- [ ] No duplicate tags (Energy/energy)
- [ ] Spelling corrections suggested
- [ ] Tags merge correctly

---

## 💡 NOTES & DECISIONS

### Tag Cleanup Strategy
- Use AI (Manus LLM) for fuzzy matching
- Prompt: "Are these tags the same? Tag1: {tag1}, Tag2: {tag2}. Consider spelling variations."
- If confidence > 80%, suggest merge
- Show user dialog: "Merge 'enrgy' into 'Energy'? (3 notes affected)"

### AI Quiz Difficulty Prompt
```
Generate 5 multiple-choice questions from this note:
- 2 Easy questions (basic recall)
- 2 Medium questions (application/understanding)
- 1 Hard question (analysis/synthesis)

For each question, specify difficulty level.
```

### Compact Card Design
- Headline: First sentence or first 60 chars
- Preview: 2-3 lines with line-clamp-3
- Expand: Show full content inline with "Show Less" button
- Grid: `lg:grid-cols-4 md:grid-cols-3 grid-cols-1`

---

## 🚀 DEPLOYMENT STRATEGY

1. **Fix critical bugs** → Deploy → Test
2. **Fix remaining bugs** → Deploy → Test
3. **Implement enhancements** → Deploy → Test
4. **Major UI redesign** → Deploy → Test
5. **Quiz integration** → Deploy → Test

Each deployment should be tested thoroughly before moving to next phase.

---

**Last Updated:** November 12, 2025
**Status:** Sprint 1 (Bug Fixes) - 50% Complete
