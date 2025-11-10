> # Brahmai: The Smart Notes Engine
> ## Feature Specification & Implementation Plan

---

**Project:** Smart Notes - An AI-Powered Personal Knowledge Base  
**Author:** Manus AI  
**Status:** Design & Planning  
**Date:** November 10, 2025

---

### **1. Introduction: The Vision for a Killer Feature**

The request was to transform a simple user suggestion—emailing a highlighted explanation—into a core, subscription-driving Unique Selling Proposition (USP). The **Smart Notes** feature is the answer to that challenge. It is designed to be more than just a bookmarking tool; it is an intelligent, personal knowledge engine that empowers students to actively engage with content and master concepts through a seamless cycle of **Learn → Save → Review → Test**.

This document provides a comprehensive outline for the design, user experience, architecture, and implementation of the Smart Notes feature, conceived to be so valuable that it becomes a primary reason for users to subscribe to Brahmai Pro.

### **2. The Core User Experience: Making Learning Sticky**

The entire user experience is engineered to be intuitive, rewarding, and deeply integrated into the existing platform, making it feel like a natural extension of the learning process.

#### **2.1. User Stories: The Foundation**

-   **As a child, I want to** select and save important parts of an explanation so I can easily review them later.
-   **As a child, I want** my saved notes to be automatically organized by subject and topic so I can find what I need quickly.
-   **As a child, I want to** test my understanding of a specific note by generating a few practice questions related to it.
-   **As a child, I want to** see all my notes in a dedicated, easy-to-use "My Notes" section.
-   **As a parent/teacher, I want to** view my child's notes to understand what concepts they are focusing on.

#### **2.2. The Highlighting & Saving Flow**

This is the first touchpoint, designed to be an effortless and satisfying micro-interaction.

1.  **Select Text:** While reviewing a quiz explanation, the child highlights any text.
2.  **Contextual Button:** A small, friendly button (`✨ Add to Notes`) instantly appears above the selection.
3.  **Save Action:** Upon clicking, the text shimmers, and a confirmation toast appears: **"Note saved to your Physics notes! 🚀"**, with an optional "View All Notes" button.

This immediate, positive feedback loop encourages active reading and curation of knowledge.

#### **2.3. The "My Notes" Dashboard: A Personal Knowledge Wall**

This is the child's personal library, designed for easy discovery and review.

-   **Layout:** A clean, two-column design with a "Control Center" on the left and a "Note Wall" on the right.
-   **Control Center:** Features a prominent search bar and AI-powered "Smart Filters" for `Subject`, `Topic`, and `Sub-Topic`.
-   **Note Wall:** Displays notes as visually appealing "Note Cards." Each card shows a content snippet, colorful AI-generated tags, a link back to the source question, and a friendly timestamp (`Saved 2 days ago`).

#### **2.4. The Mini-Quiz: Turning Review into Active Recall**

This is the core of the feature's learning power, transforming passive review into active self-testing.

1.  **Generate Questions:** From a specific note's detail view, the child clicks a large, enticing button: `🧠 Ready to test yourself? Generate Practice Questions!`
2.  **Engaging Loader:** A fun loading animation appears with messages like `Building your quiz...` and `Making it challenging, but fair...`
3.  **Interactive Quiz:** A focused, one-question-at-a-time interface is presented with immediate feedback for each answer.
4.  **Celebration:** A results screen provides a score (`You got 4 out of 5 correct!`) and gamified rewards (`+50 XP!`), reinforcing the sense of accomplishment.

### **3. Technical Architecture & Implementation**

The system is designed with a modern tech stack for scalability and robustness.

#### **3.1. High-Level System Design**

| Component | Technology | Responsibilities |
| :--- | :--- | :--- |
| **Frontend** | React / Next.js | - Text highlighting UI/UX<br>- "My Notes" dashboard<br>- Note viewing and question generation interface<br>- Communication with backend APIs |
| **Backend** | Node.js / tRPC | - API endpoints for CRUD operations on notes<br>- Database management<br>- Securely calling AI services |
| **AI Services** | OpenAI / Gemini | - **Indexing:** Analyze note content to generate `subject`, `topic`, and `subTopic` tags.<br>- **Question Generation:** Create 5 relevant, in-syllabus questions from a note. |

#### **3.2. Database Schema**

Four new tables will be created to support this feature:

1.  `notes`: Stores the core note content, linked to the `userId` and source `questionId`.
2.  `tags`: Stores unique tag names and types (`subject`, `topic`, `subTopic`).
3.  `note_tags`: A join table linking notes and tags in a many-to-many relationship.
4.  `generated_questions`: Stores the AI-generated quizzes, linked to the source `noteId`.

#### **3.3. Backend API (tRPC Procedures)**

-   `notes.create`: Saves a new note and triggers the asynchronous AI indexing job.
-   `notes.list`: Fetches and filters a user's notes with their associated tags.
-   `notes.generateQuestions`: Retrieves a note, calls the AI service to generate questions, and saves them to the database.

#### **3.4. AI Service Prompts**

The success of the AI features hinges on highly-constrained and well-engineered prompts.

-   **AI Indexing Prompt:** Instructs the AI to act as an expert academic indexer, analyzing text to extract a `topic` and `subTopic` and return them in a strict JSON format.
-   **AI Question Generation Prompt:** A heavily constrained prompt that forces the AI to act as a Grade 7 ICSE curriculum expert. It uses the note's content and the original question's context to generate 5 relevant, in-syllabus multiple-choice questions, returned in a strict JSON array format.

### **4. The USP & Monetization Strategy**

This feature is the perfect vehicle for driving subscriptions. The strategy is to offer a compelling taste of the feature for free, gating the most powerful capabilities behind a Pro plan.

-   **Free Tier:**
    -   Can save a maximum of **5 notes**.
    -   The "Generate Practice Questions" button is visible but **disabled**, acting as a constant, non-intrusive call-to-action.
    -   An upgrade modal appears upon attempting to save the 6th note.

-   **Pro Tier (The "Happily Paid" Subscription):**
    -   **Unlimited** note saving.
    -   **Unlimited** AI-powered question generation.
    -   Access to all future Smart Notes enhancements.

This model allows users to experience the organizational value for free, but they must upgrade to unlock the active learning loop, which is the feature's true power.

### **5. Future Enhancements: Building the Moat**

To ensure Smart Notes remains a strong USP, a roadmap of future enhancements will be planned.

-   **Spaced Repetition System (SRS):** Automatically remind students to review notes at scientifically optimized intervals to maximize long-term retention.
-   **Parent/Teacher Dashboard Integration:** Allow parents and teachers to see which concepts a child is saving most often, providing insight into their learning journey.
-   **Note Sharing & Collaboration:** Allow students to share their notes with friends or in study groups.
-   **Rich Media Notes:** Expand beyond text to allow highlighting and saving of images, diagrams, or even audio snippets from explanations.

### **6. Conclusion**

The Smart Notes feature is not just an add-on; it is a fundamental shift from a simple quiz platform to an **intelligent, personalized learning companion**. By focusing on a delightful user experience and a powerful, AI-driven learning loop, this feature is positioned to become a cornerstone of the Brahmai platform and a powerful engine for user growth and subscription revenue.
