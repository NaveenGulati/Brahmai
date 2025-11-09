/**
 * Database operations for multi-tenant EdTech platform
 * Performance-optimized with proper indexing, selective fields, and efficient joins
 */

import { eq, and, desc, sql, gte, lte, isNotNull, inArray, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { 
  users, InsertUser,
  parentProfiles, InsertParentProfile,
  childProfiles, InsertChildProfile,
  teacherProfiles, InsertTeacherProfile,
  gradeHistory, InsertGradeHistory,
  teacherStudentAssignments, InsertTeacherStudentAssignment,
  boards, grades, subjects,
  boardGradeSubjects,
  modules, InsertModule,
  questions, InsertQuestion,
  quizSessions, InsertQuizSession,
  quizResponses, InsertQuizResponse,
  achievements, InsertAchievement,
  userAchievements, InsertUserAchievement,
  activityLog, InsertActivityLog,
  challenges, InsertChallenge,
  qbAdminAssignments, InsertQBAdminAssignment,
  aiExplanationCache,
  explanationVersions, InsertExplanationVersion,
  studentGroups,
  studentGroupMembers,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL, {
        prepare: false,
        onnotice: () => {},
        // Set search_path for all queries
        options: 'search_path=public'
      });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= USER OPERATIONS =============

export async function upsertUser(user: InsertUser): Promise<number | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return undefined;
  }

  try {
    const values: InsertUser = {
      role: user.role || 'child' // Default role if not provided
    };
    const updateSet: Record<string, unknown> = {};

    // Handle openId or username (one must be present)
    if (user.openId) {
      values.openId = user.openId;
    }
    if (user.username) {
      values.username = user.username;
    }
    if (user.passwordHash) {
      values.passwordHash = user.passwordHash;
    }

    // Optional fields
    if (user.name !== undefined) {
      values.name = user.name;
      updateSet.name = user.name;
    }
    if (user.email !== undefined) {
      values.email = user.email;
      updateSet.email = user.email;
    }
    if (user.loginMethod !== undefined) {
      values.loginMethod = user.loginMethod;
      updateSet.loginMethod = user.loginMethod;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }
    if (user.isActive !== undefined) {
      values.isActive = user.isActive;
      updateSet.isActive = user.isActive;
    }
    if (user.isEmailVerified !== undefined) {
      values.isEmailVerified = user.isEmailVerified;
      updateSet.isEmailVerified = user.isEmailVerified;
    }

    // Set owner as parent if matching
    if (user.openId === ENV.ownerId && !values.role) {
      values.role = 'parent';
      updateSet.role = 'parent';
    }

    // Update lastSignedIn
    values.lastSignedIn = new Date();
    updateSet.lastSignedIn = new Date();

    // PostgreSQL upsert using onConflictDoUpdate
    const result = await db.insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: user.openId ? users.openId : users.username,
        set: updateSet,
      })
      .returning({ id: users.id });

    return result[0]?.id;
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

// ============= CHILD PROFILE OPERATIONS =============

export async function createChildProfile(data: InsertChildProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(childProfiles).values(data);
}

export async function getChildProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(childProfiles).where(eq(childProfiles.userId, userId)).limit(1);
  return result[0];
}

export async function getChildrenByParent(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Efficient join - only fetch needed fields
  return db.select({
    id: users.id,
    name: users.name,
    username: users.username,
    isActive: users.isActive,
    currentGrade: childProfiles.currentGrade,
    board: childProfiles.board,
    schoolName: childProfiles.schoolName,
    totalPoints: childProfiles.totalPoints,
    currentStreak: childProfiles.currentStreak,
    longestStreak: childProfiles.longestStreak,
    lastActivityDate: childProfiles.lastActivityDate,
  })
    .from(childProfiles)
    .innerJoin(users, eq(childProfiles.userId, users.id))
    .where(eq(childProfiles.parentId, parentId));
}

export async function updateChildProfile(userId: number, data: Partial<InsertChildProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(childProfiles).set(data).where(eq(childProfiles.userId, userId));
}

export async function deleteChildAccount(childId: number, parentId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Verify ownership
  const child = await db.select()
    .from(childProfiles)
    .where(and(
      eq(childProfiles.userId, childId),
      eq(childProfiles.parentId, parentId)
    ))
    .limit(1);

  if (child.length === 0) {
    throw new Error('Child account not found or access denied');
  }

  // Delete profile and user (cascade will handle related data)
  await db.delete(childProfiles).where(eq(childProfiles.userId, childId));
  await db.delete(users).where(eq(users.id, childId));
  
  return { success: true };
}

// ============= PARENT PROFILE OPERATIONS =============

export async function createParentProfile(data: InsertParentProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(parentProfiles).values(data);
}

export async function getParentProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(parentProfiles).where(eq(parentProfiles.userId, userId)).limit(1);
  return result[0];
}

// ============= TEACHER PROFILE OPERATIONS =============

export async function createTeacherProfile(data: InsertTeacherProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(teacherProfiles).values(data);
}

export async function getTeacherProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(teacherProfiles).where(eq(teacherProfiles.userId, userId)).limit(1);
  return result[0];
}

// ============= POINTS & STREAK OPERATIONS (Performance-optimized) =============

export async function updateChildPoints(userId: number, pointsToAdd: number) {
  const db = await getDb();
  if (!db) return;
  
  // Atomic increment - no race conditions
  await db.update(childProfiles)
    .set({ totalPoints: sql`${childProfiles.totalPoints} + ${pointsToAdd}` })
    .where(eq(childProfiles.userId, userId));
}

