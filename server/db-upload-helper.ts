import { getDb } from './db';
import { questions, subjects, modules, boards, grades } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

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
 * Get or create a subject by name
 * Returns the subject ID
 */
async function getOrCreateSubject(db: any, subjectName: string): Promise<number> {
  // Check if subject exists
  const existing = await db
    .select()
    .from(subjects)
    .where(eq(subjects.name, subjectName))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new subject
  const code = subjectName.substring(0, 3).toUpperCase();
  const result = await db
    .insert(subjects)
    .values({
      name: subjectName,
      code: code,
      description: `Study of ${subjectName}`,
      icon: '📚',
    })
    .returning({ id: subjects.id });

  return result[0].id;
}

/**
 * Get or create a module by name and subject
 * Returns the module ID
 */
async function getOrCreateModule(
  db: any,
  moduleName: string,
  subjectId: number,
  boardId: number,
  gradeId: number
): Promise<number> {
  // Check if module exists for this subject
  const existing = await db
    .select()
    .from(modules)
    .where(
      and(
        eq(modules.name, moduleName),
        eq(modules.subjectId, subjectId),
        eq(modules.boardId, boardId),
        eq(modules.gradeId, gradeId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Get the highest orderIndex for this subject
  const maxOrder = await db
    .select()
    .from(modules)
    .where(eq(modules.subjectId, subjectId))
    .orderBy(modules.orderIndex);

  const nextOrder = maxOrder.length > 0 ? (maxOrder[maxOrder.length - 1].orderIndex || 0) + 1 : 1;

  // Create new module
  const result = await db
    .insert(modules)
    .values({
      name: moduleName,
      description: `Study of ${moduleName}`,
      subjectId: subjectId,
      boardId: boardId,
      gradeId: gradeId,
      orderIndex: nextOrder,
    })
    .returning({ id: modules.id });

  return result[0].id;
}

/**
 * Get board ID by name
 */
async function getBoardId(db: any, boardName: string): Promise<number> {
  const result = await db
    .select()
    .from(boards)
    .where(eq(boards.name, boardName))
    .limit(1);

  if (result.length === 0) {
    throw new Error(`Board "${boardName}" not found. Please create it first.`);
  }

  return result[0].id;
}

/**
 * Get grade ID by number
 */
async function getGradeId(db: any, gradeNumber: number): Promise<number> {
  const result = await db
    .select()
    .from(grades)
    .where(eq(grades.gradeNumber, gradeNumber))
    .limit(1);

  if (result.length === 0) {
    throw new Error(`Grade ${gradeNumber} not found. Please create it first.`);
  }

  return result[0].id;
}

/**
 * Bulk upload questions with user-friendly format (text fields)
 * Auto-creates subjects and modules as needed
 */
export async function bulkUploadQuestionsUserFriendly(
  questionsData: UserFriendlyQuestion[],
  submittedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const errors: string[] = [];
  let created = 0;
  let subjectsCreated = 0;
  let modulesCreated = 0;

  // Track created subjects and modules to avoid duplicate counting
  const createdSubjects = new Set<string>();
  const createdModules = new Set<string>();

  for (const q of questionsData) {
    try {
      // Get or create board and grade IDs
      const boardId = await getBoardId(db, q.board);
      const gradeId = await getGradeId(db, q.grade);

      // Get or create subject
      const subjectId = await getOrCreateSubject(db, q.subject);
      if (!createdSubjects.has(q.subject)) {
        // Check if this is a newly created subject
        const wasNew = createdSubjects.size === 0 || !createdSubjects.has(q.subject);
        if (wasNew) {
          subjectsCreated++;
          createdSubjects.add(q.subject);
        }
      }

      // Get or create module (topic)
      const moduleId = await getOrCreateModule(db, q.topic, subjectId, boardId, gradeId);
      const moduleKey = `${q.subject}-${q.topic}`;
      if (!createdModules.has(moduleKey)) {
        // Check if this is a newly created module
        const wasNew = createdModules.size === 0 || !createdModules.has(moduleKey);
        if (wasNew) {
          modulesCreated++;
          createdModules.add(moduleKey);
        }
      }

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
    boardsCreated: 0, // Boards must exist beforehand
    gradesCreated: 0, // Grades must exist beforehand
    subjectsCreated,
    modulesCreated,
    errors: errors.length > 0 ? errors : undefined,
  };
}

