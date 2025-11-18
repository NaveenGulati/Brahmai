import { getDb } from './server/db';
import { questions, aiExplanationCache } from './drizzle/schema';
import { like, and, eq } from 'drizzle-orm';
import * as fs from 'fs';

interface Question {
  questionType: string;
  questionText: string;
  detailedExplanation?: string;
}

interface Metadata {
  subject: string;
  topic: string;
}

interface Subtopic {
  metadata: Metadata;
  questions: Question[];
}

interface ChapterData {
  chapter: string;
  subtopics: Subtopic[];
}

async function importLinearEquationsExplanations() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Read the JSON file
  const fileContent = fs.readFileSync('./math-linear-equations.json', 'utf-8');
  const data: ChapterData = JSON.parse(fileContent);

  console.log(`\n📚 Importing detailed explanations for: ${data.chapter}\n`);

  // Get all Linear Equations questions from database
  const dbQuestions = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.subject, 'Mathematics'),
        eq(questions.topic, 'Simple Linear Equations')
      )
    );

  console.log(`Found ${dbQuestions.length} Linear Equations questions in database\n`);

  // Create a map of question text to question ID
  const questionMap = new Map<string, number>();
  for (const q of dbQuestions) {
    const normalizedText = q.questionText.toLowerCase().trim();
    questionMap.set(normalizedText, q.id);
  }

  let totalImported = 0;
  let skipped = 0;
  let updated = 0;

  for (const subtopicData of data.subtopics) {
    console.log(`📖 Subtopic: ${subtopicData.metadata.subTopic}`);
    
    for (const question of subtopicData.questions) {
      if (!question.detailedExplanation) {
        skipped++;
        continue;
      }

      const normalizedText = question.questionText.toLowerCase().trim();
      const questionId = questionMap.get(normalizedText);

      if (!questionId) {
        console.error(`   ❌ Question not found in DB: ${question.questionText.substring(0, 50)}...`);
        skipped++;
        continue;
      }

      try {
        await db.insert(aiExplanationCache).values({
          questionId,
          detailedExplanation: question.detailedExplanation,
          audioUrl: null,
          imageData: null,
        });
        totalImported++;
      } catch (error: any) {
        // Check if it's a duplicate key error (explanation already exists)
        if (error.cause?.code === '23505') {
          // Update existing explanation instead
          await db
            .update(aiExplanationCache)
            .set({
              detailedExplanation: question.detailedExplanation,
              lastUsedAt: new Date(),
            })
            .where(eq(aiExplanationCache.questionId, questionId));
          updated++;
        } else {
          console.error(`   ❌ Error importing explanation for question ID ${questionId}`);
          console.error(`   Error:`, error.cause?.message || error.message);
          skipped++;
        }
      }
    }

    console.log(`   ✅ Processed subtopic\n`);
  }

  console.log(`✅ Total detailed explanations imported: ${totalImported}`);
  if (updated > 0) {
    console.log(`🔄 Updated existing explanations: ${updated}`);
  }
  if (skipped > 0) {
    console.log(`⏭️  Skipped: ${skipped}`);
  }
}

importLinearEquationsExplanations().catch(console.error);