export async function updateChildStreak(userId: number, currentStreak: number, longestStreak: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(childProfiles)
    .set({ 
      currentStreak, 
      longestStreak,
      lastActivityDate: new Date()
    })
    .where(eq(childProfiles.userId, userId));
}

// ============= BOARD, GRADE, SUBJECT OPERATIONS =============

export async function getAllBoards() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(boards).orderBy(boards.displayOrder);
}

export async function getAllGrades() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(grades).orderBy(grades.displayOrder);
}

export async function getAllSubjects() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subjects).orderBy(subjects.displayOrder);
}

export async function getSubjectsByBoardAndGrade(boardId: number, gradeId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Efficient join with filtering
  return db.select({
    id: subjects.id,
    name: subjects.name,
    code: subjects.code,
    category: subjects.category,
    icon: subjects.icon,
    color: subjects.color,
    isCompulsory: boardGradeSubjects.isCompulsory,
  })
    .from(boardGradeSubjects)
    .innerJoin(subjects, eq(boardGradeSubjects.subjectId, subjects.id))
    .where(and(
      eq(boardGradeSubjects.boardId, boardId),
      eq(boardGradeSubjects.gradeId, gradeId)
    ))
    .orderBy(boardGradeSubjects.displayOrder);
}

// ============= MODULE OPERATIONS =============

export async function getModulesBySubject(subjectId: number, boardId?: number, gradeId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(modules.subjectId, subjectId)];
  if (boardId) conditions.push(eq(modules.boardId, boardId));
  if (gradeId) conditions.push(eq(modules.gradeId, gradeId));
  
  return db.select().from(modules)
    .where(and(...conditions))
    .orderBy(modules.orderIndex);
}

export async function getModuleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(modules).where(eq(modules.id, id)).limit(1);
  return result[0];
}

export async function createModule(data: InsertModule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(modules).values(data);
}

// ============= QUESTION OPERATIONS (Performance-optimized) =============

export async function getQuestionsByModule(moduleId: number, limit?: number) {
  const db = await getDb();
  if (!db) return [];
  
  // First, get the module's subject and topic
  const moduleData = await db
    .select({
      subjectId: modules.subjectId,
      name: modules.name,
    })
    .from(modules)
    .where(eq(modules.id, moduleId))
    .limit(1);
  
  if (moduleData.length === 0) return [];
  
  // Get subject name
  const subjectData = await db
    .select({ name: subjects.name })
    .from(subjects)
    .where(eq(subjects.id, moduleData[0].subjectId))
    .limit(1);
  
  if (subjectData.length === 0) return [];
  
  const subjectName = subjectData[0].name;
  const topicName = moduleData[0].name;
  
  // Now fetch questions by subject (and optionally topic if it matches)
  // If topic name matches a question topic exactly, use it; otherwise just match by subject
  let query = db.select({
    id: questions.id,
    questionType: questions.questionType,
    questionText: questions.questionText,
    questionImage: questions.questionImage,
    options: questions.options,
    correctAnswer: questions.correctAnswer,
    explanation: questions.explanation,
    difficulty: questions.difficulty,
    points: questions.points,
    timeLimit: questions.timeLimit,
    topic: questions.topic,
    subTopic: questions.subTopic,
  })
    .from(questions)
    .where(and(
      eq(questions.subject, subjectName),
      eq(questions.status, 'approved'),
      eq(questions.isActive, true)
    ));
  
  if (limit) {
    query = query.limit(limit) as any;
  }
  
  return query;
}

export async function getQuestionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  return result[0];
}

export async function getQuestionsByIds(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return [];
  return db.select().from(questions).where(inArray(questions.id, ids));
}

export async function createQuestion(data: InsertQuestion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(questions).values(data);
}

export async function bulkCreateQuestions(questionsData: InsertQuestion[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Batch insert for performance
  return db.insert(questions).values(questionsData);
}

// ============= QUIZ SESSION OPERATIONS (Performance-optimized) =============

export async function createQuizSession(data: InsertQuizSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quizSessions).values(data).returning({ id: quizSessions.id });
  return result[0].id;
}

export async function getQuizSessionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(quizSessions).where(eq(quizSessions.id, id)).limit(1);
  return result[0];
}

export async function updateQuizSession(id: number, data: Partial<InsertQuizSession>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Clear cache if quiz is being marked as completed
  if (data.isCompleted === true) {
    const session = await getQuizSessionById(id);
    if (session) {
      clearChildResponsesCache(session.childId);
    }
  }
  
  return db.update(quizSessions).set(data).where(eq(quizSessions.id, id));
}

export async function getUserQuizHistory(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  
  // Optimized join - only fetch needed fields
  return db.select({
    id: quizSessions.id,
    userId: quizSessions.childId,
    moduleId: quizSessions.moduleId,
    startedAt: quizSessions.startedAt,
    completedAt: quizSessions.completedAt,
    totalQuestions: quizSessions.totalQuestions,
    correctAnswers: quizSessions.correctAnswers,
    wrongAnswers: quizSessions.wrongAnswers,
    scorePercentage: quizSessions.scorePercentage,
    totalPoints: quizSessions.totalPoints,
    timeTaken: quizSessions.timeTaken,
    isCompleted: quizSessions.isCompleted,
    moduleName: modules.name,
    subjectName: subjects.name,
  })
    .from(quizSessions)
    .leftJoin(modules, eq(quizSessions.moduleId, modules.id))
    .leftJoin(subjects, eq(modules.subjectId, subjects.id))
    .where(and(
      eq(quizSessions.childId, userId),
      eq(quizSessions.isCompleted, true)
    ))
    .orderBy(desc(quizSessions.completedAt))
    .limit(limit);
}

