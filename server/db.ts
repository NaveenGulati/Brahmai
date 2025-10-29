import { eq, and, desc, sql, gte, lte, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  subjects, InsertSubject,
  modules, InsertModule,
  questions, InsertQuestion,
  quizSessions, InsertQuizSession,
  quizResponses, InsertQuizResponse,
  achievements, InsertAchievement,
  userAchievements, InsertUserAchievement,
  activityLog, InsertActivityLog,
  challenges, InsertChallenge
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= USER OPERATIONS =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerId) {
      values.role = 'parent';
      updateSet.role = 'parent';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getChildrenByParent(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.parentId, parentId));
}

export async function createChildAccount(data: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values(data);
  return result;
}

export async function deleteChildAccount(childId: number, parentId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Verify the child belongs to this parent
  const child = await db
    .select()
    .from(users)
    .where(eq(users.id, childId))
    .limit(1);

  if (child.length === 0 || child[0].parentId !== parentId) {
    throw new Error('Child account not found or access denied');
  }

  // Delete the child account
  await db.delete(users).where(eq(users.id, childId));
  return { success: true };
}

export async function updateUserPoints(userId: number, pointsToAdd: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({ totalPoints: sql`${users.totalPoints} + ${pointsToAdd}` })
    .where(eq(users.id, userId));
}

export async function updateUserStreak(userId: number, currentStreak: number, longestStreak: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({ 
      currentStreak, 
      longestStreak,
      lastActivityDate: new Date()
    })
    .where(eq(users.id, userId));
}

// ============= SUBJECT OPERATIONS =============

export async function getAllSubjects() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subjects);
}

export async function getSubjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSubject(data: InsertSubject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(subjects).values(data);
}

// ============= MODULE OPERATIONS =============

export async function getModulesBySubject(subjectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(modules)
    .where(eq(modules.subjectId, subjectId))
    .orderBy(modules.orderIndex);
}

export async function getModuleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(modules).where(eq(modules.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createModule(data: InsertModule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(modules).values(data);
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

// ============= QUESTION OPERATIONS =============

export async function getQuestionsByModule(moduleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(questions)
    .where(and(
      eq(questions.moduleId, moduleId),
      eq(questions.isActive, true)
    ));
}

export async function getQuestionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createQuestion(data: InsertQuestion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(questions).values(data);
}

// updateQuestion and deleteQuestion moved to end of file with enhanced signatures

export async function bulkCreateQuestions(questionsData: InsertQuestion[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(questions).values(questionsData);
}

// ============= QUIZ SESSION OPERATIONS =============

export async function createQuizSession(data: InsertQuizSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quizSessions).values(data);
  return Number(result[0].insertId);
}

export async function getQuizSessionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(quizSessions).where(eq(quizSessions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateQuizSession(id: number, data: Partial<InsertQuizSession>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(quizSessions).set(data).where(eq(quizSessions.id, id));
}

export async function getUserQuizHistory(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: quizSessions.id,
    userId: quizSessions.userId,
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
    .where(eq(quizSessions.userId, userId))
    .orderBy(desc(quizSessions.startedAt))
    .limit(limit);
}

export async function getModuleQuizHistory(userId: number, moduleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizSessions)
    .where(and(
      eq(quizSessions.userId, userId),
      eq(quizSessions.moduleId, moduleId)
    ))
    .orderBy(desc(quizSessions.startedAt));
}

// ============= QUIZ RESPONSE OPERATIONS =============

export async function createQuizResponse(data: InsertQuizResponse) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(quizResponses).values(data);
}

export async function getSessionResponses(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizResponses)
    .where(eq(quizResponses.sessionId, sessionId));
}

// ============= ACHIEVEMENT OPERATIONS =============

export async function getAllAchievements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(achievements);
}

export async function getUserAchievements(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    achievement: achievements,
    earnedAt: userAchievements.earnedAt
  })
  .from(userAchievements)
  .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
  .where(eq(userAchievements.userId, userId));
}

export async function awardAchievement(userId: number, achievementId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(userAchievements).values({ userId, achievementId });
}

// ============= ACTIVITY LOG OPERATIONS =============

export async function logActivity(data: InsertActivityLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if entry exists for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const existing = await db.select().from(activityLog)
    .where(and(
      eq(activityLog.userId, data.userId),
      gte(activityLog.activityDate, today)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing entry
    return db.update(activityLog)
      .set({
        quizzesTaken: sql`${activityLog.quizzesTaken} + ${data.quizzesTaken || 0}`,
        questionsAnswered: sql`${activityLog.questionsAnswered} + ${data.questionsAnswered || 0}`,
        pointsEarned: sql`${activityLog.pointsEarned} + ${data.pointsEarned || 0}`,
        timeSpent: sql`${activityLog.timeSpent} + ${data.timeSpent || 0}`,
      })
      .where(eq(activityLog.id, existing[0].id));
  } else {
    // Create new entry
    return db.insert(activityLog).values(data);
  }
}

export async function getUserActivityLog(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityLog)
    .where(and(
      eq(activityLog.userId, userId),
      gte(activityLog.activityDate, startDate),
      lte(activityLog.activityDate, endDate)
    ))
    .orderBy(desc(activityLog.activityDate));
}

