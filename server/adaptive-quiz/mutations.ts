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

  // Find the primary topic (most common in available questions = module's topic)
  const topicCounts = allQuestions.reduce((acc, q) => {
    acc[q.topic] = (acc[q.topic] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const moduleTopic = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  
  if (!moduleTopic) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'No questions found for this module' });
  }
  
  console.log(`[Adaptive Quiz] Module topic: ${moduleTopic}`);

  // Filter questions to ONLY the module's topic
  const moduleQuestions = allQuestions.filter(q => q.topic === moduleTopic);
  
  if (moduleQuestions.length === 0) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `No questions found for topic: ${moduleTopic}` });
  }

  // Determine optimal difficulty based on performance in THIS topic
  const targetDifficulty = determineOptimalDifficulty(metrics, moduleTopic);
  console.log(`[Adaptive Quiz] Target difficulty: ${targetDifficulty}`);

  // Remove already answered questions first
  const answeredIds = responses.map(r => r.questionId);
  console.log(`[Adaptive Quiz] Filtering out answered questions:`, answeredIds);
  console.log(`[Adaptive Quiz] Total module questions: ${moduleQuestions.length}`);
  let unansweredQuestions = moduleQuestions.filter(q => !answeredIds.includes(q.id));
  console.log(`[Adaptive Quiz] Unanswered questions remaining: ${unansweredQuestions.length}`);
  
  // Remove questions with duplicate text (data quality issue)
  const answeredQuestionTexts = responses
    .map(r => {
      const q = allQuestions.find(aq => aq.id === r.questionId);
      return q?.questionText || '';
    })
    .filter(text => text.length > 0);
  
  unansweredQuestions = unansweredQuestions.filter(q => {
    const isDuplicate = answeredQuestionTexts.includes(q.questionText);
    if (isDuplicate) {
      console.log(`[Adaptive Quiz] Skipping duplicate question text: ${q.id} - "${q.questionText.substring(0, 60)}..."`);
    }
    return !isDuplicate;
  });
  console.log(`[Adaptive Quiz] After removing duplicate texts: ${unansweredQuestions.length}`);
  
  // Filter by target difficulty
  let candidateQuestions = unansweredQuestions.filter(q => q.difficulty === targetDifficulty);
  
  // Progressive fallback: Try adjacent difficulties before giving up
  if (candidateQuestions.length === 0) {
    console.log(`[Adaptive Quiz] No unanswered ${targetDifficulty} questions, trying fallback...`);
    
    if (targetDifficulty === 'hard') {
      // Try medium first, then easy
      candidateQuestions = unansweredQuestions.filter(q => q.difficulty === 'medium');
      if (candidateQuestions.length === 0) {
        console.log(`[Adaptive Quiz] No medium questions, falling back to easy`);
        candidateQuestions = unansweredQuestions.filter(q => q.difficulty === 'easy');
      } else {
        console.log(`[Adaptive Quiz] Using medium questions as fallback`);
      }
    } else if (targetDifficulty === 'easy') {
      // Try medium first, then hard
      candidateQuestions = unansweredQuestions.filter(q => q.difficulty === 'medium');
      if (candidateQuestions.length === 0) {
        console.log(`[Adaptive Quiz] No medium questions, falling back to hard`);
        candidateQuestions = unansweredQuestions.filter(q => q.difficulty === 'hard');
      } else {
        console.log(`[Adaptive Quiz] Using medium questions as fallback`);
      }
    } else {
      // Medium: try easy first (closer to current level), then hard
      candidateQuestions = unansweredQuestions.filter(q => q.difficulty === 'easy');
      if (candidateQuestions.length === 0) {
        console.log(`[Adaptive Quiz] No easy questions, falling back to hard`);
        candidateQuestions = unansweredQuestions.filter(q => q.difficulty === 'hard');
      } else {
        console.log(`[Adaptive Quiz] Using easy questions as fallback`);
      }
    }
  }

  // FINAL FALLBACK: If still no questions after removing answered ones,
  // use ANY unanswered question from the MODULE TOPIC (never cross topic boundary)
  if (candidateQuestions.length === 0) {
    candidateQuestions = moduleQuestions.filter(q => !answeredIds.includes(q.id));
    
    if (candidateQuestions.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `No more unanswered questions available in topic: ${moduleTopic}` });
    }
  }

  // Get student's historical performance on all questions (across all sessions)
  const allStudentResponses = await dbAdapter.getChildResponses(session.childId);
  const questionHistory = allStudentResponses.reduce((acc, r) => {
    if (!acc[r.questionId]) {
      acc[r.questionId] = { attempts: 0, correct: 0 };
    }
    acc[r.questionId].attempts++;
    if (r.isCorrect) acc[r.questionId].correct++;
    return acc;
  }, {} as Record<number, { attempts: number; correct: number }>);

  // Select best question using quality scoring
  const selectedQuestion = selectBestQuestion(candidateQuestions, {
    recentTopics: metrics.recentTopics,
    recentQuestionIds: answeredIds, // Pass ALL answered IDs to prevent any duplicates
    studentAvgTime: metrics.avgTimePerQuestion,
    focusArea: (session.focusArea as FocusArea) || 'balanced',
    questionHistory: questionHistory,
  });
  console.log(`[Adaptive Quiz] Selected question ${selectedQuestion.id} (difficulty: ${selectedQuestion.difficulty}) from ${candidateQuestions.length} candidates`);
  
  // Safety check: Ensure we're not repeating a question ID or text
  if (answeredIds.includes(selectedQuestion.id)) {
    console.error(`[Adaptive Quiz] ERROR: Selected question ${selectedQuestion.id} was already answered! This should never happen.`);
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Question selection error: duplicate question selected' });
  }
  
  if (answeredQuestionTexts.includes(selectedQuestion.questionText)) {
    console.error(`[Adaptive Quiz] ERROR: Selected question ${selectedQuestion.id} has duplicate text! This should never happen.`);
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Question selection error: duplicate question text selected' });
  }

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
      currentFocus: moduleTopic,
    },
  };
}
