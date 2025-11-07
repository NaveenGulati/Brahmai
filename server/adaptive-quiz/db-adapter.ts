/**
 * Database Adapter for Adaptive Quiz Module
 * 
 * This provides a clean abstraction layer between the adaptive quiz engine
 * and the database. Makes it easy to swap out database implementations.
 */

import * as db from '../db';

/**
 * Quiz Session Operations
 */
export async function createSession(data: {
  childId: number;
  moduleId: number;
  totalQuestions: number;
  focusArea: string;
  challengeId?: number;
}) {
  return db.createQuizSession({
    childId: data.childId,
    moduleId: data.moduleId,
    totalQuestions: data.totalQuestions,
    isCompleted: false,
    challengeId: data.challengeId,
    focusArea: data.focusArea,
  });
}

export async function getSession(sessionId: number) {
  return db.getQuizSessionById(sessionId);
}

export async function updateSession(sessionId: number, data: any) {
  return db.updateQuizSession(sessionId, data);
}

/**
 * Question Operations
 */
export async function getQuestionsByModule(moduleId: number) {
  return db.getQuestionsByModule(moduleId);
}

export async function getQuestionById(questionId: number) {
  const questions = await db.getQuestionsByIds([questionId]);
  return questions[0];
}

/**
 * Response Operations
 */
export async function getSessionResponses(sessionId: number) {
  return db.getSessionResponses(sessionId);
}

export async function getChildResponses(childId: number) {
  return db.getChildResponses(childId);
}

export async function saveResponse(data: {
  sessionId: number;
  questionId: number;
  userAnswer: string;
  isCorrect: boolean;
  timeTaken: number;
  pointsEarned: number;
}) {
  return db.saveQuizResponse(data);
}

/**
 * Challenge Operations
 */
export async function getChallenge(challengeId: number) {
  const { getDb } = await import('../db');
  const { challenges } = await import('../../drizzle/schema');
  const { eq } = await import('drizzle-orm');
  
  const database = await getDb();
  if (!database) return null;
  
  const result = await database
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Performance Tracking (Future)
 */
export async function getTopicPerformance(childId: number, subject: string) {
  // TODO: Implement when studentTopicPerformance table is populated
  return {};
}

export async function updateTopicPerformance(childId: number, topic: string, metrics: any) {
  // TODO: Implement when studentTopicPerformance table is populated
  return;
}
