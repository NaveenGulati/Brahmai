import { getDb } from './server/db';
import { questions, aiExplanationCache } from './drizzle/schema';
import { like, and, eq } from 'drizzle-orm';
import * as fs from 'fs';

interface Question {
  questionType: string;
  questionText: string;
  detailedExplanation?: string;
}

interface Subtopic {
  subtopic: string;
  questions: Question[];
}

interface ChapterData {
  chapter: string;
  subtopics: Subtopic[];
}

async function importChapter4Explanations() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Read the JSON file
  const fileContent = fs.readFileSync('./history-chapter4.json', 'utf-8');
  const data: ChapterData = JSON.parse(fileContent);

  console.log(`\n📚 Importing detailed explanations for: ${data.chapter}\n`);

  // Get all Chapter 4 questions from database
  const dbQuestions = await db
    .select()
    .from(questions)
    .where(like(questions.topic, '%Turkish Invasion%'));

  console.log(`Found ${dbQuestions.length} Chapter 4 questions in database\n`);

  // Create a map of question text to question ID
  const questionMap = new Map<string, number>();
  for (const q of dbQuestions) {
    const normalizedText = q.questionText.toLowerCase().trim();
    questionMap.set(normalizedText, q.id);
  }

  let totalImported = 0;
  let skipped = 0;

  for (const subtopicData of data.subtopics) {
    console.log(`📖 Subtopic: ${subtopicData.subtopic}`);
    
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
          totalImported++;
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
  console.log(`⏭️  Skipped: ${skipped}`);
}

importChapter4Explanations().catch(console.error);
