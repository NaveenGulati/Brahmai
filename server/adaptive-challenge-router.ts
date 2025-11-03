/**
 * ============================================
 * ADAPTIVE CHALLENGE ROUTER
 * ============================================
 * tRPC procedures for adaptive challenge creation
 * To be added to parent router (and later teacher/student routers)
 */

import { z } from 'zod';
import { router, parentProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { selectQuestionsForChallenge, getComplexityPreview } from './question-selector';
import { getStudentPerformanceSummary, analyzeQuizPerformance } from './performance-analyzer';
import * as db from './db';
import { getDb } from './db';
import { challenges, modules, subjects, questions } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Adaptive Challenge Router
 * Add these procedures to your parent router
 */
export const adaptiveChallengeRouter = router({
  /**
   * Get complexity preview for UI
   */
  getComplexityPreview: parentProcedure
    .input(z.object({
      complexity: z.number().min(1).max(10),
    }))
    .query(({ input }) => {
      return getComplexityPreview(input.complexity);
    }),

  /**
   * Get student performance summary for a subject
   */
  getPerformanceSummary: parentProcedure
    .input(z.object({
      childId: z.number(),
      subject: z.string(),
    }))
    .query(async ({ input }) => {
      return getStudentPerformanceSummary(input.childId, input.subject);
    }),

  /**
   * Get unique subjects (for subject selector)
   */
  getUniqueSubjects: parentProcedure
    .query(async () => {
      return db.getUniqueSubjects();
    }),

  /**
   * Get modules for a subject
   */
  getModulesForSubject: parentProcedure
    .input(z.object({
      subject: z.string(),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];

      const result = await database
        .select({
          id: modules.id,
          name: modules.name,
          subject: subjects.name,
        })
        .from(modules)
        .leftJoin(subjects, eq(modules.subjectId, subjects.id))
        .where(eq(subjects.name, input.subject));

      return result.map(r => ({
        id: r.id,
        name: r.name,
      }));
    }),

  /**
   * Estimate challenge duration
   */
  estimateChallengeDuration: parentProcedure
    .input(z.object({
      moduleId: z.number(),
      questionCount: z.number(),
      complexity: z.number(),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return 15; // Default estimate

      // Get module details
      const moduleData = await database
        .select({
          moduleName: modules.name,
          subjectName: subjects.name,
        })
        .from(modules)
        .leftJoin(subjects, eq(modules.subjectId, subjects.id))
        .where(eq(modules.id, input.moduleId))
        .limit(1);

      if (!moduleData || moduleData.length === 0) return 15;

      const module = moduleData[0];

      // Get average time limit for questions in this subject
      const avgTime = await database
        .select({
          avgTimeLimit: questions.timeLimit,
        })
        .from(questions)
        .where(
          and(
            eq(questions.subject, module.subjectName || ''),
            eq(questions.isActive, true),
            eq(questions.status, 'approved')
          )
        )
        .limit(10); // Sample 10 questions

      if (avgTime.length === 0) return 15;

      const averageTimePerQuestion = avgTime.reduce((sum, q) => sum + (q.avgTimeLimit || 60), 0) / avgTime.length;
      const totalSeconds = input.questionCount * averageTimePerQuestion;
      return Math.ceil(totalSeconds / 60); // Convert to minutes
    }),

  /**
   * Create adaptive challenge
   */
  createAdaptiveChallenge: parentProcedure
    .input(z.object({
      childId: z.number(),
      moduleId: z.number(),
      questionCount: z.number().min(10).max(100),
      complexity: z.number().min(1).max(10),
      focusArea: z.enum(['strengthen', 'improve', 'neutral']),
      useComplexityBoundaries: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        // 1. Get module details
        const moduleData = await database
          .select({
            moduleName: modules.name,
            subjectName: subjects.name,
          })
          .from(modules)
          .leftJoin(subjects, eq(modules.subjectId, subjects.id))
          .where(eq(modules.id, input.moduleId))
          .limit(1);

        if (!moduleData || moduleData.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Module not found',
          });
        }

        const module = moduleData[0];

        // 2. Select questions using adaptive algorithm
        const { questionIds, distribution, estimatedDuration } = await selectQuestionsForChallenge({
          moduleId: input.moduleId,
          subject: module.subjectName || '',
          topic: module.moduleName || '',
          childId: input.childId,
          questionCount: input.questionCount,
          complexity: input.complexity,
          focusArea: input.focusArea,
        });

        if (questionIds.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No questions found matching the criteria',
          });
        }

        // 3. Create challenge record with pre-selected questions
        const challengeTitle = `${module.subjectName} - ${module.moduleName}`;
        const challengeMessage = `Complete ${input.questionCount} questions${input.useComplexityBoundaries ? ` at complexity level ${input.complexity}` : ' (fully adaptive)'}`;

        const result = await database.insert(challenges).values({
          assignedBy: ctx.user.id,
          assignedTo: input.childId,
          assignedToType: 'individual',
          moduleId: input.moduleId,
          title: challengeTitle,
          message: challengeMessage,
          questionCount: input.questionCount,
          complexity: input.complexity,
          focusArea: input.focusArea,
          estimatedDuration,
          difficultyDistribution: JSON.stringify(distribution),
          selectedQuestionIds: input.useComplexityBoundaries ? JSON.stringify(questionIds) : null,
          useComplexityBoundaries: input.useComplexityBoundaries,
          status: 'pending',
        });

        const challengeId = Number(result.insertId);

        return {
          challengeId,
          questionCount: questionIds.length,
          estimatedDuration,
          distribution,
        };
      } catch (error) {
        console.error('[Adaptive Challenge] Error creating challenge:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create challenge',
        });
      }
    }),

  /**
   * Trigger performance analysis after quiz completion
   * Call this from the existing quiz completion handler
   */
  analyzeQuizPerformance: parentProcedure
    .input(z.object({
      sessionId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await analyzeQuizPerformance(input.sessionId);
      return { success: true };
    }),
});

/**
 * Export type for use in main router
 */
export type AdaptiveChallengeRouter = typeof adaptiveChallengeRouter;

