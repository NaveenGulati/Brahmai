import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { authRouter } from "./authRouter";

// Custom procedure for parent-only access
const parentProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'parent' && ctx.user.role !== 'admin') {
    throw new TRPCError({ 
      code: 'FORBIDDEN',
      message: 'Only parents can access this resource'
    });
  }
  return next({ ctx });
});

// Custom procedure for child access
const childProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'child') {
    throw new TRPCError({ 
      code: 'FORBIDDEN',
      message: 'Only children can access this resource'
    });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  localAuth: authRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============= PARENT MODULE =============
  parent: router({
    // Get all children for parent
    getChildren: parentProcedure.query(async ({ ctx }) => {
      return db.getChildrenByParent(ctx.user.id);
    }),

    // Create child account with password
    createChild: parentProcedure
      .input(z.object({
        name: z.string().min(1),
        username: z.string().min(3),
        password: z.string().min(4),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createChildWithPassword } = await import('./auth');
        await createChildWithPassword(
          ctx.user.id,
          input.name,
          input.username,
          input.password,
          input.email
        );
        return { success: true };
      }),

    // Delete child account
    deleteChild: parentProcedure
      .input(z.object({
        childId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.deleteChildAccount(input.childId, ctx.user.id);
      }),

    // Get all subjects
    getSubjects: parentProcedure.query(async () => {
      return db.getAllSubjects();
    }),

    // Get modules by subject
    getModules: parentProcedure
      .input(z.object({ subjectId: z.number() }))
      .query(async ({ input }) => {
        return db.getModulesBySubject(input.subjectId);
      }),

    // Create module
    createModule: parentProcedure
      .input(z.object({
        subjectId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        orderIndex: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createModule(input);
      }),

    // Update module
    updateModule: parentProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        orderIndex: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateModule(id, data);
      }),

    // Delete module
    deleteModule: parentProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteModule(input.id);
      }),

    // Get questions by module
    getQuestions: parentProcedure
      .input(z.object({ moduleId: z.number() }))
      .query(async ({ input }) => {
        return db.getQuestionsByModule(input.moduleId);
      }),

    // Create single question
    createQuestion: parentProcedure
      .input(z.object({
        moduleId: z.number(),
        questionType: z.enum(['mcq', 'true_false', 'fill_blank', 'match', 'image_based']),
        questionText: z.string(),
        questionImage: z.string().optional(),
        options: z.any(),
        correctAnswer: z.string(),
        explanation: z.string().optional(),
        difficulty: z.enum(['easy', 'medium', 'hard', 'olympiad']),
        points: z.number().default(10),
        timeLimit: z.number().default(60),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createQuestion({
          ...input,
          createdBy: ctx.user.id,
        });
      }),

    // Update question
    updateQuestion: parentProcedure
      .input(z.object({
        id: z.number(),
        questionType: z.enum(['mcq', 'true_false', 'fill_blank', 'match', 'image_based']).optional(),
        questionText: z.string().optional(),
        questionImage: z.string().optional(),
        options: z.any().optional(),
        correctAnswer: z.string().optional(),
        explanation: z.string().optional(),
        difficulty: z.enum(['easy', 'medium', 'hard', 'olympiad']).optional(),
        points: z.number().optional(),
        timeLimit: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateQuestion(id, data);
      }),

    // Delete question
    deleteQuestion: parentProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteQuestion(input.id);
      }),

    // Bulk upload questions from JSON
    bulkUploadQuestions: parentProcedure
      .input(z.object({
        moduleId: z.number(),
        questions: z.array(z.object({
          questionType: z.enum(['mcq', 'true_false', 'fill_blank', 'match', 'image_based']),
          questionText: z.string(),
          questionImage: z.string().optional(),
          options: z.any(),
          correctAnswer: z.string(),
          explanation: z.string().optional(),
          difficulty: z.enum(['easy', 'medium', 'hard', 'olympiad']),
          points: z.number().default(10),
          timeLimit: z.number().default(60),
        }))
      }))
      .mutation(async ({ input, ctx }) => {
        const questionsWithCreator = input.questions.map(q => ({
          ...q,
          moduleId: input.moduleId,
          createdBy: ctx.user.id,
        }));
        return db.bulkCreateQuestions(questionsWithCreator);
      }),

    // Get child progress
    getChildProgress: parentProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ input }) => {
        return db.getUserStats(input.childId);
      }),

    // Get child quiz history
    getChildQuizHistory: parentProcedure
      .input(z.object({ 
        childId: z.number(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return db.getUserQuizHistory(input.childId, input.limit);
      }),

    // Get child activity log
    getChildActivity: parentProcedure
      .input(z.object({
        childId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return db.getUserActivityLog(input.childId, input.startDate, input.endDate);
      }),
  }),

  // ============= CHILD MODULE =============
  child: router({
    // Get all subjects
    getSubjects: childProcedure.query(async () => {
      return db.getAllSubjects();
    }),

    // Get modules by subject
    getModules: childProcedure
      .input(z.object({ subjectId: z.number() }))
      .query(async ({ input }) => {
        return db.getModulesBySubject(input.subjectId);
      }),

    // Start quiz session
    startQuiz: childProcedure
      .input(z.object({ moduleId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const questions = await db.getQuestionsByModule(input.moduleId);
        
        // Select 10-15 random questions
        const quizSize = Math.min(questions.length, Math.floor(Math.random() * 6) + 10);
        const shuffled = questions.sort(() => Math.random() - 0.5);
        const selectedQuestions = shuffled.slice(0, quizSize);

        const session = await db.createQuizSession({
          userId: ctx.user.id,
          moduleId: input.moduleId,
          totalQuestions: selectedQuestions.length,
          isCompleted: false,
        });

        const sessionId = Number((session as any).insertId);

        return {
          sessionId,
          questions: selectedQuestions.map(q => ({
            id: q.id,
            questionType: q.questionType,
            questionText: q.questionText,
            questionImage: q.questionImage,
            options: q.options,
            points: q.points,
            timeLimit: q.timeLimit,
            difficulty: q.difficulty,
          })),
        };
      }),

    // Submit answer (public for local auth)
    submitAnswer: publicProcedure
      .input(z.object({
        sessionId: z.number(),
        questionId: z.number(),
        userAnswer: z.string(),
        timeSpent: z.number(),
      }))
      .mutation(async ({ input }) => {
        const question = await db.getQuestionById(input.questionId);
        if (!question) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' });
        }

        const isCorrect = input.userAnswer.trim().toLowerCase() === 
                         question.correctAnswer.trim().toLowerCase();
        const pointsEarned = isCorrect ? question.points : 0;

        await db.createQuizResponse({
          sessionId: input.sessionId,
          questionId: input.questionId,
          userAnswer: input.userAnswer,
          isCorrect,
          pointsEarned,
          timeSpent: input.timeSpent,
        });

        return {
          isCorrect,
          pointsEarned,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
        };
      }),

    // Complete quiz session (public for local auth)
    completeQuiz: publicProcedure
      .input(z.object({ 
        sessionId: z.number(),
        childId: z.number().optional() // For local auth
      }))
      .mutation(async ({ input, ctx }) => {
        const userId = input.childId || ctx.user?.id;
        if (!userId) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User ID required' });
        }
        const session = await db.getQuizSessionById(input.sessionId);
        if (!session) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
        }

        const responses = await db.getSessionResponses(input.sessionId);
        const correctAnswers = responses.filter(r => r.isCorrect).length;
        const wrongAnswers = responses.filter(r => !r.isCorrect).length;
        const totalPoints = responses.reduce((sum, r) => sum + (r.pointsEarned || 0), 0);
        const timeTaken = responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
        const scorePercentage = Math.round((correctAnswers / session.totalQuestions) * 100);

        await db.updateQuizSession(input.sessionId, {
          completedAt: new Date(),
          correctAnswers,
          wrongAnswers,
          skippedQuestions: session.totalQuestions - responses.length,
          totalPoints,
          timeTaken,
          scorePercentage,
          isCompleted: true,
        });

        // Update user points
        await db.updateUserPoints(userId, totalPoints);

        // Log activity
        await db.logActivity({
          userId,
          activityDate: new Date(),
          quizzesTaken: 1,
          questionsAnswered: responses.length,
          pointsEarned: totalPoints,
          timeSpent: timeTaken,
        });

        // Update streak
        const user = await db.getUserById(userId);
        if (user) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const lastActivity = user.lastActivityDate ? new Date(user.lastActivityDate) : null;
          
          if (lastActivity) {
            lastActivity.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === 1) {
              // Consecutive day
              const newStreak = (user.currentStreak || 0) + 1;
              const newLongest = Math.max(newStreak, user.longestStreak || 0);
              await db.updateUserStreak(userId, newStreak, newLongest);
            } else if (daysDiff > 1) {
              // Streak broken
              await db.updateUserStreak(userId, 1, user.longestStreak || 0);
            }
          } else {
            // First activity
            await db.updateUserStreak(userId, 1, 1);
          }
        }

        return {
          scorePercentage,
          correctAnswers,
          wrongAnswers,
          totalPoints,
          timeTaken,
        };
      }),

    // Get user stats (public for local auth)
    getMyStats: publicProcedure
      .input(z.object({ childId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const userId = input.childId || ctx.user?.id;
        if (!userId) return null;
        return db.getUserStats(userId);
      }),

    // Get quiz history (public for local auth)
    getMyQuizHistory: publicProcedure
      .input(z.object({ 
        limit: z.number().optional(),
        childId: z.number().optional()
      }))
      .query(async ({ ctx, input }) => {
        const userId = input.childId || ctx.user?.id;
        if (!userId) return [];
        return db.getUserQuizHistory(userId, input.limit);
      }),

    // Get achievements (public for local auth)
    getMyAchievements: publicProcedure
      .input(z.object({ childId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const userId = input.childId || ctx.user?.id;
        if (!userId) return [];
        return db.getUserAchievements(userId);
      }),

    // Get all available achievements (public for local auth)
    getAllAchievements: publicProcedure.query(async () => {
      return db.getAllAchievements();
    }),

    // Get activity log (public for local auth)
    getMyActivity: publicProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
        childId: z.number().optional()
      }))
      .query(async ({ ctx, input }) => {
        const userId = input.childId || ctx.user?.id;
        if (!userId) return [];
        return db.getUserActivityLog(userId, input.startDate, input.endDate);
      }),
  }),

  // ============= COMMON ROUTES =============
  common: router({
    // Get user profile
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserById(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;