export async function getModuleQuizHistory(userId: number, moduleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizSessions)
    .where(and(
      eq(quizSessions.childId, userId),
      eq(quizSessions.moduleId, moduleId),
      eq(quizSessions.isCompleted, true)
    ))
    .orderBy(desc(quizSessions.completedAt));
}

// ============= QUIZ RESPONSE OPERATIONS =============

export async function createQuizResponse(data: InsertQuizResponse) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(quizResponses).values(data);
}

export async function bulkCreateQuizResponses(responses: InsertQuizResponse[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Batch insert for performance
  return db.insert(quizResponses).values(responses);
}

export async function getSessionResponses(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizResponses)
    .where(eq(quizResponses.sessionId, sessionId))
    .orderBy(quizResponses.id);
}

// Cache for child responses (cleared on server restart)
const childResponsesCache = new Map<number, { data: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getChildResponses(childId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Check cache first
  const cached = childResponsesCache.get(childId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  // Get responses from recent sessions only (last 100 sessions or 90 days)
  const recentSessions = await db.select({ id: quizSessions.id })
    .from(quizSessions)
    .where(and(
      eq(quizSessions.childId, childId),
      gte(quizSessions.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
    ))
    .orderBy(desc(quizSessions.createdAt))
    .limit(100);
  
  const sessionIds = recentSessions.map(s => s.id);
  if (sessionIds.length === 0) {
    childResponsesCache.set(childId, { data: [], timestamp: Date.now() });
    return [];
  }
  
  // Fetch only necessary fields for performance
  const responses = await db.select({
    questionId: quizResponses.questionId,
    isCorrect: quizResponses.isCorrect,
    sessionId: quizResponses.sessionId,
  }).from(quizResponses)
    .where(inArray(quizResponses.sessionId, sessionIds))
    .orderBy(quizResponses.id);
  
  // Cache the result
  childResponsesCache.set(childId, { data: responses, timestamp: Date.now() });
  
  return responses;
}

// Clear cache for a specific child (call after quiz completion)
export function clearChildResponsesCache(childId: number) {
  childResponsesCache.delete(childId);
}

export async function getSessionResponsesWithQuestions(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Efficient join
  return db.select({
    responseId: quizResponses.id,
    questionId: quizResponses.questionId,
    userAnswer: quizResponses.userAnswer,
    isCorrect: quizResponses.isCorrect,
    timeSpent: quizResponses.timeSpent,
    pointsEarned: quizResponses.pointsEarned,
    questionText: questions.questionText,
    options: questions.options,
    correctAnswer: questions.correctAnswer,
    explanation: questions.explanation,
    difficulty: questions.difficulty,
    topic: questions.topic,
    subTopic: questions.subTopic,
  })
    .from(quizResponses)
    .innerJoin(questions, eq(quizResponses.questionId, questions.id))
    .where(eq(quizResponses.sessionId, sessionId))
    .orderBy(quizResponses.id);
}

// ============= ACHIEVEMENT OPERATIONS =============

export async function getAllAchievements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(achievements).where(eq(achievements.isActive, true));
}

export async function getUserAchievements(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    achievementId: userAchievements.achievementId,
    earnedAt: userAchievements.earnedAt,
    name: achievements.name,
    description: achievements.description,
    icon: achievements.icon,
    category: achievements.category,
    points: achievements.points,
    rarity: achievements.rarity,
  })
    .from(userAchievements)
    .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.earnedAt));
}

export async function awardAchievement(userId: number, achievementId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db.insert(userAchievements).values({
      userId,
      achievementId,
      earnedAt: new Date(),
    });
    return true;
  } catch (error) {
    // Duplicate key - already earned
    return false;
  }
}

// ============= CHALLENGE OPERATIONS =============

export async function createChallenge(data: InsertChallenge) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(challenges).values(data).returning();
  return result[0];
}

export async function getChallengesForChild(childId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(challenges)
    .where(and(
      eq(challenges.assignedTo, childId),
      eq(challenges.assignedToType, 'individual')
    ))
    .orderBy(desc(challenges.createdAt));
}

export async function getChallengesByParent(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(challenges)
    .where(eq(challenges.assignedBy, parentId))
    .orderBy(desc(challenges.createdAt));
}

export async function updateChallenge(id: number, data: Partial<InsertChallenge>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(challenges).set(data).where(eq(challenges.id, id));
}

// ============= AI EXPLANATION CACHE (Performance-optimized) =============

