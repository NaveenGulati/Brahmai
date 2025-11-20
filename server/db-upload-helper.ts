import { getDb } from './db';
import { questions, modules, subjects, aiExplanationCache } from '../drizzle/schema';
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
  detailedExplanation?: string;
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
      // Find moduleId for this question
      let moduleId: number | null = null;
      
      try {
        const subjectRecord = await db.select().from(subjects).where(eq(subjects.name, q.subject)).limit(1);
        
        if (subjectRecord.length > 0) {
          const subjectId = subjectRecord[0].id;
          
          const moduleRecord = await db.select()
            .from(modules)
            .where(and(
              eq(modules.subjectId, subjectId),
              eq(modules.name, q.topic)
            ))
            .limit(1);
          
          if (moduleRecord.length > 0) {
            moduleId = moduleRecord[0].id;
          }
        }
      } catch (lookupError: any) {
        console.warn(`[Upload] Could not find moduleId for ${q.subject} - ${q.topic}:`, lookupError.message);
      }

      // Insert question directly with text fields AND moduleId
      const result = await db.insert(questions).values({
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
        moduleId, // Link to module
      }).returning({ id: questions.id });

      const questionId = result[0].id;

      // If detailedExplanation is provided, save it to aiExplanationCache
      if (q.detailedExplanation) {
        try {
          await db.insert(aiExplanationCache).values({
            questionId,
            detailedExplanation: q.detailedExplanation,
            audioUrl: null,
            imageData: null,
          });
          console.log(`[Upload] Saved detailed explanation for question ${questionId}`);
        } catch (cacheError: any) {
          console.error(`[Upload] Failed to save detailed explanation for question ${questionId}:`, cacheError);
          // Don't fail the entire import if cache save fails
        }
      }

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

