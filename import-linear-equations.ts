import { getDb } from './server/db';
import { questions } from './drizzle/schema';
import * as fs from 'fs';

interface Question {
  questionType: string;
  questionText: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  detailedExplanation?: string;
  difficulty: string;
  points: number;
  timeLimit: number;
  tags?: string[];
  bloomsLevel?: string;
}

interface Metadata {
  board: string;
  grade: number;
  subject: string;
  topic: string;
  subTopic: string;
  scope: string;
}

interface Subtopic {
  metadata: Metadata;
  questions: Question[];
}

interface ChapterData {
  chapter: string;
  board: string;
  grade: number;
  subtopics: Subtopic[];
}

function parseQuestion(question: Question, metadata: Metadata) {
  return {
    board: metadata.board,
    grade: metadata.grade,
    subject: metadata.subject,
    topic: metadata.topic,
    subTopic: metadata.subTopic,
    scope: metadata.scope,
    questionType: question.questionType,
    questionText: question.questionText,
    options: question.options ? JSON.stringify(question.options) : null,
    correctAnswer: Array.isArray(question.correctAnswer) 
      ? JSON.stringify(question.correctAnswer) 
      : question.correctAnswer,
    explanation: question.explanation,
    difficulty: question.difficulty, // Use as-is: easy, medium, hard
    points: question.points,
    timeLimit: question.timeLimit,
    tags: question.tags ? question.tags.join(',') : '',
    status: 'approved',
    isActive: true,
    submittedBy: 1, // System user
  };
}

async function importLinearEquations() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Read the JSON file
  const fileContent = fs.readFileSync('./math-linear-equations.json', 'utf-8');
  const data: ChapterData = JSON.parse(fileContent);

  console.log(`\n📚 Importing: ${data.chapter}`);
  console.log(`Board: ${data.board}, Grade: ${data.grade}`);
  console.log(`Subtopics: ${data.subtopics.length}\n`);

  let totalImported = 0;
  let errors = 0;

  for (const subtopicData of data.subtopics) {
    console.log(`\n📖 Subtopic: ${subtopicData.metadata.subTopic}`);
    console.log(`   Questions: ${subtopicData.questions.length}`);

    for (const question of subtopicData.questions) {
      const parsedQuestion = parseQuestion(question, subtopicData.metadata);

      try {
        await db.insert(questions).values(parsedQuestion);
        totalImported++;
      } catch (error: any) {
        console.error(`   ❌ Error importing question: ${question.questionText.substring(0, 50)}...`);
        console.error(`   Error: ${error.cause?.message || error.message}`);
        errors++;
        
        // Stop on first error to debug
        if (errors === 1) {
          console.error('\n   Full error details:', error);
          throw error;
        }
      }
    }

    console.log(`   ✅ Imported ${subtopicData.questions.length} questions`);
  }

  console.log(`\n✅ Total imported: ${totalImported} questions`);
  if (errors > 0) {
    console.log(`❌ Errors: ${errors}`);
  }
}

importLinearEquations().catch(console.error);
