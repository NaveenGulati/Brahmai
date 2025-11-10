## Smart Notes Feature: Technical Design & Implementation Plan

This document provides a detailed technical blueprint for implementing the Smart Notes feature. It covers the database schema, backend API design, and the specific prompts for integrating AI services. The architecture is designed to be scalable, robust, and efficient.

### 1. Database Schema Design

To support the Smart Notes feature, several new tables will be added to the existing PostgreSQL database. The design uses a normalized structure to ensure data integrity and efficient querying.

**Table 1: `notes`**

This is the core table for storing the user-highlighted content.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Unique identifier for the note. |
| `userId` | `INTEGER` | `NOT NULL, REFERENCES users(id)` | The ID of the user who created the note. |
| `questionId` | `INTEGER` | `REFERENCES questions(id)` | The ID of the source question for context. |
| `content` | `TEXT` | `NOT NULL` | The highlighted text content saved by the user. |
| `createdAt` | `TIMESTAMP` | `DEFAULT NOW()` | Timestamp of when the note was created. |

**Table 2: `tags`**

This table stores the unique names of the AI-generated tags to avoid redundancy.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Unique identifier for the tag. |
| `name` | `VARCHAR(255)` | `NOT NULL, UNIQUE` | The name of the tag (e.g., "Energy Transformation"). |
| `type` | `VARCHAR(50)` | `NOT NULL` | The category of the tag (e.g., `subject`, `topic`, `subTopic`). |

**Table 3: `note_tags`**

This is a join table that establishes a many-to-many relationship between notes and tags.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `noteId` | `INTEGER` | `NOT NULL, REFERENCES notes(id)` | Foreign key linking to the `notes` table. |
| `tagId` | `INTEGER` | `NOT NULL, REFERENCES tags(id)` | Foreign key linking to the `tags` table. |

**Table 4: `generated_questions`**

This table stores the AI-generated quizzes associated with each note.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Unique identifier for the generated question. |
| `noteId` | `INTEGER` | `NOT NULL, REFERENCES notes(id)` | The note from which this question was generated. |
| `questionText` | `TEXT` | `NOT NULL` | The text of the generated question. |
| `options` | `JSONB` | `NOT NULL` | A JSON array of options, e.g., `["Option A", "Option B", "Option C"]`. |
| `correctAnswerIndex` | `INTEGER` | `NOT NULL` | The 0-based index of the correct answer in the `options` array. |
| `explanation` | `TEXT` | | A brief explanation for the correct answer. |

### 2. Backend API (tRPC) Implementation

The backend will expose several new procedures through our tRPC router to handle the feature's logic.

**`notes.create`**
-   **Input:** `{ highlightedText: string, questionId: number, subject: string }`
-   **Logic:**
    1.  Inserts the `highlightedText`, `userId` (from context), and `questionId` into the `notes` table.
    2.  Asynchronously calls the AI Indexing Service with the `highlightedText` and `subject`.
    3.  Receives `topic` and `subTopic` tags from the AI.
    4.  Uses `findOrCreate` logic to get the IDs for the `subject`, `topic`, and `subTopic` tags from the `tags` table.
    5.  Inserts records into the `note_tags` table to link the new note with its tags.
-   **Returns:** `{ success: true, noteId: number }`

**`notes.list`**
-   **Input:** `{ filterBy?: { subject?: string, topic?: string } }`
-   **Logic:**
    1.  Fetches all notes for the current `userId`.
    2.  Joins with `note_tags` and `tags` to retrieve all associated tags for each note.
    3.  Applies filters if provided.
-   **Returns:** An array of note objects, each including its content, tags, and source question context.

**`notes.generateQuestions`**
-   **Input:** `{ noteId: number }`
-   **Logic:**
    1.  Retrieves the note `content` and its source `question` from the database.
    2.  Calls the AI Question Generation Service with the note content and original question context.
    3.  Receives a structured JSON object containing 5 questions.
    4.  Inserts the new questions into the `generated_questions` table, linked to the `noteId`.
-   **Returns:** An array of the newly created question objects.

### 3. AI Service Prompts

The quality of the AI-powered features depends entirely on the precision of the prompts.

**Prompt 1: AI Indexing Service**

This prompt is designed to extract structured categorical information from unstructured text.

```
You are an expert academic indexer for Grade 7 educational content. Your task is to analyze a piece of text and categorize it within the given subject. 

**Subject:**
{{subject}}

**Text Content:**
"{{highlightedText}}"

Based on the text, identify the primary "topic" and a more specific "subTopic". The topic should be a broad category within the subject, and the sub-topic should be a more granular concept.

**Constraint:** Your response MUST be a valid JSON object with the following structure, and nothing else:
{
  "topic": "<Your identified topic>",
  "subTopic": "<Your identified sub-topic>"
}
```

**Prompt 2: AI Question Generation Service**

This is the core of the active recall feature. The prompt is engineered to be highly constrained to ensure syllabus adherence and question quality.

```
You are an expert question creator for a Grade 7 ICSE curriculum quiz platform. Your task is to generate a mini-quiz of 5 multiple-choice questions based on a specific concept.

**Constraint Checklist (You MUST follow all rules):**
1.  **Syllabus:** All questions must be strictly within the Grade 7 ICSE syllabus for the given subject.
2.  **Relevance:** All questions must be directly related to the "Specific Concept from Note". Do not ask general knowledge questions.
3.  **Reference:** Use the "Original Question Context" to understand the difficulty and style expected.
4.  **Format:** The output MUST be a single, valid JSON array containing 5 question objects. Do not include any text or explanations outside of the JSON structure.

**Subject:**
{{subject}}

**Original Question Context:**
"{{originalQuestionText}}"

**Specific Concept from Note:**
"{{noteContent}}"

Generate 5 multiple-choice questions based on the "Specific Concept from Note".

**Required JSON Output Format:**
[
  {
    "questionText": "<Your generated question>",
    "options": [
      "<Option A>",
      "<Option B>",
      "<Option C>",
      "<Option D>"
    ],
    "correctAnswerIndex": <0, 1, 2, or 3>,
    "explanation": "<A brief explanation for why the answer is correct>"
  },
  ...
]
```

This technical design provides a solid foundation for building a robust and feature-rich Smart Notes system that can be effectively monetized as a premium offering.
