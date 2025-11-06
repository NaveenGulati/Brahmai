import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router, parentProcedure, qbAdminProcedure, teacherProcedure, superadminProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { getDb, generateAudioForQuestion, generateDetailedExplanationForQuestion } from "./db";
import { quizSessions, aiExplanationCache, challenges } from "../drizzle/schema";
import { eq, and, lt, desc } from "drizzle-orm";
import { authRouter } from "./authRouter";
import { adaptiveChallengeRouter } from "./adaptive-challenge-router";

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

    // ===== QUESTION BANK MANAGEMENT MOVED TO QB ADMIN =====
    // Parents can now only view subjects/modules for assigning challenges
    
    // Get all subjects (read-only for parents)
    getSubjects: parentProcedure.query(async () => {
      return db.getAllSubjects();
    }),

    // Get modules by subject (read-only for parents)
    getModules: parentProcedure
      .input(z.object({ subjectId: z.number() }))
      .query(async ({ input }) => {
        return db.getModulesBySubject(input.subjectId);
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

    // Get subject-wise performance statistics
    getChildSubjectStats: parentProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ input }) => {
        const history = await db.getUserQuizHistory(input.childId);
        
        // Group by subject and calculate average score
        const subjectStats = history.reduce((acc: any, quiz: any) => {
          const subject = quiz.subjectName || 'Unknown';
          if (!acc[subject]) {
            acc[subject] = { totalScore: 0, count: 0, totalQuizzes: 0 };
          }
          acc[subject].totalScore += quiz.scorePercentage || 0;
          acc[subject].count += 1;
          acc[subject].totalQuizzes += 1;
          return acc;
        }, {});
        
        // Convert to array format for charts
        return Object.entries(subjectStats).map(([subject, stats]: [string, any]) => ({
          subject,
          avgScore: Math.round(stats.totalScore / stats.count),
          quizCount: stats.totalQuizzes,
        }));
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

    // Get quiz review with AI analysis
    getPreviousAttempt: parentProcedure
      .input(z.object({ moduleId: z.number(), currentSessionId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        // Get the previous session for this module (before current session)
        const sessions = await db.select()
          .from(quizSessions)
          .where(
            and(
              eq(quizSessions.moduleId, input.moduleId),
              lt(quizSessions.id, input.currentSessionId),
              eq(quizSessions.isCompleted, true)
            )
          )
          .orderBy(desc(quizSessions.completedAt))
          .limit(1);

        if (sessions.length === 0) return null;

        return sessions[0];
      }),

    getQuizReview: parentProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        const session = await db.getQuizSessionById(input.sessionId);
        if (!session) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Quiz session not found' });
        }

        const responses = await db.getSessionResponses(input.sessionId);
        const module = await db.getModuleById(session.moduleId);
        const subject = module ? await db.getSubjectById(module.subjectId) : null;

        // Batch fetch all questions at once (performance optimization)
        const questionIds = responses.map((r: any) => r.questionId);
        const questionsData = await db.getQuestionsByIds(questionIds);
        const questionsMap = new Map(questionsData.map(q => [q.id, q]));

        // Get detailed response data with questions
        const detailedResponses = responses.map((r: any) => {
          const question = questionsMap.get(r.questionId);
          return {
            ...r,
            questionText: question?.questionText || '',
            questionType: question?.questionType || 'multiple_choice',
            questionImage: question?.questionImage,
            options: typeof question?.options === 'string' ? JSON.parse(question.options) : question?.options,
            correctAnswer: question?.correctAnswer || '',
            explanation: question?.explanation,
            difficulty: question?.difficulty,
            maxPoints: question?.points || 0,
          };
        });

        // AI analysis removed - now generated on-demand via separate API

        return {
          session: {
            ...session,
            moduleName: module?.name || 'Unknown Module',
            subjectName: subject?.name || 'Unknown Subject',
          },
          responses: detailedResponses,
          // aiAnalysis removed for performance
        };
      }),

    // Generate AI Analysis on-demand (fast loading)
    generateAIAnalysis: parentProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input }) => {
        const session = await db.getQuizSessionById(input.sessionId);
        if (!session) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Quiz session not found' });
        }

        const responses = await db.getSessionResponses(input.sessionId);
        const module = await db.getModuleById(session.moduleId);
        const subject = module ? await db.getSubjectById(module.subjectId) : null;

        const questionIds = responses.map((r: any) => r.questionId);
        const questionsData = await db.getQuestionsByIds(questionIds);
        const questionsMap = new Map(questionsData.map(q => [q.id, q]));

        const detailedResponses = responses.map((r: any) => {
          const question = questionsMap.get(r.questionId);
          return {
            ...r,
            questionText: question?.questionText || '',
            difficulty: question?.difficulty,
          };
        });

        const { invokeLLM } = await import('./_core/llm');
        
        const analysisPrompt = `Analyze this Grade 7 student's quiz performance and provide insights in clean, well-formatted markdown:

Quiz: ${module?.name || 'Unknown'} (${subject?.name || 'Unknown'})
Score: ${session.scorePercentage}%
Correct: ${session.correctAnswers}/${session.totalQuestions}
Time: ${session.timeTaken}s

Questions and Answers:
${detailedResponses.map((r: any, i: number) => `
${i + 1}. ${r.questionText}
   Difficulty: ${r.difficulty}
   Student Answer: ${r.userAnswer}
   Correct Answer: ${r.correctAnswer}
   Result: ${r.isCorrect ? 'Correct' : 'Wrong'}
   Time: ${r.timeSpent}s`).join('\n')}

Provide a structured analysis with THREE sections:

### Strengths
(Use bullet points, be specific about which concepts they mastered)

### Areas for Improvement  
(Use bullet points, identify specific topics that need practice)

### Recommendations
(Use numbered list, provide actionable study suggestions)

Format your response in clean markdown with:
- Use **bold** for key concepts
- Use bullet points (-) for lists
- Keep it concise and encouraging`;

        const aiResponse = await invokeLLM({
          messages: [
            { role: 'system', content: 'You are an educational AI assistant analyzing student quiz performance. Provide constructive, encouraging feedback.' },
            { role: 'user', content: analysisPrompt }
          ]
        });

        const aiContent = aiResponse.choices[0]?.message?.content || '';
        const aiText = typeof aiContent === 'string' ? aiContent : '';
        
        return {
          fullAnalysis: aiText || 'Analysis not available. Please try again.',
        };
      }),

    // Generate detailed explanation for a wrong answer (child-friendly)
    // Uses cache to save AI tokens and improve performance
    generateDetailedExplanation: parentProcedure
      .input(z.object({ 
        questionId: z.number(),
        questionText: z.string(),
        correctAnswer: z.string(),
        userAnswer: z.string(),
        grade: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await generateDetailedExplanationForQuestion(
          input.questionId,
          input.questionText,
          input.correctAnswer,
          input.userAnswer,
          input.grade
        );
        return {
          detailedExplanation: result.detailedExplanation,
          fromCache: result.fromCache || false,
        };
      }),

    // Generate audio for explanation
    generateAudio: parentProcedure
      .input(z.object({ questionId: z.number() }))
      .mutation(async ({ input }) => {
        return generateAudioForQuestion(input.questionId);
      }),

    // Create challenge for child
    createChallenge: parentProcedure
      .input(z.object({
        childId: z.number(),
        moduleId: z.number(),
        title: z.string(),
        message: z.string().optional(),
        expiresAt: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createChallenge({
          assignedBy: ctx.user.id,
          assignedTo: input.childId,
          assignedToType: 'individual',
          moduleId: input.moduleId,
          title: input.title,
          message: input.message,
          expiresAt: input.expiresAt,
        });
      }),

    // Dismiss completed challenge
    dismissChallenge: parentProcedure
      .input(z.object({
        challengeId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteChallenge(input.challengeId);
        return { success: true };
      }),

    // Reset child password
    resetChildPassword: parentProcedure
      .input(z.object({
        childId: z.number(),
        newPassword: z.string().min(4),
      }))
      .mutation(async ({ input, ctx }) => {
        const { resetChildPassword } = await import('./auth');
        await resetChildPassword(input.childId, ctx.user.id, input.newPassword);
        return { success: true };
      }),

    // Get completed challenges with quiz results
    getCompletedChallenges: parentProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ input, ctx }) => {
        const challenges = await db.getChildChallenges(input.childId);
        const completed = challenges.filter(c => c.status === 'completed' && c.sessionId);
        
        // Fetch quiz session details for each completed challenge
        const challengesWithResults = await Promise.all(
          completed.map(async (challenge) => {
            const session = challenge.sessionId ? await db.getQuizSessionById(challenge.sessionId) : null;
            const module = challenge.moduleId ? await db.getModuleById(challenge.moduleId) : null;
            const subject = module?.subjectId ? await db.getSubjectById(module.subjectId) : null;
            
            return {
              ...challenge,
              session,
              module,
              subject,
            };
          })
        );
        
        return challengesWithResults;
      }),

    // ===== ADAPTIVE CHALLENGE CREATION =====
    ...adaptiveChallengeRouter._def.procedures,
  }),

  // ============= CHILD MODULE =============
  child: router({
    // Get all subjects (public for local auth)
    getSubjects: publicProcedure.query(async () => {
      return db.getAllSubjects();
    }),

    // Get modules by subject (public for local auth)
    getModules: publicProcedure
      .input(z.object({ subjectId: z.number() }))
      .query(async ({ input }) => {
        return db.getModulesBySubject(input.subjectId);
      }),

    // Start AI-powered adaptive quiz (public for local auth)
    startQuiz: publicProcedure
      .input(z.object({ 
        moduleId: z.number(),
        childId: z.number().optional(),
        challengeId: z.number().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        const userId = input.childId || ctx.user?.id;
        if (!userId) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User ID required' });
        }

        let allQuestions;
        let quizSize;

        // Check if this is from a challenge with pre-selected questions
        if (input.challengeId) {
          const database = await getDb();
          if (database) {
            const challengeData = await database
              .select()
              .from(challenges)
              .where(eq(challenges.id, input.challengeId))
              .limit(1);

            if (challengeData.length > 0) {
              const challenge = challengeData[0];
              
              // If challenge has pre-selected questions (bounded mode), use them
              if (challenge.useComplexityBoundaries && challenge.selectedQuestionIds) {
                const questionIds = JSON.parse(challenge.selectedQuestionIds as string) as number[];
                allQuestions = await db.getQuestionsByIds(questionIds);
                quizSize = challenge.questionCount || allQuestions.length;
              }
            }
          }
        }

        // Fallback to module-based selection (fully adaptive or no challenge)
        if (!allQuestions) {
          allQuestions = await db.getQuestionsByModule(input.moduleId);
          quizSize = Math.min(allQuestions.length, Math.floor(Math.random() * 6) + 10);
        }
        if (allQuestions.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'No questions found for this module' });
        }

        // Ensure quizSize is set (fallback if not set by challenge)
        if (!quizSize) {
          quizSize = Math.min(allQuestions.length, Math.floor(Math.random() * 6) + 10);
        }

        // Create quiz session
        const sessionId = await db.createQuizSession({
          childId: userId,
          moduleId: input.moduleId,
          totalQuestions: quizSize,
          isCompleted: false,
        });

        // Store available questions in session metadata (for adaptive selection)
        // In production, this could be stored in Redis or database
        const questionPool = {
          easy: allQuestions.filter(q => q.difficulty === 'easy').map(q => q.id),
          medium: allQuestions.filter(q => q.difficulty === 'medium').map(q => q.id),
          hard: allQuestions.filter(q => q.difficulty === 'hard').map(q => q.id),
        };

        // Start with medium difficulty (AI will adapt from here)
        const startingDifficulty = 'medium';
        const firstQuestionPool = questionPool.medium.length > 0 ? questionPool.medium : 
                                  questionPool.easy.length > 0 ? questionPool.easy : 
                                  questionPool.hard;
        
        const firstQuestionId = firstQuestionPool[Math.floor(Math.random() * firstQuestionPool.length)];
        const firstQuestion = allQuestions.find(q => q.id === firstQuestionId);

        if (!firstQuestion) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to select first question' });
        }

        // Points based on difficulty
        const pointsByDifficulty = { easy: 5, medium: 10, hard: 15 };

        return {
          sessionId,
          totalQuestions: quizSize,
          currentQuestionNumber: 1,
          question: {
            id: firstQuestion.id,
            questionType: firstQuestion.questionType,
            questionText: firstQuestion.questionText,
            questionImage: firstQuestion.questionImage,
            options: typeof firstQuestion.options === 'string' ? JSON.parse(firstQuestion.options) : firstQuestion.options,
            points: pointsByDifficulty[firstQuestion.difficulty as keyof typeof pointsByDifficulty] || 10,
            timeLimit: firstQuestion.timeLimit,
            difficulty: firstQuestion.difficulty,
          },
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
        
        // Calculate points based on difficulty (same as startQuiz and getNextQuestion)
        const pointsByDifficulty = { easy: 5, medium: 10, hard: 15 };
        const questionPoints = pointsByDifficulty[question.difficulty as keyof typeof pointsByDifficulty] || 10;
        const pointsEarned = isCorrect ? questionPoints : 0;

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

    // Get next adaptive question based on AI analysis (public for local auth)
    getNextQuestion: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input }) => {
        const session = await db.getQuizSessionById(input.sessionId);
        if (!session) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
        }

        // Get all responses so far
        const responses = await db.getSessionResponses(input.sessionId);
        const answeredQuestionIds = responses.map(r => r.questionId);

        // Get all available questions for this module
        const allQuestions = await db.getQuestionsByModule(session.moduleId);
        const availableQuestions = allQuestions.filter(q => !answeredQuestionIds.includes(q.id));

        if (availableQuestions.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'No more questions available' });
        }

        // Calculate current performance for fast rule-based adaptation
        const correctAnswers = responses.filter(r => r.isCorrect).length;
        const questionsAnswered = responses.length;
        const accuracyRate = questionsAnswered > 0 ? correctAnswers / questionsAnswered : 0.5;
        
        // Get last 3 responses for recent performance
        const recentResponses = responses.slice(-3);
        const recentCorrect = recentResponses.filter(r => r.isCorrect).length;
        const recentAccuracy = recentResponses.length > 0 ? recentCorrect / recentResponses.length : 0.5;

        // Fast rule-based adaptive algorithm (instant, no AI delay)
        let difficulty: string;
        let reasoning: string;

        if (questionsAnswered === 0) {
          // Start with medium
          difficulty = 'medium';
          reasoning = 'Starting difficulty';
        } else if (recentAccuracy >= 0.8) {
          // Doing great recently - increase difficulty
          difficulty = 'hard';
          reasoning = `High recent accuracy (${Math.round(recentAccuracy * 100)}%) - challenging with harder question`;
        } else if (recentAccuracy <= 0.3) {
          // Struggling recently - decrease difficulty
          difficulty = 'easy';
          reasoning = `Low recent accuracy (${Math.round(recentAccuracy * 100)}%) - building confidence with easier question`;
        } else if (accuracyRate >= 0.7) {
          // Overall doing well - medium to hard
          difficulty = Math.random() > 0.5 ? 'medium' : 'hard';
          reasoning = `Good overall accuracy (${Math.round(accuracyRate * 100)}%) - maintaining challenge`;
        } else {
          // Average performance - medium
          difficulty = 'medium';
          reasoning = `Average accuracy (${Math.round(accuracyRate * 100)}%) - keeping steady difficulty`;
        }

        console.log(`Adaptive difficulty: ${difficulty} - ${reasoning}`);

        // Select a random question from the chosen difficulty pool
        const questionsOfDifficulty = availableQuestions.filter(q => q.difficulty === difficulty);
        let selectedQuestion;

        if (questionsOfDifficulty.length > 0) {
          selectedQuestion = questionsOfDifficulty[Math.floor(Math.random() * questionsOfDifficulty.length)];
        } else {
          // Fallback: pick any available question
          selectedQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        }

        // Points based on difficulty
        const pointsByDifficulty = { easy: 5, medium: 10, hard: 15 };

        return {
          currentQuestionNumber: questionsAnswered + 2, // Next question number
          question: {
            id: selectedQuestion.id,
            questionType: selectedQuestion.questionType,
            questionText: selectedQuestion.questionText,
            questionImage: selectedQuestion.questionImage,
            options: typeof selectedQuestion.options === 'string' 
              ? JSON.parse(selectedQuestion.options) 
              : selectedQuestion.options,
            points: pointsByDifficulty[selectedQuestion.difficulty as keyof typeof pointsByDifficulty] || 10,
            timeLimit: selectedQuestion.timeLimit,
            difficulty: selectedQuestion.difficulty,
          },
          adaptiveReasoning: reasoning, // For debugging/transparency
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
        await db.updateChildPoints(userId, totalPoints);

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
        const childProfile = await db.getChildProfile(userId);
        if (childProfile) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const lastActivity = childProfile.lastActivityDate ? new Date(childProfile.lastActivityDate) : null;
          
          if (lastActivity) {
            lastActivity.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === 1) {
              // Consecutive day
              const newStreak = (childProfile.currentStreak || 0) + 1;
              const newLongest = Math.max(newStreak, childProfile.longestStreak || 0);
              await db.updateChildStreak(userId, newStreak, newLongest);
            } else if (daysDiff > 1) {
              // Streak broken
              await db.updateChildStreak(userId, 1, childProfile.longestStreak || 0);
            }
          } else {
            // First activity
            await db.updateChildStreak(userId, 1, 1);
          }
        }

        // Trigger performance analysis for adaptive challenge system
        try {
          const { analyzeQuizPerformance } = await import('./performance-analyzer');
          await analyzeQuizPerformance(input.sessionId);
        } catch (error) {
          console.error('[Complete Quiz] Failed to analyze performance:', error);
          // Don't fail the quiz completion if analysis fails
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

    // Get points ledger history (public for local auth)
    getPointsHistory: publicProcedure
      .input(z.object({ childId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const userId = input.childId || ctx.user?.id;
        if (!userId) return [];
        return db.getPointsHistory(userId);
      }),

    // Get quiz history (public for local auth)
    getQuizHistory: publicProcedure
      .input(z.object({ 
        childId: z.number().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const userId = input.childId || ctx.user?.id;
        if (!userId) return [];
        return db.getUserQuizHistory(userId, input.limit);
      }),

    // Get quiz review (public for local auth)
    getQuizReview: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        const session = await db.getQuizSessionById(input.sessionId);
        if (!session) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Quiz session not found' });
        }

        const responses = await db.getSessionResponses(input.sessionId);
        const module = await db.getModuleById(session.moduleId);
        const subject = module ? await db.getSubjectById(module.subjectId) : null;

        // Batch fetch all questions at once (performance optimization)
        const questionIds = responses.map((r: any) => r.questionId);
        const questionsData = await db.getQuestionsByIds(questionIds);
        const questionsMap = new Map(questionsData.map(q => [q.id, q]));

        // Get detailed response data with questions
        const detailedResponses = responses.map((r: any) => {
          const question = questionsMap.get(r.questionId);
          return {
            ...r,
            questionText: question?.questionText || '',
            questionType: question?.questionType || 'multiple_choice',
            questionImage: question?.questionImage,
            options: typeof question?.options === 'string' ? JSON.parse(question.options) : question?.options,
            correctAnswer: question?.correctAnswer || '',
            explanation: question?.explanation,
            difficulty: question?.difficulty,
            maxPoints: question?.points || 0,
          };
        });

        // AI analysis removed - now generated on-demand via separate API

        return {
          session: {
            ...session,
            moduleName: module?.name || 'Unknown Module',
            subjectName: subject?.name || 'Unknown Subject',
          },
          responses: detailedResponses,
          // aiAnalysis removed for performance
        };
      }),

    // Generate AI Analysis on-demand (child router)
    generateAIAnalysis: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input }) => {
        const session = await db.getQuizSessionById(input.sessionId);
        if (!session) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Quiz session not found' });
        }

        const responses = await db.getSessionResponses(input.sessionId);
        const module = await db.getModuleById(session.moduleId);
        const subject = module ? await db.getSubjectById(module.subjectId) : null;

        const questionIds = responses.map((r: any) => r.questionId);
        const questionsData = await db.getQuestionsByIds(questionIds);
        const questionsMap = new Map(questionsData.map(q => [q.id, q]));

        const detailedResponses = responses.map((r: any) => {
          const question = questionsMap.get(r.questionId);
          return {
            ...r,
            questionText: question?.questionText || '',
            difficulty: question?.difficulty,
          };
        });

        const { invokeLLM } = await import('./_core/llm');
        
        const analysisPrompt = `Analyze this Grade 7 student's quiz performance and provide insights in clean, well-formatted markdown:

Quiz: ${module?.name || 'Unknown'} (${subject?.name || 'Unknown'})
Score: ${session.scorePercentage}%
Correct: ${session.correctAnswers}/${session.totalQuestions}
Time: ${session.timeTaken}s

Questions and Answers:
${detailedResponses.map((r: any, i: number) => `
${i + 1}. ${r.questionText}
   Difficulty: ${r.difficulty}
   Student Answer: ${r.userAnswer}
   Correct Answer: ${r.correctAnswer}
   Result: ${r.isCorrect ? 'Correct' : 'Wrong'}
   Time: ${r.timeSpent}s`).join('\n')}

Provide a structured analysis with THREE sections:

### Strengths
(Use bullet points, be specific about which concepts they mastered)

### Areas for Improvement  
(Use bullet points, identify specific topics that need practice)

### Recommendations
(Use numbered list, provide actionable study suggestions)

Format your response in clean markdown with:
- Use **bold** for key concepts
- Use bullet points (-) for lists
- Keep it concise and encouraging`;

        const aiResponse = await invokeLLM({
          messages: [
            { role: 'system', content: 'You are an educational AI assistant analyzing student quiz performance. Provide constructive, encouraging feedback.' },
            { role: 'user', content: analysisPrompt }
          ]
        });

        const aiContent = aiResponse.choices[0]?.message?.content || '';
        const aiText = typeof aiContent === 'string' ? aiContent : '';
        
        return {
          fullAnalysis: aiText || 'Analysis not available. Please try again.',
        };
      }),

    // Generate detailed explanation for a wrong answer (child-friendly)
    // Uses cache to save AI tokens and improve performance
    generateDetailedExplanation: publicProcedure
      .input(z.object({ 
        questionId: z.number(),
        questionText: z.string(),
        correctAnswer: z.string(),
        userAnswer: z.string(),
        grade: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await generateDetailedExplanationForQuestion(
          input.questionId,
          input.questionText,
          input.correctAnswer,
          input.userAnswer,
          input.grade
        );
        return {
          detailedExplanation: result.detailedExplanation,
          fromCache: result.fromCache || false,
        };
      }),

    // Generate audio for explanation
    generateAudio: publicProcedure
      .input(z.object({ questionId: z.number() }))
      .mutation(async ({ input }) => {
        return generateAudioForQuestion(input.questionId);
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

    // Get challenges for child (public for local auth)
    getChallenges: publicProcedure
      .input(z.object({ childId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const userId = input.childId || ctx.user?.id;
        if (!userId) return [];
        return db.getChildChallenges(userId);
      }),

    // Complete challenge (public for local auth)
    completeChallenge: publicProcedure
      .input(z.object({ 
        challengeId: z.number(),
        childId: z.number().optional(),
        sessionId: z.number().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = input.childId || ctx.user?.id;
        if (!userId) {
          throw new TRPCError({ code: 'UNAUTHORIZED' });
        }
        await db.updateChallenge(input.challengeId, { status: 'completed', sessionId: input.sessionId, completedAt: new Date() });
        return { success: true };
      }),
  }),

  // ============= QB ADMIN MODULE =============
  qbAdmin: router({
    // Get all subjects
    getSubjects: qbAdminProcedure.query(async () => {
      return db.getAllSubjects();
    }),

    // Get modules by subject
    getModules: qbAdminProcedure
      .input(z.object({ subjectId: z.number() }))
      .query(async ({ input }) => {
        return db.getModulesBySubject(input.subjectId);
      }),

    // Create module
    createModule: qbAdminProcedure
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
    updateModule: qbAdminProcedure
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
    deleteModule: qbAdminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteModule(input.id);
      }),

    // Get questions by module
    getQuestions: qbAdminProcedure
      .input(z.object({ moduleId: z.number() }))
      .query(async ({ input }) => {
        return db.getQuestionsByModule(input.moduleId);
      }),

    // Create single question
    createQuestion: qbAdminProcedure
      .input(z.object({
        boardId: z.number(),
        gradeId: z.number(),
        subjectId: z.number(),
        moduleId: z.number().optional(),
        questionType: z.enum(['multiple_choice', 'true_false', 'fill_blank', 'short_answer']),
        questionText: z.string(),
        questionImage: z.string().optional(),
        options: z.any(),
        correctAnswer: z.string(),
        explanation: z.string().optional(),
        difficulty: z.enum(['easy', 'medium', 'hard']),
        points: z.number().default(10),
        timeLimit: z.number().default(60),
        topic: z.string().optional(),
        subTopic: z.string().optional(),
        scope: z.enum(['School', 'Olympiad', 'Competitive', 'Advanced']).default('School'),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createQuestion({
          ...input,
          submittedBy: ctx.user.id,
        });
      }),

    // Update question
    updateQuestion: qbAdminProcedure
      .input(z.object({
        id: z.number(),
        board: z.string().optional(),
        grade: z.number().optional(),
        subject: z.string().optional(),
        topic: z.string().optional(),
        subTopic: z.string().optional(),
        scope: z.enum(['School', 'Olympiad', 'Competitive', 'Advanced']).optional(),
        questionType: z.enum(['multiple_choice', 'true_false', 'fill_blank', 'short_answer']).optional(),
        questionText: z.string().optional(),
        questionImage: z.string().optional(),
        options: z.any().optional(),
        correctAnswer: z.string().optional(),
        explanation: z.string().optional(),
        difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
        points: z.number().optional(),
        timeLimit: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return db.updateQuestion(id, updates);
      }),

    // Delete question
    deleteQuestion: qbAdminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteQuestion(input.id);
      }),

    // Bulk upload questions (user-friendly format with text fields)
    bulkUploadQuestions: qbAdminProcedure
      .input(z.object({
        questions: z.array(z.object({
          // User-friendly text fields
          board: z.string(),
          grade: z.number(),
          subject: z.string(),
          topic: z.string(),
          subTopic: z.string().optional(),
          scope: z.enum(['School', 'Olympiad', 'Competitive', 'Advanced']),
          questionType: z.enum(['multiple_choice', 'true_false', 'fill_blank', 'short_answer']),
          questionText: z.string(),
          questionImage: z.string().optional(),
          options: z.any(),
          correctAnswer: z.string(),
          explanation: z.string().optional(),
          difficulty: z.enum(['easy', 'medium', 'hard']),
          points: z.number().default(10),
          timeLimit: z.number().default(60),
        }))
      }))
      .mutation(async ({ input, ctx }) => {
        return db.bulkUploadQuestionsUserFriendly(input.questions, ctx.user.id);
      }),

    // Delete question permanently
    deleteQuestionPermanent: qbAdminProcedure
      .input(z.object({ questionId: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteQuestion(input.questionId);
      }),

    // Get all questions with filters
    getAllQuestions: qbAdminProcedure
      .input(z.object({
        subject: z.string().optional(),
        topic: z.string().optional(),
        board: z.string().optional(),
        grade: z.number().optional(),
        scope: z.enum(['School', 'Olympiad', 'Competitive', 'Advanced']).optional(),
        difficulty: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAllQuestionsWithFilters(input || {});
      }),

    // Get unique subjects
    getUniqueSubjects: qbAdminProcedure
      .query(async () => {
        return db.getUniqueSubjects();
      }),

    // Get unique topics for a subject
    getUniqueTopics: qbAdminProcedure
      .input(z.object({ subject: z.string() }))
      .query(async ({ input }) => {
        return db.getUniqueTopicsForSubject(input.subject);
      }),
  }),

  // ============= TEACHER MODULE =============
  teacher: router({  
    // Get all classes for logged-in teacher
    getMyClasses: teacherProcedure.query(async ({ ctx }) => {
      return db.getTeacherClasses(ctx.user.id);
    }),

    // Create new class
    createClass: teacherProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        board: z.enum(['CBSE', 'ICSE', 'IB', 'State', 'Other']),
        grade: z.number(),
        subjectId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createClass({ ...input, teacherId: ctx.user.id });
      }),

    // Update class
    updateClass: teacherProcedure
      .input(z.object({
        classId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { classId, ...data } = input;
        return db.updateClass(classId, data, ctx.user.id);
      }),

    // Delete class
    deleteClass: teacherProcedure
      .input(z.object({ classId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.deleteClass(input.classId, ctx.user.id);
      }),

    // Get students in a class
    getClassStudents: teacherProcedure
      .input(z.object({ classId: z.number() }))
      .query(async ({ input }) => {
        return db.getClassStudents(input.classId);
      }),

    // Add student to class
    addStudentToClass: teacherProcedure
      .input(z.object({
        classId: z.number(),
        childId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.addStudentToClass(input.classId, input.childId, ctx.user.id);
      }),

    // Remove student from class
    removeStudentFromClass: teacherProcedure
      .input(z.object({
        classId: z.number(),
        childId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.removeStudentFromClass(input.classId, input.childId);
      }),

    // Get class performance stats
    getClassPerformance: teacherProcedure
      .input(z.object({ classId: z.number() }))
      .query(async ({ input }) => {
        return db.getClassPerformance(input.classId);
      }),

    // Search children by username
    searchChildren: teacherProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return db.searchChildrenByUsername(input.query);
      }),
  }),

  // ============= SUPER ADMIN MODULE =============
  superadmin: router({
    // Get all users with pagination and filters
    getAllUsers: superadminProcedure
      .input(z.object({
        role: z.enum(['parent', 'child', 'teacher', 'qb_admin', 'superadmin']).optional(),
        search: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAllUsersWithDetails(input || {});
      }),

    // Update user role
    updateUserRole: superadminProcedure
      .input(z.object({
        userId: z.number(),
        newRole: z.enum(['parent', 'child', 'teacher', 'qb_admin', 'superadmin']),
      }))
      .mutation(async ({ input }) => {
        return db.updateUserRole(input.userId, input.newRole);
      }),

    // Get platform statistics
    getPlatformStats: superadminProcedure.query(async () => {
      return db.getPlatformStatistics();
    }),

    // Get users by role
    getUsersByRole: superadminProcedure
      .input(z.object({ role: z.enum(['parent', 'child', 'teacher', 'qb_admin', 'superadmin']) }))
      .query(async ({ input }) => {
        return db.getUsersByRole(input.role);
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

