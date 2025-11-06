import { getDb } from './db';
import { questions, modules, subjects } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

interface UserFriendlyQuestion {
  board: string;
  grade: number;
  subject: string;
  topic: string;
  subTopic?: string;
  scope: 'School' | 'Olympiad' | 'Competitive' | 'Advanced';
  questionType: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';
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
  const createdModules = new Set<string>();

  // Track unique subject-topic combinations
  const subjectTopicMap = new Map<string, Set<string>>();
  
  for (const q of questionsData) {
    const key = `${q.subject}`;
    if (!subjectTopicMap.has(key)) {
      subjectTopicMap.set(key, new Set());
    }
    subjectTopicMap.get(key)!.add(q.topic);
  }

  // Create modules for each unique subject-topic combination
  for (const [subject, topics] of subjectTopicMap) {
    try {
      // Find subject ID
      const subjectRecord = await db.select().from(subjects).where(eq(subjects.name, subject)).limit(1);
      
      if (subjectRecord.length === 0) {
        console.warn(`[Upload] Subject not found: ${subject}, skipping module creation`);
        continue;
      }
      
      const subjectId = subjectRecord[0].id;
      
      // Create module for each topic
      for (const topic of topics) {
        // Check if module already exists
        const existing = await db.select()
          .from(modules)
          .where(and(
            eq(modules.subjectId, subjectId),
            eq(modules.name, topic)
          ))
          .limit(1);
        
        if (existing.length === 0) {
          await db.insert(modules).values({
            subjectId,
            name: topic,
            description: `${topic} module`,
            orderIndex: 0,
          });
          createdModules.add(`${subject} - ${topic}`);
          console.log(`[Upload] Created module: ${subject} - ${topic}`);
        }
      }
    } catch (error: any) {
      console.error(`[Upload] Error creating modules for ${subject}:`, error);
    }
  }

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
    boardsCreated: 0,
    gradesCreated: 0,
    subjectsCreated: 0,
    modulesCreated: createdModules.size,
    errors: errors.length > 0 ? errors : undefined,
  };
}

