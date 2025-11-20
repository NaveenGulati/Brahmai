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
  let created = 0;
  const stats = {
    boardsCreated: new Set<string>(),
    gradesCreated: new Set<number>(),
    subjectsCreated: new Set<string>(),
    boardGradeSubjectsCreated: new Set<string>(),
    modulesCreated: new Set<string>(),
    questionsCreated: 0,
    explanationsCached: 0,
    explanationsFailed: 0,
  };

  // Step 1: Collect all unique entities from the JSON
  const uniqueBoards = new Set<string>();
  const uniqueGrades = new Set<number>();
  const uniqueSubjects = new Set<string>();
  const uniqueBoardGradeSubjects = new Set<string>();
  const uniqueSubjectTopics = new Map<string, Set<string>>();

  for (const q of questionsData) {
    uniqueBoards.add(q.board);
    uniqueGrades.add(q.grade);
    uniqueSubjects.add(q.subject);
    uniqueBoardGradeSubjects.add(`${q.board}|${q.grade}|${q.subject}`);
    
    if (!uniqueSubjectTopics.has(q.subject)) {
      uniqueSubjectTopics.set(q.subject, new Set());
    }
    uniqueSubjectTopics.get(q.subject)!.add(q.topic);
  }

  console.log('[Upload] Found unique entities:');
  console.log(`  - Boards: ${Array.from(uniqueBoards).join(', ')}`);
  console.log(`  - Grades: ${Array.from(uniqueGrades).join(', ')}`);
  console.log(`  - Subjects: ${Array.from(uniqueSubjects).join(', ')}`);

  // Step 2: Create missing boards
  for (const boardName of uniqueBoards) {
    try {
      const existing = await db.select().from(boards).where(eq(boards.name, boardName)).limit(1);
      
      if (existing.length === 0) {
        // Generate code from name (e.g., "CBSE" -> "CBSE", "State Board" -> "STATE")
        const code = boardName.toUpperCase().replace(/\s+/g, '_').substring(0, 20);
        
        await db.insert(boards).values({
          code,
          name: boardName,
          country: 'India',
          description: `${boardName} curriculum`,
          isActive: true,
          displayOrder: 0,
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
      
      if (existing.length === 0) {
        // Generate code from name (e.g., "Mathematics" -> "MATH", "Spanish" -> "SPAN")
        const code = subjectName.toUpperCase().substring(0, 4);
        
        // Assign icon based on subject name
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
        
        await db.insert(subjects).values({
          name: subjectName,
          code,
          description: `${subjectName} curriculum`,
          icon,
          color: '#6366f1', // Default indigo color
          category: 'core',
          isActive: true,
          displayOrder: 0,
        });
        
        stats.subjectsCreated.add(subjectName);
        console.log(`[Upload] ✅ Created subject: ${subjectName}`);
      }
    } catch (error: any) {
      console.error(`[Upload] ❌ Error creating subject ${subjectName}:`, error.message);
      errors.push(`Failed to create subject: ${subjectName} - ${error.message}`);
    }
  }

  // Step 5: Create missing boardGradeSubjects mappings
  for (const mapping of uniqueBoardGradeSubjects) {
    try {
      const [boardName, gradeLevel, subjectName] = mapping.split('|');
      
      // Get IDs
      const boardRecord = await db.select().from(boards).where(eq(boards.name, boardName)).limit(1);
      const gradeRecord = await db.select().from(grades).where(eq(grades.level, parseInt(gradeLevel))).limit(1);
      const subjectRecord = await db.select().from(subjects).where(eq(subjects.name, subjectName)).limit(1);
      
      if (boardRecord.length === 0 || gradeRecord.length === 0 || subjectRecord.length === 0) {
        console.warn(`[Upload] ⚠️ Skipping boardGradeSubject mapping: ${mapping} (missing parent entity)`);
        continue;
      }
      
      const boardId = boardRecord[0].id;
      const gradeId = gradeRecord[0].id;
      const subjectId = subjectRecord[0].id;
      
      // Check if mapping exists
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
          displayOrder: 0,
        });
        
        stats.boardGradeSubjectsCreated.add(mapping);
        console.log(`[Upload] ✅ Created boardGradeSubject: ${mapping}`);
      }
    } catch (error: any) {
      console.error(`[Upload] ❌ Error creating boardGradeSubject ${mapping}:`, error.message);
      errors.push(`Failed to create boardGradeSubject: ${mapping} - ${error.message}`);
    }
  }

  // Step 6: Create missing modules
  for (const [subjectName, topics] of uniqueSubjectTopics) {
    try {
      const subjectRecord = await db.select().from(subjects).where(eq(subjects.name, subjectName)).limit(1);
      
      if (subjectRecord.length === 0) {
        console.warn(`[Upload] ⚠️ Subject not found: ${subjectName}, skipping module creation`);
        continue;
      }
      
      const subjectId = subjectRecord[0].id;
      
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
            description: `${topic} module for ${subjectName}`,
            orderIndex: 0,
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
      // Insert question (moduleId is NOT in schema, so we don't include it)
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
        status: 'approved',
        isActive: true,
      }).returning({ id: questions.id });

      const questionId = result[0].id;
      stats.questionsCreated++;

      // Save detailedExplanation to cache if provided
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
          stats.explanationsFailed++;
          console.error(`[Upload] ❌ Failed to cache explanation for question ${questionId}:`, cacheError.message);
          errors.push(`Failed to cache explanation for question ${questionId}: ${cacheError.message}`);
        }
      }
    } catch (error: any) {
      console.error(`[Upload] ❌ Error inserting question:`, error.message);
      errors.push(`Failed to insert question: ${q.questionText.substring(0, 50)}... - ${error.message}`);
    }
  }

  console.log('\n[Upload] ✅ Upload complete!');
  console.log(`  - Boards created: ${stats.boardsCreated.size}`);
  console.log(`  - Grades created: ${stats.gradesCreated.size}`);
  console.log(`  - Subjects created: ${stats.subjectsCreated.size}`);
  console.log(`  - BoardGradeSubjects created: ${stats.boardGradeSubjectsCreated.size}`);
  console.log(`  - Modules created: ${stats.modulesCreated.size}`);
  console.log(`  - Questions created: ${stats.questionsCreated}`);
  console.log(`  - Explanations cached: ${stats.explanationsCached}`);
  console.log(`  - Explanations failed: ${stats.explanationsFailed}`);

  return {
    success: true,
    created: stats.questionsCreated,
    boardsCreated: stats.boardsCreated.size,
    gradesCreated: stats.gradesCreated.size,
    subjectsCreated: stats.subjectsCreated.size,
    boardGradeSubjectsCreated: stats.boardGradeSubjectsCreated.size,
    modulesCreated: stats.modulesCreated.size,
    explanationsCached: stats.explanationsCached,
    explanationsFailed: stats.explanationsFailed,
    errors: errors.length > 0 ? errors : undefined,
  };
}
