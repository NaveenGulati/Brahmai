# Question Bank Import Process Documentation

## 📊 Database Structure

### Two Tables Work Together:

#### 1. `questions` Table
Stores the core question data:
- `board`, `grade`, `subject`, `topic`, `subTopic`
- `questionType`, `questionText`, `options`, `correctAnswer`
- `explanation` (brief, 2-3 sentences)
- `difficulty`, `points`, `timeLimit`
- Metadata: `status`, `submittedBy`, `createdAt`, etc.

#### 2. `aiExplanationCache` Table
Stores detailed AI-generated explanations:
- `questionId` (foreign key to questions table)
- `detailedExplanation` (rich Markdown with emojis, headings, examples)
- `audioUrl` (optional, for text-to-speech)
- `imageData` (optional, for educational images)
- `generatedAt`, `timesUsed`, `lastUsedAt`

---

## 🔄 Import Flow

### Step 1: Generate Questions with ChatGPT
Use the provided schema and instructions to generate a JSON file with questions, including both `explanation` and `detailedExplanation` fields.

### Step 2: Upload via QB Admin Dashboard
1. Login as QB Admin
2. Navigate to QB Admin Dashboard
3. Click "Import Questions" or "Bulk Upload"
4. Select your JSON file
5. Review the preview
6. Click "Import"

### Step 3: Backend Processing

The backend (`bulkUploadQuestionsUserFriendly` function) does the following:

```typescript
for each question in JSON:
  1. Insert question into `questions` table
  2. Get the newly created questionId
  3. If detailedExplanation exists:
     - Insert into `aiExplanationCache` table
     - Link via questionId
  4. Log success/errors
```

### Step 4: Student Experience

When a student clicks "Get Detailed Explanation":

```typescript
1. Check aiExplanationCache for questionId
2. If found:
   - Return detailedExplanation instantly
   - Increment timesUsed counter
   - Update lastUsedAt timestamp
3. If not found:
   - Generate on-the-fly using AI (fallback)
   - Save to cache for next time
```

---

## ✅ What Gets Saved Where

### From JSON to Database:

| JSON Field | Database Table | Column Name | Notes |
|------------|----------------|-------------|-------|
| `board` | `questions` | `board` | e.g., "ICSE" |
| `grade` | `questions` | `grade` | e.g., 7 |
| `subject` | `questions` | `subject` | e.g., "Physics" |
| `topic` | `questions` | `topic` | e.g., "Force and Motion" |
| `subTopic` | `questions` | `subTopic` | e.g., "Newton's Laws" |
| `questionType` | `questions` | `questionType` | "multiple_choice" or "true_false" |
| `questionText` | `questions` | `questionText` | The question |
| `options` | `questions` | `options` | Array of choices (JSONB) |
| `correctAnswer` | `questions` | `correctAnswer` | The correct answer |
| `explanation` | `questions` | `explanation` | Brief explanation |
| **`detailedExplanation`** | **`aiExplanationCache`** | **`detailedExplanation`** | **Rich Markdown explanation** |
| `difficulty` | `questions` | `difficulty` | "easy", "medium", or "hard" |
| `points` | `questions` | `points` | e.g., 10 |
| `timeLimit` | `questions` | `timeLimit` | Seconds, e.g., 45 |
| `tags` | `questions` | `tags` | Array of tags (JSONB) |

---

## 🎯 Benefits of This Approach

### Performance
- ✅ **Instant response** - No AI generation delay
- ✅ **Reduced API costs** - No repeated generation
- ✅ **Scalable** - Works with thousands of questions

### Quality Control
- ✅ **Review before import** - Check explanations in JSON
- ✅ **Edit if needed** - Fix any issues before upload
- ✅ **Consistent quality** - All explanations follow same format

### User Experience
- ✅ **Fast loading** - Students get explanations instantly
- ✅ **Rich formatting** - Emojis, headings, examples
- ✅ **Reliable** - No AI failures or timeouts

---

## 🔧 Technical Details

### Import Function Location
- **File**: `server/db-upload-helper.ts`
- **Function**: `bulkUploadQuestionsUserFriendly()`
- **Endpoint**: `POST /api/trpc/bulkUploadQuestions` (via tRPC)

### Key Code Changes
1. Added `detailedExplanation` to `UserFriendlyQuestion` interface
2. Added `aiExplanationCache` import
3. Modified insert logic to return `questionId`
4. Added cache insert after question insert
5. Added error handling for cache failures

### Error Handling
- If question insert fails → logged to errors array
- If cache insert fails → logged but doesn't fail entire import
- Graceful degradation: system falls back to on-the-fly generation if cache is empty

---

## 📝 Example Import

### JSON Input:
```json
{
  "metadata": {
    "board": "ICSE",
    "grade": 7,
    "subject": "Physics",
    ...
  },
  "questions": [
    {
      "questionText": "What is Newton's First Law?",
      "correctAnswer": "Law of Inertia",
      "explanation": "Brief explanation here...",
      "detailedExplanation": "### 🎯 Why the Answer is...\n\n...",
      ...
    }
  ]
}
```

### Database Result:

**questions table:**
| id | questionText | correctAnswer | explanation |
|----|--------------|---------------|-------------|
| 123 | What is Newton's First Law? | Law of Inertia | Brief explanation here... |

**aiExplanationCache table:**
| questionId | detailedExplanation | generatedAt |
|------------|---------------------|-------------|
| 123 | ### 🎯 Why the Answer is...\n\n... | 2024-11-16 10:30:00 |

---

## 🚀 Deployment Status

**Commit**: `e937b5a`  
**Status**: ✅ Deployed to production  
**Date**: November 16, 2024

---

## 📞 Support

If you encounter any issues during import:
1. Check the browser console for errors
2. Check the server logs for detailed error messages
3. Verify JSON format matches the schema
4. Ensure all required fields are present
5. Contact support at https://help.manus.im

---

**The import system is ready to accept questions with pre-generated detailed explanations!** 🎉
