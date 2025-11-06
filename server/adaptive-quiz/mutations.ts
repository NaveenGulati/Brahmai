/**
 * Adaptive Quiz Mutations - Focus Area Based
 * These replace the old complexity-level based mutations
 */

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import * as dbAdapter from './db-adapter';
import {
  calculatePerformanceMetrics,
  selectTopic,
  determineOptimalDifficulty,
  selectBestQuestion,
} from './engine';
import type { FocusArea } from './types';

/**
 * START QUIZ - Initialize adaptive quiz session
 */
export const startQuizInput = z.object({
  moduleId: z.number(),
  childId: z.number().optional(),
  challengeId: z.number().optional(),
});

export async function startQuizMutation(input: z.infer<typeof startQuizInput>, userId?: number) {
  const childId = input.childId || userId;
  if (!childId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User ID required' });
  }

  let focusArea: FocusArea = 'balanced';
  let quizSize = 20; // Default

  // Check if this is from a challenge
  if (input.challengeId) {
    const challenge = await dbAdapter.getChallenge(input.challengeId);
    if (challenge) {
      focusArea = (challenge.focusArea as FocusArea) || 'balanced';
      quizSize = challenge.questionCount || 20;
    }
  }

  // Get all questions from module
  const allQuestions = await dbAdapter.getQuestionsByModule(input.moduleId);
  
  if (allQuestions.length === 0) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'No questions found for this module' });
  }

  // Ensure quiz size doesn't exceed available questions
  quizSize = Math.min(quizSize, allQuestions.length);

  // Create quiz session
  const sessionId = await dbAdapter.createSession({
    childId,
    moduleId: input.moduleId,
    totalQuestions: quizSize,
    focusArea,
    challengeId: input.challengeId,
  });

  // Select first question (start with medium difficulty)
  const mediumQuestions = allQuestions.filter(q => q.difficulty === 'medium');
  const firstQuestionPool = mediumQuestions.length > 0 ? mediumQuestions : allQuestions;
  const firstQuestion = firstQuestionPool[Math.floor(Math.random() * firstQuestionPool.length)];

  if (!firstQuestion) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to select first question' });
  }

  return {
    sessionId,
    totalQuestions: quizSize,
    currentQuestionNumber: 1,
    focusArea,
    question: {
      id: firstQuestion.id,
      questionType: firstQuestion.questionType,
      questionText: firstQuestion.questionText,
      questionImage: firstQuestion.questionImage,
      options: typeof firstQuestion.options === 'string' ? JSON.parse(firstQuestion.options) : firstQuestion.options,
      points: firstQuestion.points,
      timeLimit: firstQuestion.timeLimit,
      difficulty: firstQuestion.difficulty,
      topic: firstQuestion.topic,
    },
  };
}

/**
 * GET NEXT QUESTION - Adaptive selection based on performance
 */
export const getNextQuestionInput = z.object({
  sessionId: z.number(),
});

export async function getNextQuestionMutation(input: z.infer<typeof getNextQuestionInput>) {
  // Get session details
  const session = await dbAdapter.getSession(input.sessionId);
  if (!session) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Quiz session not found' });
  }

  // Get all responses so far
  const responses = await dbAdapter.getSessionResponses(input.sessionId);
  console.log(`[Adaptive Quiz] Session ${input.sessionId}: ${responses.length} responses so far`);
  console.log(`[Adaptive Quiz] Answered question IDs:`, responses.map(r => r.questionId));
  
  // Check if quiz is complete
  if (responses.length >= session.totalQuestions) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Quiz already completed' });
  }

  // Get all questions from module
  const allQuestions = await dbAdapter.getQuestionsByModule(session.moduleId);
  
  if (allQuestions.length === 0) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'No questions found' });
  }

  // Calculate performance metrics
  const metrics = calculatePerformanceMetrics(responses, allQuestions);

  // Get unique topics from available questions
  const availableTopics = [...new Set(allQuestions.map(q => q.topic))];
  
  // Find the primary topic (most common in available questions)
  const topicCounts = allQuestions.reduce((acc, q) => {
    acc[q.topic] = (acc[q.topic] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const primaryTopic = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || availableTopics[0];

  // Select topic based on focus area
  const focusArea = (session.focusArea as FocusArea) || 'balanced';
  const targetTopic = selectTopic(focusArea, metrics, availableTopics, primaryTopic);

  // Determine optimal difficulty
  const targetDifficulty = determineOptimalDifficulty(metrics, targetTopic);

  // Filter questions by topic and difficulty
  let candidateQuestions = allQuestions.filter(
    q => q.topic === targetTopic && q.difficulty === targetDifficulty
  );

  // Fallback: If no questions match, relax difficulty constraint
  if (candidateQuestions.length === 0) {
    candidateQuestions = allQuestions.filter(q => q.topic === targetTopic);
  }

  // Fallback: If still no questions, use any from target difficulty
  if (candidateQuestions.length === 0) {
    candidateQuestions = allQuestions.filter(q => q.difficulty === targetDifficulty);
  }

  // Fallback: Use any available question
  if (candidateQuestions.length === 0) {
    candidateQuestions = allQuestions;
  }

  // Remove already answered questions
  const answeredIds = responses.map(r => r.questionId);
  candidateQuestions = candidateQuestions.filter(q => !answeredIds.includes(q.id));

  // FINAL FALLBACK: If still no questions after removing answered ones,
  // use ANY unanswered question from the module
  if (candidateQuestions.length === 0) {
    candidateQuestions = allQuestions.filter(q => !answeredIds.includes(q.id));
    
    if (candidateQuestions.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No more questions available' });
    }
  }

  // Select best question using quality scoring
  const selectedQuestion = selectBestQuestion(candidateQuestions, {
    recentTopics: metrics.recentTopics,
    recentQuestionIds: answeredIds.slice(-5),
    studentAvgTime: metrics.avgTimePerQuestion,
  });
  console.log(`[Adaptive Quiz] Selected question ${selectedQuestion.id} from ${candidateQuestions.length} candidates`);

  return {
    currentQuestionNumber: responses.length + 1,
    totalQuestions: session.totalQuestions,
    question: {
      id: selectedQuestion.id,
      questionType: selectedQuestion.questionType,
      questionText: selectedQuestion.questionText,
      questionImage: selectedQuestion.questionImage,
      options: typeof selectedQuestion.options === 'string' 
        ? JSON.parse(selectedQuestion.options) 
        : selectedQuestion.options,
      points: selectedQuestion.points,
      timeLimit: selectedQuestion.timeLimit,
      difficulty: selectedQuestion.difficulty,
      topic: selectedQuestion.topic,
    },
    // Include performance feedback for UI
    performance: {
      overallAccuracy: Math.round(metrics.overallAccuracy * 100),
      recentAccuracy: Math.round(metrics.recentAccuracy * 100),
      masteryScore: metrics.masteryScore,
      currentFocus: targetTopic,
    },
  };
}
