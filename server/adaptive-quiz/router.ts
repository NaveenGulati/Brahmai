/**
 * Adaptive Quiz Router - tRPC API Endpoints
 * 
 * This is the public API for the adaptive quiz module.
 * Import this router into your main appRouter.
 */

import { router, publicProcedure } from '../_core/trpc';
import { startQuizInput, startQuizMutation, getNextQuestionInput, getNextQuestionMutation } from './mutations';

export const adaptiveQuizRouter = router({
  /**
   * Start a new adaptive quiz session
   * 
   * @param moduleId - The module to quiz on
   * @param childId - Optional child ID (for parent-initiated quizzes)
   * @param challengeId - Optional challenge ID (for challenge-based quizzes)
   * 
   * @returns sessionId, first question, and quiz metadata
   */
  start: publicProcedure
    .input(startQuizInput)
    .mutation(async ({ input, ctx }) => {
      return startQuizMutation(input, ctx.user?.id);
    }),

  /**
   * Get next question in adaptive quiz
   * 
   * @param sessionId - The quiz session ID
   * 
   * @returns next question and performance feedback
   */
  next: publicProcedure
    .input(getNextQuestionInput)
    .mutation(async ({ input }) => {
      return getNextQuestionMutation(input);
    }),
});