export async function getCachedExplanation(questionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select()
    .from(aiExplanationCache)
    .where(eq(aiExplanationCache.questionId, questionId))
    .limit(1);
  
  if (result[0]) {
    // Update usage stats asynchronously (don't block)
    db.update(aiExplanationCache)
      .set({
        timesUsed: sql`${aiExplanationCache.timesUsed} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(aiExplanationCache.questionId, questionId))
      .catch(err => console.error("[Cache] Failed to update usage:", err));
  }
  
  return result[0];
}

export async function cacheExplanation(questionId: number, explanation: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db.insert(aiExplanationCache).values({
      questionId,
      detailedExplanation: explanation,
      timesUsed: 1,
      generatedAt: new Date(),
      lastUsedAt: new Date(),
    });
    return true;
  } catch (error) {
    // Duplicate key - already cached
    console.warn("[Cache] Explanation already cached for question", questionId);
    return false;
  }
}

// ============= ACTIVITY LOG (Performance-optimized) =============

export async function logActivity(data: InsertActivityLog) {
  const db = await getDb();
  if (!db) return;
  
  // Fire and forget - don't block on logging
  db.insert(activityLog).values(data).catch(err => 
    console.error("[ActivityLog] Failed to log:", err)
  );
}

// ============= TEACHER-STUDENT ASSIGNMENT OPERATIONS =============

export async function assignTeacherToStudent(data: InsertTeacherStudentAssignment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(teacherStudentAssignments).values(data);
}

export async function getStudentsByTeacher(teacherId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    assignmentId: teacherStudentAssignments.id,
    studentId: users.id,
    studentName: users.name,
    currentGrade: childProfiles.currentGrade,
    board: childProfiles.board,
    subjectId: teacherStudentAssignments.subjectIds,
    assignedAt: teacherStudentAssignments.assignedAt,
  })
    .from(teacherStudentAssignments)
    .innerJoin(users, eq(teacherStudentAssignments.childId, users.id))
    .innerJoin(childProfiles, eq(users.id, childProfiles.userId))
    .where(eq(teacherStudentAssignments.teacherId, teacherId));
}

export async function getTeachersByStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    assignmentId: teacherStudentAssignments.id,
    teacherId: users.id,
    teacherName: users.name,
    teacherEmail: users.email,
    subjectId: teacherStudentAssignments.subjectIds,
    assignedAt: teacherStudentAssignments.assignedAt,
  })
    .from(teacherStudentAssignments)
    .innerJoin(users, eq(teacherStudentAssignments.teacherId, users.id))
    .where(eq(teacherStudentAssignments.childId, studentId));
}

// ============= QB ADMIN OPERATIONS =============

export async function getQBAdminAssignments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(qbAdminAssignments)
    .where(eq(qbAdminAssignments.userId, userId));
}

export async function canUserManageQuestions(
  userId: number, 
  boardId: number, 
  gradeId: number, 
  subjectId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Check if user is superadmin
  const user = await getUserById(userId);
  if (user?.role === 'superadmin') return true;
  
  // Check QB admin assignments
  const assignments = await db.select()
    .from(qbAdminAssignments)
    .where(and(
      eq(qbAdminAssignments.userId, userId),
      eq(qbAdminAssignments.boardId, boardId),
      eq(qbAdminAssignments.gradeId, gradeId),
      or(
        eq(qbAdminAssignments.subjectId, subjectId),
        sql`${qbAdminAssignments.subjectId} IS NULL` // NULL means all subjects
      )
    ))
    .limit(1);
  
  return assignments.length > 0;
}

// ============= ANALYTICS (Performance-optimized with aggregations) =============

export async function getChildAnalytics(childId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const profile = await getChildProfile(childId);
  if (!profile) return null;
  
  // Efficient aggregation query
  const stats = await db.select({
    totalQuizzes: sql<number>`COUNT(*)`,
    completedQuizzes: sql<number>`SUM(CASE WHEN ${quizSessions.isCompleted} = 1 THEN 1 ELSE 0 END)`,
    avgScore: sql<number>`ROUND(AVG(${quizSessions.scorePercentage}), 2)`,
    totalTimeSpent: sql<number>`SUM(${quizSessions.timeTaken})`,
  })
    .from(quizSessions)
    .where(eq(quizSessions.childId, childId));
  
  return {
    ...profile,
    ...stats[0],
  };
}

export async function getParentDashboardStats(parentId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Get all children
  const children = await getChildrenByParent(parentId);
  
  // Aggregate stats across all children
  const childIds = children.map(c => c.id);
  if (childIds.length === 0) return { children: [], totalChildren: 0 };
  
  const stats = await db.select({
    totalQuizzes: sql<number>`COUNT(*)`,
    avgScore: sql<number>`ROUND(AVG(${quizSessions.scorePercentage}), 2)`,
  })
    .from(quizSessions)
    .where(inArray(quizSessions.childId, childIds));
  
  return {
    children,
    totalChildren: children.length,
    ...stats[0],
  };
}



// ============= MISSING FUNCTIONS FOR BACKWARD COMPATIBILITY =============

export async function getSubjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
  return result[0];
}

export async function getUserActivityLog(userId: number, startDate?: Date, endDate?: Date, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(activityLog.userId, userId)];
  if (startDate) conditions.push(gte(activityLog.activityDate, startDate));
  if (endDate) conditions.push(lte(activityLog.activityDate, endDate));
  
  return db.select().from(activityLog)
    .where(and(...conditions))
    .orderBy(desc(activityLog.activityDate))
    .limit(limit);
}

export async function getChildChallenges(childId: number) {
  return getChallengesForChild(childId);
}

export async function updateChallengeStatus(challengeId: number, status: string) {
  return updateChallenge(challengeId, { status: status as any });
}

// Alias for backward compatibility
export async function getUser(openId: string) {
  return getUserByOpenId(openId);
}

export async function updateModule(id: number, data: Partial<InsertModule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(modules).set(data).where(eq(modules.id, id));
}

export async function deleteModule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(modules).where(eq(modules.id, id));
}

export async function updateQuestion(id: number, data: Partial<InsertQuestion>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(questions).set(data).where(eq(questions.id, id));
}

export async function deleteQuestion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Soft delete - set isActive to false to preserve quiz history
  return db.update(questions).set({ isActive: false }).where(eq(questions.id, id));
}

export async function createSubject(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(subjects).values(data);
}

export async function createAchievement(data: InsertAchievement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(achievements).values(data);
}

export async function updateAchievement(id: number, data: Partial<InsertAchievement>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(achievements).set(data).where(eq(achievements.id, id));
}

export async function deleteAchievement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(achievements).set({ isActive: false }).where(eq(achievements.id, id));
}



// ============= STATS & HISTORY FUNCTIONS =============

export async function getUserStats(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Check if user is a child
  const childProfile = await getChildProfile(userId);
  if (!childProfile) return null;
  
  // Get quiz stats (only count completed quizzes)
  const quizStats = await db.select({
    totalQuizzes: sql<number>`COUNT(*)`,
    completedQuizzes: sql<number>`COUNT(*)`,
    avgScore: sql<number>`ROUND(COALESCE(AVG(${quizSessions.scorePercentage}), 0), 2)`,
    totalCorrect: sql<number>`COALESCE(SUM(${quizSessions.correctAnswers}), 0)`,
    totalWrong: sql<number>`COALESCE(SUM(${quizSessions.wrongAnswers}), 0)`,
  })
    .from(quizSessions)
    .where(and(
      eq(quizSessions.childId, userId),
      eq(quizSessions.isCompleted, true)
    ));
  
  return {
    ...childProfile,
    ...quizStats[0],
  };
}

export async function getPointsHistory(userId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Get detailed quiz sessions with subject and module info
  return db.select({
    id: quizSessions.id,
    subjectName: subjects.name,
    moduleName: modules.name,
    completedAt: quizSessions.completedAt,
    totalPoints: quizSessions.totalPoints,
    scorePercentage: sql<number>`ROUND((${quizSessions.correctAnswers} * 100.0 / ${quizSessions.totalQuestions}), 1)`,
  })
    .from(quizSessions)
    .leftJoin(modules, eq(quizSessions.moduleId, modules.id))
    .leftJoin(subjects, eq(modules.subjectId, subjects.id))
    .where(and(
      eq(quizSessions.childId, userId),
      eq(quizSessions.isCompleted, true),
      gte(quizSessions.completedAt, startDate)
    ))
    .orderBy(desc(quizSessions.completedAt));
}

export async function getSubjectProgress(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Aggregate quiz performance by subject
  return db.select({
    subjectId: subjects.id,
    subjectName: subjects.name,
    subjectIcon: subjects.icon,
    subjectColor: subjects.color,
    totalQuizzes: sql<number>`COUNT(DISTINCT ${quizSessions.id})`,
    avgScore: sql<number>`ROUND(COALESCE(AVG(${quizSessions.scorePercentage}), 0), 2)`,
    totalPoints: sql<number>`COALESCE(SUM(${quizSessions.totalPoints}), 0)`,
  })
    .from(quizSessions)
    .innerJoin(modules, eq(quizSessions.moduleId, modules.id))
    .innerJoin(subjects, eq(modules.subjectId, subjects.id))
    .where(and(
      eq(quizSessions.childId, userId),
      eq(quizSessions.isCompleted, true)
    ))
    .groupBy(subjects.id, subjects.name, subjects.icon, subjects.color);
}

export async function getRecentActivity(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: activityLog.id,
    activityDate: activityLog.activityDate,
    quizzesTaken: activityLog.quizzesTaken,
    questionsAnswered: activityLog.questionsAnswered,
    pointsEarned: activityLog.pointsEarned,
    timeSpent: activityLog.timeSpent,
  })
    .from(activityLog)
    .where(eq(activityLog.userId, userId))
    .orderBy(desc(activityLog.activityDate))
    .limit(limit);
}

export async function getWeakTopics(userId: number, limit: number = 5) {
  const db = await getDb();
  if (!db) return [];
  
  // Find topics with lowest average scores
  return db.select({
    topic: questions.topic,
    subTopic: questions.subTopic,
    totalAttempts: sql<number>`COUNT(*)`,
    correctCount: sql<number>`SUM(CASE WHEN ${quizResponses.isCorrect} = 1 THEN 1 ELSE 0 END)`,
    accuracy: sql<number>`(SUM(CASE WHEN ${quizResponses.isCorrect} = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*))`,
  })
    .from(quizResponses)
    .innerJoin(quizSessions, eq(quizResponses.sessionId, quizSessions.id))
    .innerJoin(questions, eq(quizResponses.questionId, questions.id))
    .where(eq(quizSessions.childId, userId))
    .groupBy(questions.topic, questions.subTopic)
    .having(sql`COUNT(*) >= 3`) // At least 3 attempts
    .orderBy(sql`accuracy ASC`)
    .limit(limit);
}

export async function getStrongTopics(userId: number, limit: number = 5) {
  const db = await getDb();
  if (!db) return [];
  
  // Find topics with highest average scores
  return db.select({
    topic: questions.topic,
    subTopic: questions.subTopic,
    totalAttempts: sql<number>`COUNT(*)`,
    correctCount: sql<number>`SUM(CASE WHEN ${quizResponses.isCorrect} = 1 THEN 1 ELSE 0 END)`,
    accuracy: sql<number>`(SUM(CASE WHEN ${quizResponses.isCorrect} = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*))`,
  })
    .from(quizResponses)
    .innerJoin(quizSessions, eq(quizResponses.sessionId, quizSessions.id))
    .innerJoin(questions, eq(quizResponses.questionId, questions.id))
    .where(eq(quizSessions.childId, userId))
    .groupBy(questions.topic, questions.subTopic)
    .having(sql`COUNT(*) >= 3`) // At least 3 attempts
    .orderBy(sql`accuracy DESC`)
    .limit(limit);
}



export async function deleteChallenge(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(challenges).where(eq(challenges.id, id));
}



// ============= QUESTION BANK FILTER FUNCTIONS =============

export async function getAllQuestionsWithFilters(filters: {
  board?: string;
  grade?: number;
  subject?: string;
  topic?: string;
  difficulty?: string;
  status?: string;
  scope?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(questions.isActive, true) // Only show active questions
  ];
  if (filters.board) conditions.push(eq(questions.board, filters.board));
  if (filters.grade) conditions.push(eq(questions.grade, filters.grade));
  if (filters.subject) conditions.push(eq(questions.subject, filters.subject));
  if (filters.topic) conditions.push(eq(questions.topic, filters.topic));
  if (filters.difficulty) conditions.push(eq(questions.difficulty, filters.difficulty as any));
  if (filters.status) conditions.push(eq(questions.status, filters.status as any));
  if (filters.scope) conditions.push(eq(questions.scope, filters.scope as any));
  
  let query = db.select().from(questions);
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(questions.createdAt)) as any;
  
  if (filters.limit) {
    query = query.limit(filters.limit) as any;
  }
  
  if (filters.offset) {
    query = query.offset(filters.offset) as any;
  }
  
  return query;
}

export async function getUniqueSubjects(board?: string, grade?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (board) conditions.push(eq(questions.board, board));
  if (grade) conditions.push(eq(questions.grade, grade));
  
  let query = db.selectDistinct({
    subject: questions.subject,
  })
    .from(questions);
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  const result = await query;
  return result.map(r => r.subject);
}

export async function getUniqueTopicsForSubject(subject: string, board?: string, grade?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(questions.subject, subject)];
  if (board) conditions.push(eq(questions.board, board));
  if (grade) conditions.push(eq(questions.grade, grade));
  
  const result = await db.selectDistinct({
    topic: questions.topic,
  })
    .from(questions)
    .where(and(...conditions))
    .orderBy(questions.topic);
    
  return result.map(r => r.topic).filter(Boolean) as string[];
}



export async function bulkUploadQuestionsWithMetadata(questionsData: InsertQuestion[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const errors: string[] = [];
  let created = 0;
  
  // Insert questions one by one to track errors
  for (const questionData of questionsData) {
    try {
      await db.insert(questions).values(questionData);
      created++;
    } catch (error) {
      errors.push(`Failed to insert question: ${questionData.questionText.substring(0, 50)}...`);
    }
  }
  
  return {
    created,
    subjectsCreated: 0, // Auto-creation not implemented yet
    modulesCreated: 0,  // Auto-creation not implemented yet
    errors,
  };
}



// ============= TEACHER FUNCTIONS =============

export async function getTeacherClasses(teacherId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const classes = await db.select({
    id: studentGroups.id,
    name: studentGroups.name,
    description: studentGroups.description,
    board: studentGroups.board,
    grade: studentGroups.grade,
    subjectId: studentGroups.subjectId,
    isActive: studentGroups.isActive,
    createdAt: studentGroups.createdAt,
  })
    .from(studentGroups)
    .where(eq(studentGroups.teacherId, teacherId))
    .orderBy(desc(studentGroups.createdAt));
  
  // Get student count for each class
  const classesWithCount = await Promise.all(
    classes.map(async (cls) => {
      const members = await db!.select({ count: sql<number>`count(*)` })
        .from(studentGroupMembers)
        .where(eq(studentGroupMembers.groupId, cls.id));
      
      return {
        ...cls,
        studentCount: members[0]?.count || 0,
      };
    })
  );
  
  return classesWithCount;
}

export async function createClass(data: {
  teacherId: number;
  name: string;
  description?: string;
  board: 'CBSE' | 'ICSE' | 'IB' | 'State' | 'Other';
  grade: number;
  subjectId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(studentGroups).values(data).returning({ id: studentGroups.id });
  return { id: result[0].id, ...data };
}

export async function updateClass(
  classId: number,
  data: { name?: string; description?: string; isActive?: boolean },
  teacherId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify teacher owns this class
  const existing = await db.select()
    .from(studentGroups)
    .where(and(eq(studentGroups.id, classId), eq(studentGroups.teacherId, teacherId)))
    .limit(1);
  
  if (existing.length === 0) {
    throw new Error("Class not found or unauthorized");
  }
  
  await db.update(studentGroups)
    .set(data)
    .where(eq(studentGroups.id, classId));
  
  return { success: true };
}

export async function deleteClass(classId: number, teacherId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify teacher owns this class
  const existing = await db.select()
    .from(studentGroups)
    .where(and(eq(studentGroups.id, classId), eq(studentGroups.teacherId, teacherId)))
    .limit(1);
  
  if (existing.length === 0) {
    throw new Error("Class not found or unauthorized");
  }
  
  // Delete all members first
  await db.delete(studentGroupMembers)
    .where(eq(studentGroupMembers.groupId, classId));
  
  // Delete the class
  await db.delete(studentGroups)
    .where(eq(studentGroups.id, classId));
  
  return { success: true };
}

export async function getClassStudents(classId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const students = await db.select({
    id: childProfiles.id,
    userId: childProfiles.userId,
    name: users.name,
    username: users.username,
    totalPoints: childProfiles.totalPoints,
    currentStreak: childProfiles.currentStreak,
    addedAt: studentGroupMembers.addedAt,
  })
    .from(studentGroupMembers)
    .innerJoin(childProfiles, eq(studentGroupMembers.childId, childProfiles.id))
    .innerJoin(users, eq(childProfiles.userId, users.id))
    .where(eq(studentGroupMembers.groupId, classId))
    .orderBy(users.name);
  
  return students;
}

export async function addStudentToClass(classId: number, childId: number, teacherId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if already exists
  const existing = await db.select()
    .from(studentGroupMembers)
    .where(and(
      eq(studentGroupMembers.groupId, classId),
      eq(studentGroupMembers.childId, childId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    throw new Error("Student already in this class");
  }
  
  await db.insert(studentGroupMembers).values({
    groupId: classId,
    childId,
    addedBy: teacherId,
  });
  
  return { success: true };
}

export async function removeStudentFromClass(classId: number, childId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(studentGroupMembers)
    .where(and(
      eq(studentGroupMembers.groupId, classId),
      eq(studentGroupMembers.childId, childId)
    ));
  
  return { success: true };
}

export async function getClassPerformance(classId: number) {
  const db = await getDb();
  if (!db) return { students: [], classAverage: 0, totalQuizzes: 0 };
  
  const students = await getClassStudents(classId);
  
  // Get stats for each student
  const studentsWithStats = await Promise.all(
    students.map(async (student) => {
      const stats = await getUserStats(student.userId);
      return {
        ...student,
        stats,
      };
    })
  );
  
  const totalQuizzes = studentsWithStats.reduce((sum, s) => sum + (s.stats?.totalQuizzes || 0), 0);
  const totalScore = studentsWithStats.reduce((sum, s) => sum + (s.stats?.avgScore || 0), 0);
  const classAverage = students.length > 0 ? Math.round(totalScore / students.length) : 0;
  
  return {
    students: studentsWithStats,
    classAverage,
    totalQuizzes,
  };
}

export async function searchChildrenByUsername(query: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (query.length < 2) return [];
  
  const children = await db.select({
    id: childProfiles.id,
    userId: childProfiles.userId,
    name: users.name,
    username: users.username,
  })
    .from(childProfiles)
    .innerJoin(users, eq(childProfiles.userId, users.id))
    .where(sql`${users.username} LIKE ${`%${query}%`}`)
    .limit(10);
  
  return children;
}




// ============= SUPER ADMIN FUNCTIONS =============

export async function getAllUsersWithDetails(filters: {
  role?: 'parent' | 'child' | 'teacher' | 'qb_admin' | 'superadmin';
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const { role, search, limit = 50, offset = 0 } = filters;

  let query = db.select({
    id: users.id,
    openId: users.openId,
    name: users.name,
    email: users.email,
    username: users.username,
    role: users.role,
    loginMethod: users.loginMethod,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users);

  const conditions = [];
  if (role) {
    conditions.push(eq(users.role, role));
  }
  if (search) {
    conditions.push(
      or(
        sql`${users.name} LIKE ${`%${search}%`}`,
        sql`${users.email} LIKE ${`%${search}%`}`,
        sql`${users.username} LIKE ${`%${search}%`}`
      )!
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const result = await query
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  return result;
}

export async function updateUserRole(
  userId: number,
  newRole: 'parent' | 'child' | 'teacher' | 'qb_admin' | 'superadmin'
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ role: newRole })
    .where(eq(users.id, userId));

  return { success: true };
}

export async function getPlatformStatistics() {
  const db = await getDb();
  if (!db) return {
    totalUsers: 0,
    usersByRole: {},
    totalQuizzes: 0,
    totalQuestions: 0,
    activeUsers7Days: 0,
  };

  // Get total users by role
  const userCounts = await db.select({
    role: users.role,
    count: sql<number>`count(*)`,
  })
    .from(users)
    .groupBy(users.role);

  const usersByRole: Record<string, number> = {};
  let totalUsers = 0;
  userCounts.forEach(({ role, count }) => {
    usersByRole[role] = count;
    totalUsers += count;
  });

  // Get total quizzes
  const quizCount = await db.select({ count: sql<number>`count(*)` })
    .from(quizSessions);
  const totalQuizzes = quizCount[0]?.count || 0;

  // Get total questions
  const questionCount = await db.select({ count: sql<number>`count(*)` })
    .from(questions);
  const totalQuestions = questionCount[0]?.count || 0;

  // Get active users (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const activeCount = await db.select({ count: sql<number>`count(distinct ${users.id})` })
    .from(users)
    .where(gte(users.lastSignedIn, sevenDaysAgo));
  const activeUsers7Days = activeCount[0]?.count || 0;

  return {
    totalUsers,
    usersByRole,
    totalQuizzes,
    totalQuestions,
    activeUsers7Days,
  };
}

export async function getUsersByRole(role: 'parent' | 'child' | 'teacher' | 'qb_admin' | 'superadmin') {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    username: users.username,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  })
    .from(users)
    .where(eq(users.role, role))
    .orderBy(desc(users.createdAt));

  return result;
}



// ==================== Shared AI Explanation & Audio Functions ====================

import { invokeLLM } from './_core/llm';
import { bulkUploadQuestionsUserFriendly as bulkUploadUserFriendly } from './db-upload-helper';

export { bulkUploadUserFriendly as bulkUploadQuestionsUserFriendly };
import { generateSpeech } from './_core/googleTTS';

/**
 * Shared function to generate detailed AI explanation for a question
 * Used by both parent and child routers to avoid code duplication
 */
export async function generateDetailedExplanationForQuestion(
  questionId: number,
  questionText?: string,
  correctAnswer?: string,
  userAnswer?: string,
  grade?: string
): Promise<{ detailedExplanation: string; fromCache?: boolean }> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Check cache first
  const cached = await db
    .select()
    .from(aiExplanationCache)
    .where(eq(aiExplanationCache.questionId, questionId))
    .limit(1);

  if (cached.length > 0 && cached[0].detailedExplanation) {
    console.log(`[AI] Using cached explanation for question ${questionId}`);
    
    // Update usage stats
    await updateCachedExplanationUsage(questionId);
    
    return { detailedExplanation: cached[0].detailedExplanation, fromCache: true };
  }

  // Generate new explanation
  const question = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);

  if (question.length === 0) {
    throw new Error('Question not found');
  }

  const q = question[0];
  
  // Build prompt for AI
  const gradeLevel = grade || q.grade || 7; // Use provided grade, question grade, or fallback to 7
  
  let prompt = `You are a friendly, knowledgeable teacher explaining a concept to a Grade ${gradeLevel} student who got this question wrong.

Question: ${q.questionText}
Correct Answer: ${q.correctAnswer}
Brief Explanation: ${q.explanation || 'Not provided'}

Provide a detailed, conversational explanation that:
1. Explains WHY the correct answer is right
2. Clarifies any misconceptions
3. Includes 1-2 CONCRETE, RELATABLE EXAMPLES that kids can visualize and understand
4. Uses simple examples or analogies from everyday life
5. Keeps a warm, encouraging tone

**CRITICAL RULES:**
- NO introductions like "Hello!", "You are doing great!", "Let's learn together!"
- NO conclusions like "You got this!", "Keep up the amazing work!", "Great job!", "Keep studying!"
- NO tables or complex formatting (use simple paragraphs and bullet lists only)
- Start DIRECTLY with the concept explanation
- End with the key takeaway, NO motivational fluff

IMPORTANT FORMATTING RULES:
- Use markdown formatting: **bold** for emphasis, *italics* for subtle emphasis
- Use ### for section headings to break up content
- Add relevant emojis (🎯, 💡, 🤔, ✅, 📚, 🔬, etc.) to make it visually delightful for children
- Use bullet points (- or *) for lists
- Keep paragraphs short (2-3 sentences max)
- Use friendly, conversational language
- NO long introductions or encouragement - dive straight into the explanation
- Start directly with the topic

Example format:
### 🎯 Why the Answer is [Correct Answer]

The correct answer is **[answer]** because...

### 💡 Common Misconception

Many students think... but actually...

### 🌟 Real-Life Example

[1-2 concrete examples that kids can relate to and visualize]

### 📚 Key Takeaway

Remember: [main point]

Write in a natural, spoken style as if you're talking to the student. Be direct and to the point. ALWAYS include relatable examples!`;

  if (q.questionType === 'multiple_choice' && q.options) {
    prompt += `\n\nOptions:\n${q.options.join('\n')}`;
  }

  const response = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are a helpful, patient teacher for Grade 7 students.' },
      { role: 'user', content: prompt },
    ],
  });

  const detailedExplanation = response.choices[0].message.content || 'Unable to generate explanation';

  // Cache the explanation (non-blocking - if it fails, still return the explanation)
  try {
    await db
      .insert(aiExplanationCache)
      .values({
        questionId,
        detailedExplanation,
        timesUsed: 1,
        lastUsedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: aiExplanationCache.questionId,
        set: {
          detailedExplanation,
          timesUsed: sql`COALESCE(${aiExplanationCache.timesUsed}, 0) + 1`,
          lastUsedAt: new Date(),
        },
      });
    console.log(`[AI] Generated and cached new explanation for question ${questionId}`);
  } catch (cacheError) {
    console.error(`[AI] Failed to cache explanation for question ${questionId}:`, cacheError);
    // Continue anyway - caching is optional
  }

  return { detailedExplanation, fromCache: false };
}

