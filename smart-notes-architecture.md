## Smart Notes Feature: Core Architecture & User Flow

This document outlines the initial plan for the Smart Notes feature, designed to be a Unique Selling Proposition (USP) for the Brahmai platform. The goal is to create a powerful, engaging, and child-friendly tool that enhances learning and justifies a premium subscription.

### 1. Core User Stories

- **As a child, I want to select and save important parts of an explanation** so that I can easily review them later without reading the whole text again.
- **As a child, I want my saved notes to be automatically organized by subject and topic** so I can find what I need quickly when studying for a test.
- **As a child, I want to test my understanding of a specific note** by generating a few practice questions related to it.
- **As a child, I want to see all my notes in a dedicated, easy-to-use "My Notes" section** where I can browse, search, and manage my saved information.
- **As a parent/teacher, I want to view my child's notes** to understand what concepts they find important or are focusing on.

### 2. High-Level Feature Architecture

The feature will be built on three main pillars: a seamless frontend experience, a robust backend, and intelligent AI services.

| Component | Technology | Responsibilities |
| :--- | :--- | :--- |
| **Frontend** | React / Next.js | - Text highlighting UI/UX<br>- "My Notes" dashboard<br>- Note viewing and question generation interface<br>- Communication with backend APIs |
| **Backend** | Node.js / tRPC | - API endpoints for creating, reading, updating, and deleting notes<br>- Database management (storing notes, tags, questions)<br>- Securely calling AI services for indexing and question generation |
| **AI Services** | OpenAI / Gemini | - **Indexing:** Analyze a note's content to generate subject, topic, and sub-topic tags.<br>- **Question Generation:** Create 5 relevant, in-syllabus questions based on the note's content and the original question's context. |

### 3. Data & User Flow

The user journey will be designed to be intuitive and integrated directly into the existing quiz review workflow.

**Step 1: Highlighting & Saving a Note**
1.  The child is on the `QuizReview` page, viewing an explanation.
2.  They use their mouse to select a piece of text they find important.
3.  Upon text selection, a small, non-intrusive pop-up appears with a single button: **"✨ Add to Notes"**.
4.  The child clicks the button.
5.  **[FE]** The frontend sends the `highlightedText`, `questionId`, and `subject` to the backend.
6.  **[BE]** The backend receives the request and saves the `highlightedText` to a new `notes` table, linking it to the `userId` and `questionId`.
7.  **[BE → AI]** The backend asynchronously calls the AI service with the `highlightedText` and `subject` to generate index tags (e.g., `subject: "Physics"`, `topic: "Energy"`, `subTopic: "Energy Transformation"`).
8.  **[BE]** The AI-generated tags are saved to a `note_tags` table and linked to the new note.
9.  **[FE]** The frontend shows a confirmation toast: **"Note saved to your collection! 🚀"**

**Step 2: Reviewing Notes**
1.  The child navigates to a new "My Notes" section from the main dashboard.
2.  The page displays all their notes, organized beautifully with the AI-generated tags.
3.  The child can filter notes by subject, topic, or search by keyword.

**Step 3: Generating Practice Questions**
1.  The child clicks on a specific note to view it in detail.
2.  On the note view page, there is a prominent button: **"🧠 Generate Practice Questions"**.
3.  The child clicks the button.
4.  **[FE]** The frontend sends the `noteId` to the backend.
5.  **[BE → AI]** The backend retrieves the note content and the original question context. It calls the AI service with a carefully crafted prompt to generate 5 multiple-choice questions that are **strictly within the Grade 7 ICSE syllabus** and directly related to the note.
6.  **[BE]** The generated questions are saved to the database.
7.  **[FE]** The questions are displayed to the child in an interactive mini-quiz format.

This flow creates a seamless loop: **Learn → Save → Review → Test**, which is a powerful educational paradigm and a strong justification for a premium subscription.
