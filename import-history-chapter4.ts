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

interface Subtopic {
  subtopic: string;
  questions: Question[];
}

interface ChapterData {
  chapter: string;
  board: string;
  grade: number;
  subtopics: Subtopic[];
}

function parseHistoryQuestion(question: Question, chapter: string, subtopic: string, grade: number) {
  // Use difficulty as-is (enum: easy, medium, hard)
  const difficultyLevel = question.difficulty;

  return {
    board: 'ICSE',
    subject: 'History',
    topic: chapter,
    subTopic: subtopic,
    questionType: question.questionType,
    questionText: question.questionText,
    options: question.options ? JSON.stringify(question.options) : null,
    correctAnswer: Array.isArray(question.correctAnswer) 
      ? JSON.stringify(question.correctAnswer) 
      : question.correctAnswer,
    explanation: question.explanation,
    difficulty: difficultyLevel,
    points: question.points,
    timeLimit: question.timeLimit,
    tags: question.tags ? question.tags.join(',') : '',
    status: 'approved',
    isActive: true,
    submittedBy: 1, // System user
    grade: parseInt(grade.toString()),
  };
}

async function importChapter4() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Read the JSON file
  const fileContent = fs.readFileSync('./history-chapter4.json', 'utf-8');
  const data: ChapterData = JSON.parse(fileContent);

  console.log(`\n📚 Importing: ${data.chapter}`);
  console.log(`Board: ${data.board}, Grade: ${data.grade}`);
  console.log(`Subtopics: ${data.subtopics.length}\n`);

  let totalImported = 0;

  for (const subtopicData of data.subtopics) {
    console.log(`\n📖 Subtopic: ${subtopicData.subtopic}`);
    console.log(`   Questions: ${subtopicData.questions.length}`);

    for (const question of subtopicData.questions) {
      const parsedQuestion = parseHistoryQuestion(
        question,
        data.chapter,
        subtopicData.subtopic,
        data.grade
      );

      try {
        await db.insert(questions).values(parsedQuestion);
        totalImported++;
      } catch (error: any) {
        console.error(`   ❌ Error importing question: ${question.questionText.substring(0, 50)}...`);
        console.error(`   Error:`, error);
        console.error(`   Cause:`, error.cause);
        if (error.cause) {
          console.error(`   DB Error:`, error.cause.message);
          console.error(`   Detail:`, error.cause.detail);
        }
        // Stop on first error to see what's wrong
        throw error;
      }
    }

    console.log(`   ✅ Imported ${subtopicData.questions.length} questions`);
  }

  console.log(`\n✅ Total imported: ${totalImported} questions`);
}

importChapter4().catch(console.error);