/**
 * Shared function to generate audio for a question's explanation
 * Used by both parent and child routers to avoid code duplication
 */
export async function generateAudioForQuestion(questionId: number): Promise<{ audioUrl: string }> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Check if audio already exists in cache
  const cached = await db
    .select()
    .from(aiExplanationCache)
    .where(eq(aiExplanationCache.questionId, questionId))
    .limit(1);

  if (cached.length > 0 && cached[0].audioUrl) {
    console.log(`[TTS] Using cached audio for question ${questionId}`);
    return { audioUrl: cached[0].audioUrl };
  }

  // Get the text explanation
  if (cached.length === 0 || !cached[0].detailedExplanation) {
    throw new Error('No explanation found. Generate explanation first.');
  }

  const explanationText = cached[0].detailedExplanation;

  // Generate audio using Google TTS
  console.log(`[TTS] Generating audio for question ${questionId}`);
  console.log(`[TTS] Explanation text preview:`, explanationText.substring(0, 300));
  const audioUrl = await generateSpeech(explanationText);

  // Update cache with audio URL
  await db
    .update(aiExplanationCache)
    .set({ audioUrl: audioUrl })
    .where(eq(aiExplanationCache.questionId, questionId));

  console.log(`[TTS] Generated and cached audio for question ${questionId}`);

  // Re-fetch from database to ensure same code path as cached audio
  const updated = await db
    .select()
    .from(aiExplanationCache)
    .where(eq(aiExplanationCache.questionId, questionId))
    .limit(1);

  const fetchedAudioUrl = updated[0]?.audioUrl;
  if (!fetchedAudioUrl) {
    throw new Error('Failed to fetch audio URL after saving');
  }

  console.log(`[TTS] Re-fetched audio URL from database`);
  return { audioUrl: fetchedAudioUrl };
}

/**
 * Update usage statistics for cached explanation
 */
async function updateCachedExplanationUsage(questionId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.execute(sql`
      UPDATE aiExplanationCache 
      SET timesUsed = COALESCE(timesUsed, 0) + 1,
          lastUsedAt = NOW()
      WHERE questionId = ${questionId}
    `);
  } catch (error) {
    console.error(`[AI] Failed to update cache usage for question ${questionId}:`, error);
    // Non-blocking - continue even if update fails
  }
}