// ============= STATISTICS OPERATIONS =============

export async function getUserStats(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const user = await getUserById(userId);
  const totalQuizzes = await db.select({ count: sql<number>`count(*)` })
    .from(quizSessions)
    .where(and(
      eq(quizSessions.userId, userId),
      eq(quizSessions.isCompleted, true)
    ));
  
  const avgScore = await db.select({ avg: sql<number>`avg(${quizSessions.scorePercentage})` })
    .from(quizSessions)
    .where(and(
      eq(quizSessions.userId, userId),
      eq(quizSessions.isCompleted, true)
    ));
  
  return {
    user,
    totalQuizzes: totalQuizzes[0]?.count || 0,
    averageScore: Math.round(avgScore[0]?.avg || 0),
    totalPoints: user?.totalPoints || 0,
    currentStreak: user?.currentStreak || 0,
    longestStreak: user?.longestStreak || 0,
  };
}

// ============= CHALLENGE OPERATIONS =============

export async function createChallenge(data: InsertChallenge) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(challenges).values(data);
  return { success: true };
}

export async function getChildChallenges(childId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(challenges)
    .where(eq(challenges.childId, childId))
    .orderBy(desc(challenges.createdAt));
}

export async function updateChallengeStatus(challengeId: number, status: string, sessionId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { status };
  if (status === 'completed') {
    updateData.completedAt = new Date();
    if (sessionId) updateData.sessionId = sessionId;
  }
  await db.update(challenges).set(updateData).where(eq(challenges.id, challengeId));
}



export async function completeChallenge(challengeId: number, childId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify the challenge belongs to this child
  const challenge = await db.select().from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);
  
  if (challenge.length === 0 || challenge[0].childId !== childId) {
    throw new Error("Challenge not found or unauthorized");
  }
  
  await db.update(challenges)
    .set({ 
      status: 'completed',
      completedAt: new Date()
    })
    .where(eq(challenges.id, challengeId));
  
  return { success: true };
}



export async function getPointsHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const sessions = await db
    .select({
      id: quizSessions.id,
      completedAt: quizSessions.completedAt,
      totalPoints: quizSessions.totalPoints,
      scorePercentage: quizSessions.scorePercentage,
      moduleName: modules.name,
      subjectName: subjects.name,
    })
    .from(quizSessions)
    .leftJoin(modules, eq(quizSessions.moduleId, modules.id))
    .leftJoin(subjects, eq(modules.subjectId, subjects.id))
    .where(and(
      eq(quizSessions.userId, userId),
      eq(quizSessions.isCompleted, true),
      isNotNull(quizSessions.totalPoints)
    ))
    .orderBy(desc(quizSessions.completedAt));
  
  return sessions;
}



export async function deleteChallenge(challengeId: number, parentId: number) {
  const db = await getDb();
  if (!db) return;
  
  // Verify the challenge belongs to this parent's child
  const challenge = await db
    .select({ childId: challenges.childId, parentId: challenges.parentId })
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);
  
  if (challenge.length === 0 || challenge[0].parentId !== parentId) {
    throw new Error("Challenge not found or unauthorized");
  }
  
  await db.delete(challenges).where(eq(challenges.id, challengeId));
}




