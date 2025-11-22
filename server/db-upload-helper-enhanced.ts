import { getDb } from './db';
import { questions, modules, subjects, boards, grades, boardGradeSubjects, aiExplanationCache } from '../drizzle/schema';
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
  submittedBy?: number; // Optional: will be set by the endpoint if not provided
}

/**
 * Enhanced bulk upload with automatic creation of missing entities
 * Creates: boards, grades, subjects, boardGradeSubjects, modules, questions, aiExplanationCache
 */
export async function bulkUploadQuestionsEnhanced(
  questionsData: UserFriendlyQuestion[],
  submittedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const errors: string[] = [];
  const stats = {
    boardsCreated: new Set<string>(),
    gradesCreated: new Set<number>(),
    subjectsCreated: new Set<string>(),
    modulesCreated: new Set<string>(),
    questionsCreated: 0,
    explanationsCached: 0,
  };
  const subjectIdMap = new Map<string, number>();

  // Step 1: Collect all unique entities from the JSON
  const uniqueBoards = new Set<string>();
  const uniqueGrades = new Set<number>();
  const uniqueSubjects = new Set<string>();
  const uniqueBoardGradeSubjects = new Set<string>();

  for (const q of questionsData) {
    uniqueBoards.add(q.board);
    uniqueGrades.add(q.grade);
    uniqueSubjects.add(q.subject);
    uniqueBoardGradeSubjects.add(`${q.board}|${q.grade}|${q.subject}`);
  }

  // Step 2: Create missing boards
  for (const boardName of uniqueBoards) {
    try {
      const existing = await db.select().from(boards).where(eq(boards.name, boardName)).limit(1);
      
      if (existing.length === 0) {
        await db.insert(boards).values({
          name: boardName,
          code: boardName.toUpperCase().substring(0, 4),
          description: `${boardName} board`,
          isActive: true,
        });
        
        stats.boardsCreated.add(boardName);
        console.log(`[Upload] ✅ Created board: ${boardName}`);
      }
    } catch (error: any) {
      console.error(`[Upload] ❌ Error creating board ${boardName}:`, error.message);
      errors.push(`Failed to create board: ${boardName} - ${error.message}`);
    }
  }

  // Step 3: Create missing grades
  for (const gradeLevel of uniqueGrades) {
    try {
      const existing = await db.select().from(grades).where(eq(grades.level, gradeLevel)).limit(1);
      
      if (existing.length === 0) {
        await db.insert(grades).values({
          level: gradeLevel,
          name: `Grade ${gradeLevel}`,
          displayOrder: gradeLevel,
          isActive: true,
        });
        
        stats.gradesCreated.add(gradeLevel);
        console.log(`[Upload] ✅ Created grade: ${gradeLevel}`);
      }
    } catch (error: any) {
      console.error(`[Upload] ❌ Error creating grade ${gradeLevel}:`, error.message);
      errors.push(`Failed to create grade: ${gradeLevel} - ${error.message}`);
    }
  }

  // Step 4: Create missing subjects
  for (const subjectName of uniqueSubjects) {
    try {
      const existing = await db.select().from(subjects).where(eq(subjects.name, subjectName)).limit(1);
      
      let subjectId: number;

      if (existing.length === 0) {
        let code = subjectName.toUpperCase().substring(0, 4);
        
        const iconMap: Record<string, string> = {
          'Mathematics': '🔢',
          'Science': '🔬',
          'English': '📚',
          'Spanish': '🇪🇸',
          'Hindi': '🇮🇳',
          'History': '📜',
          'Geography': '🌍',
          'Physics': '⚛️',
          'Chemistry': '🧪',
          'Biology': '🧬',
        };
        const icon = iconMap[subjectName] || '📖';
        
        try {
          const result = await db.insert(subjects).values({
            name: subjectName,
            code,
            description: `${subjectName} curriculum`,
            icon,
            color: '#6366f1',
            isActive: true,
            displayOrder: 0,
          }).returning({ id: subjects.id });
          
          subjectId = result[0].id;
          stats.subjectsCreated.add(subjectName);
          console.log(`[Upload] ✅ Created subject: ${subjectName}`);
        } catch (insertError: any) {
          if (insertError.message.includes('duplicate key value violates unique constraint')) {
            code = `${code}${Math.floor(Math.random() * 100)}`;
            console.warn(`[Upload] ⚠️ Code collision for ${subjectName}. Retrying with code: ${code}`);
            
            const result = await db.insert(subjects).values({
              name: subjectName,
              code,
              description: `${subjectName} curriculum`,
              icon,
              color: '#6366f1',
              isActive: true,
              displayOrder: 0,
            }).returning({ id: subjects.id });
            
            subjectId = result[0].id;
            stats.subjectsCreated.add(subjectName);
            console.log(`[Upload] ✅ Created subject: ${subjectName} with unique code.`);
          } else {
            throw insertError;
          }
        }
      } else {
        subjectId = existing[0].id;
      }
      
      subjectIdMap.set(subjectName, subjectId);

    } catch (error: any) {
      console.error(`[Upload] ❌ FATAL Error creating/fetching subject ${subjectName}:`, error.message);
      errors.push(`FATAL: Failed to create/fetch subject: ${subjectName} - ${error.message}`);
    }
  }

  // Step 5: Create missing boardGradeSubjects mappings
  for (const mapping of uniqueBoardGradeSubjects) {
    try {
      const [boardName, gradeLevel, subjectName] = mapping.split('|');
      
      const boardRecord = await db.select().from(boards).where(eq(boards.name, boardName)).limit(1);
      const gradeRecord = await db.select().from(grades).where(eq(grades.level, parseInt(gradeLevel))).limit(1);
      const subjectId = subjectIdMap.get(subjectName);

      if (boardRecord.length === 0 || gradeRecord.length === 0 || !subjectId) {
        console.warn(`[Upload] ⚠️ Skipping boardGradeSubject mapping: ${mapping} (missing parent entity)`);
        continue;
      }
      
      const boardId = boardRecord[0].id;
      const gradeId = gradeRecord[0].id;
      
      const existing = await db.select()
        .from(boardGradeSubjects)
        .where(and(
          eq(boardGradeSubjects.boardId, boardId),
          eq(boardGradeSubjects.gradeId, gradeId),
          eq(boardGradeSubjects.subjectId, subjectId)
        ))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(boardGradeSubjects).values({
          boardId,
          gradeId,
          subjectId,
          isCompulsory: true,
          isActive: true,
        });
        
        stats.modulesCreated.add(mapping);
        console.log(`[Upload] ✅ Created boardGradeSubject mapping: ${mapping}`);
      }
    } catch (error: any) {
      console.error(`[Upload] ❌ Error creating boardGradeSubject mapping ${mapping}:`, error.message);
      errors.push(`Failed to create mapping: ${mapping} - ${error.message}`);
    }
  }

  // Step 6: Create missing modules
  const uniqueSubjectTopics = new Map<string, Set<string>>();
  for (const q of questionsData) {
    if (!uniqueSubjectTopics.has(q.subject)) {
      uniqueSubjectTopics.set(q.subject, new Set());
    }
    uniqueSubjectTopics.get(q.subject)!.add(q.topic);
  }

  for (const [subjectName, topics] of uniqueSubjectTopics) {
    try {
      const subjectId = subjectIdMap.get(subjectName);
      if (!subjectId) continue;

      for (const topic of topics) {
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
            isActive: true,
          });
          
          stats.modulesCreated.add(`${subjectName} - ${topic}`);
          console.log(`[Upload] ✅ Created module: ${subjectName} - ${topic}`);
        }
      }
    } catch (error: any) {
      console.error(`[Upload] ❌ Error creating modules for ${subjectName}:`, error.message);
      errors.push(`Failed to create modules for ${subjectName} - ${error.message}`);
    }
  }

  // Step 7: Insert questions
  for (const q of questionsData) {
    try {
      const subjectId = subjectIdMap.get(q.subject);
      if (!subjectId) continue;

      const moduleRecord = await db.select()
        .from(modules)
        .where(and(
          eq(modules.subjectId, subjectId),
          eq(modules.name, q.topic)
        ))
        .limit(1);

      const moduleId = moduleRecord.length > 0 ? moduleRecord[0].id : null;

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
        submittedBy: q.submittedBy || submittedBy,
        status: 'approved',
        isActive: true,
        moduleId,
      }).returning({ id: questions.id });

      const questionId = result[0].id;
      stats.questionsCreated++;

      if (q.detailedExplanation) {
        try {
          await db.insert(aiExplanationCache).values({
            questionId,
            detailedExplanation: q.detailedExplanation,
            audioUrl: null,
            imageData: null,
          });
          stats.explanationsCached++;
        } catch (cacheError: any) {
          console.error(`[Upload] ❌ Error caching explanation for question ${questionId}:`, cacheError.message);
          errors.push(`Failed to cache explanation for question ${questionId} - ${cacheError.message}`);
        }
      }
    } catch (error: any) {
      console.error(`[Upload] ❌ Error inserting question: ${q.questionText}`, error.message);
      errors.push(`Failed to insert question: ${q.questionText} - ${error.message}`);
    }
  }

  return {
    success: errors.length === 0,
    message: `Upload complete. ${stats.questionsCreated} questions processed. ${errors.length} errors.`,
    stats,
    errors,
  };
}
