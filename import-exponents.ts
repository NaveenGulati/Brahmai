import { getDb } from './server/db';
import { questions } from './drizzle/schema';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Question {
  questionType: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  detailedExplanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  timeLimit: number;
  tags: string[];
  bloomsLevel: string;
}

interface SubtopicData {
  metadata: {
    board: string;
    grade: number;
    subject: string;
    topic: string;
    subTopic: string;
    scope: string;
    generatedBy: string;
    generatedAt: string;
  };
  questions: Question[];
}

interface QuestionBank {
  chapter: string;
  board: string;
  grade: number;
  generatedBy: string;
  generatedAt: string;
  subtopics: SubtopicData[];
}

async function importDecimalsQuestions() {
  console.log('Starting decimals question import...');
  
  // Read JSON file
  const jsonPath = '/home/ubuntu/upload/ch5-exponents_master_bank.json';
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const data: QuestionBank = JSON.parse(rawData);
  
  console.log(`Found ${data.subtopics.length} subtopics`);
  
  // Get database connection
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }
  
  let totalImported = 0;
  let totalSkipped = 0;
  
  // Process each subtopic
  for (const subtopicData of data.subtopics) {
    const { metadata, questions: questionList } = subtopicData;
    
    console.log(`\nProcessing subtopic: ${metadata.subTopic}`);
    console.log(`  Questions: ${questionList.length}`);
    
    // Import each question
    for (const q of questionList) {
      try {
        // Check if question already exists (by questionText)
        const existing = await db.select()
          .from(questions)
          .where(eq(questions.questionText, q.questionText))
          .limit(1);
        
        if (existing.length > 0) {
          console.log(`  Skipping duplicate: "${q.questionText.substring(0, 50)}..."`);
          totalSkipped++;
          continue;
        }
        
        // Insert question
        await db.insert(questions).values({
          board: metadata.board,
          grade: metadata.grade,
          subject: metadata.subject,
          topic: metadata.topic,
          subTopic: metadata.subTopic,
          scope: metadata.scope,
          questionType: 'multiple_choice',
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          points: q.points,
          timeLimit: q.timeLimit,
          status: 'approved', // Auto-approve imported questions
          submittedBy: 1, // System import
          tags: q.tags,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        totalImported++;
        
        if (totalImported % 50 === 0) {
          console.log(`  Progress: ${totalImported} questions imported...`);
        }
      } catch (error) {
        console.error(`  Error importing question: ${error}`);
        console.error(`  Question text: ${q.questionText.substring(0, 100)}`);
      }
    }
  }
  
  console.log(`\n✅ Import complete!`);
  console.log(`  Total imported: ${totalImported}`);
  console.log(`  Total skipped (duplicates): ${totalSkipped}`);
  console.log(`  Total in file: ${data.subtopics.reduce((sum, s) => sum + s.questions.length, 0)}`);
}

// Add missing import
import { eq } from 'drizzle-orm';

// Run the import
importDecimalsQuestions()
  .then(() => {
    console.log('\nImport finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nImport failed:', error);
    process.exit(1);
  });