// Bulk upload questions with metadata (auto-create subjects/modules)
export async function bulkUploadQuestionsWithMetadata(
  questionsData: Array<{
    board: string;
    grade: number;
    subject: string;
    topic: string;
    subTopic?: string;
    scope: string;
    questionType: string;
    questionText: string;
    questionImage?: string;
    options: any;
    correctAnswer: string;
    explanation?: string;
    difficulty: string;
    points: number;
    timeLimit: number;
  }>,
  createdBy: number
) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  const results = {
    created: 0,
    subjectsCreated: 0,
    modulesCreated: 0,
    errors: [] as string[],
  };

  // Group questions by subject and topic
  const groupedQuestions = new Map<string, Map<string, typeof questionsData>>();
  
  for (const q of questionsData) {
    if (!groupedQuestions.has(q.subject)) {
      groupedQuestions.set(q.subject, new Map());
    }
    const subjectMap = groupedQuestions.get(q.subject)!;
    if (!subjectMap.has(q.topic)) {
      subjectMap.set(q.topic, []);
    }
    subjectMap.get(q.topic)!.push(q);
  }

  // Process each subject and topic
  for (const [subjectName, topicsMap] of Array.from(groupedQuestions.entries())) {
    try {
      // Find or create subject
      let subjectResult = await database.select().from(subjects)
        .where(eq(subjects.name, subjectName))
        .limit(1);
      let subject = subjectResult.length > 0 ? subjectResult[0] : undefined;

      if (!subject) {
        // Create subject with minimal required fields
        await database.insert(subjects).values({
          name: subjectName,
          code: subjectName.substring(0, 3).toUpperCase(), // Generate simple code
        });
        // Query the newly created subject
        subjectResult = await database.select().from(subjects)
          .where(eq(subjects.name, subjectName))
          .limit(1);
        subject = subjectResult[0];
        results.subjectsCreated++;
      }

      // Process each topic (module)
      for (const [topicName, questionsForTopic] of Array.from(topicsMap.entries())) {
        try {
          // Find or create module
          let moduleResult = await database.select().from(modules)
            .where(and(
              eq(modules.subjectId, subject!.id),
              eq(modules.name, topicName)
            ))
            .limit(1);
          let module = moduleResult.length > 0 ? moduleResult[0] : undefined;

          if (!module) {
            await database.insert(modules).values({
              subjectId: subject!.id,
              name: topicName,
            });
            // Query the newly created module
            moduleResult = await database.select().from(modules)
              .where(and(
                eq(modules.subjectId, subject!.id),
                eq(modules.name, topicName)
              ))
              .limit(1);
            module = moduleResult[0];
            results.modulesCreated++;
          }

          // Insert questions for this module
          for (const q of questionsForTopic) {
            try {
              await database.insert(questions).values({
                moduleId: module!.id,
                board: q.board as any,
                grade: q.grade,
                subject: q.subject,
                topic: q.topic,
                subTopic: q.subTopic || null,
                scope: q.scope as any,
                questionType: q.questionType as any,
                questionText: q.questionText,
                questionImage: q.questionImage || null,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation || null,
                difficulty: q.difficulty as any,
                points: q.points,
                timeLimit: q.timeLimit,
                createdBy,
              });
              results.created++;
            } catch (error) {
              results.errors.push(`Failed to create question: ${q.questionText.substring(0, 50)}...`);
            }
          }
        } catch (error) {
          results.errors.push(`Failed to process topic: ${topicName}`);
        }
      }
    } catch (error) {
      results.errors.push(`Failed to process subject: ${subjectName}`);
    }
  }

  return results;
}


// Update a question
export async function updateQuestion(
  questionId: number,
  updates: {
    board?: string;
    grade?: number;
    subject?: string;
    topic?: string;
    subTopic?: string;
    scope?: string;
    questionType?: string;
    questionText?: string;
    questionImage?: string;
    options?: any;
    correctAnswer?: string;
    explanation?: string;
    difficulty?: string;
    points?: number;
    timeLimit?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(questions)
    .set({
      ...updates,
      board: updates.board as any,
      scope: updates.scope as any,
      questionType: updates.questionType as any,
      difficulty: updates.difficulty as any,
    })
    .where(eq(questions.id, questionId));
}

// Delete a question
export async function deleteQuestion(questionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(questions).where(eq(questions.id, questionId));
}

// Get all questions with optional filtering
export async function getAllQuestionsWithFilters(filters?: {
  subject?: string;
  topic?: string;
  board?: string;
  grade?: number;
  scope?: string;
  difficulty?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(questions);
  
  const conditions = [];
  if (filters?.subject) conditions.push(eq(questions.subject, filters.subject));
  if (filters?.topic) conditions.push(eq(questions.topic, filters.topic));
  if (filters?.board) conditions.push(eq(questions.board, filters.board as any));
  if (filters?.grade) conditions.push(eq(questions.grade, filters.grade));
  if (filters?.scope) conditions.push(eq(questions.scope, filters.scope as any));
  if (filters?.difficulty) conditions.push(eq(questions.difficulty, filters.difficulty as any));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(questions.createdAt);
}

// Get unique subjects from questions
export async function getUniqueSubjects() {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.selectDistinct({ subject: questions.subject })
    .from(questions)
    .where(eq(questions.isActive, true));
  
  return results.map(r => r.subject).filter(Boolean);
}

// Get unique topics for a subject
export async function getUniqueTopicsForSubject(subject: string) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.selectDistinct({ topic: questions.topic })
    .from(questions)
    .where(and(
      eq(questions.subject, subject),
      eq(questions.isActive, true)
    ));
  
  return results.map(r => r.topic).filter(Boolean);
}

