import { getDb } from './db';
import { questions } from '../drizzle/schema';

interface UserFriendlyQuestion {
  board: string;
  grade: number;
  subject: string;
  topic: string;
  subTopic?: string;
  scope: 'School' | 'Olympiad' | 'Competitive' | 'Advanced';
  questionType: 'mcq' | 'true_false' | 'fill_blank' | 'match' | 'image_based';
  questionText: string;
  questionImage?: string;
  options: any;
  correctAnswer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  timeLimit: number;
}

/**
 * Bulk upload questions with user-friendly format (text fields)
 * Stores text directly without ID lookups
 */
export async function bulkUploadQuestionsUserFriendly(
  questionsData: UserFriendlyQuestion[],
  submittedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const errors: string[] = [];
  let created = 0;

  for (const q of questionsData) {
    try {
      // Insert question directly with text fields
      await db.insert(questions).values({
        board: q.board,
        grade: q.grade,
        subject: q.subject,
        topic: q.topic,
        subTopic: q.subTopic || null,
        scope: q.scope,
        questionType: q.questionType,
        questionText: q.questionText,
        questionImage: q.questionImage || null,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || null,
        difficulty: q.difficulty,
        points: q.points,
        timeLimit: q.timeLimit,
        submittedBy,
        status: 'approved', // Auto-approve uploaded questions
        isActive: true,
      });

      created++;
    } catch (error: any) {
      console.error('[Upload] Error processing question:', error);
      errors.push(`Failed to insert question: ${q.questionText.substring(0, 50)}... - ${error.message}`);
    }
  }

  return {
    success: true,
    created,
    boardsCreated: 0, // No longer creating boards
    gradesCreated: 0, // No longer creating grades
    subjectsCreated: 0, // No longer creating subjects
    modulesCreated: 0, // No longer creating modules
    errors: errors.length > 0 ? errors : undefined,
  };
}

