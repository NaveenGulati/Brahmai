/**
 * Get Next Question for Advanced Challenge
 * Handles question selection for multi-topic advanced challenges
 */

import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { questions } from '../../drizzle/schema';
import { eq, and, inArray, sql, notInArray } from 'drizzle-orm';
import * as dbAdapter from './db-adapter';
import type { FocusArea } from './types';

interface TopicSelection {
  subject: string;
  topic: string;
  subtopics: string[] | 'all';
}

interface ChallengeScope {
  topics: TopicSelection[];
}

/**
 * Get next question for advanced challenge quiz
 */
export async function getNextAdvancedChallengeQuestion(
  sessionId: number
): Promise<{
  currentQuestionNumber: number;
  totalQuestions: number;
  question: any;
}> {
  // Get session details
  const session = await dbAdapter.getSession(sessionId);
  if (!session) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Quiz session not found' });
  }

  // Get challenge details
  if (!session.challengeId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session is not linked to a challenge' });
  }

  const challenge = await dbAdapter.getChallenge(session.challengeId);
  if (!challenge || challenge.challengeType !== 'advanced') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not an advanced challenge' });
  }

  // Handle both old and new challengeScope structures for backward compatibility
  let challengeScope: ChallengeScope;
  const rawScope = challenge.challengeScope as any;
  
  if (Array.isArray(rawScope)) {
    // Old format: challengeScope is directly an array of selections
    challengeScope = { topics: rawScope };
  } else if (rawScope && Array.isArray(rawScope.topics)) {
    // New format: challengeScope has a topics property
    challengeScope = rawScope as ChallengeScope;
  } else {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid challenge scope structure' });
  }
  
  const focusArea = (session.focusArea as FocusArea) || 'balanced';

  // Get all responses so far
  const responses = await dbAdapter.getSessionResponses(sessionId);
  
  // Check if quiz is complete
  if (responses.length >= session.totalQuestions) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Quiz already completed' });
  }

  // Get answered question IDs and texts for deduplication
  const answeredIds = responses.map(r => r.questionId);
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get answered question texts
  const answeredQuestions = await db
    .select()
    .from(questions)
    .where(inArray(questions.id, answeredIds));
  
  const answeredQuestionTexts = answeredQuestions.map(q => 
    q.questionText.toLowerCase().trim()
  );

  // Fetch candidate questions from all topics in challenge scope
  const candidateQuestions: any[] = [];

  for (const selection of challengeScope.topics) {
    let fetchedQuestions: any[];

    if (selection.subtopics === 'all') {
      // Fetch all questions for this topic
      fetchedQuestions = await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.subject, selection.subject),
            eq(questions.topic, selection.topic),
            eq(questions.status, 'approved'),
            eq(questions.isActive, true),
            notInArray(questions.id, answeredIds.length > 0 ? answeredIds : [-1]) // Avoid already answered
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(10); // Fetch a few candidates per topic
    } else {
      // Fetch questions for specific subtopics
      fetchedQuestions = await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.subject, selection.subject),
            eq(questions.topic, selection.topic),
            inArray(questions.subTopic, selection.subtopics as string[]),
            eq(questions.status, 'approved'),
            eq(questions.isActive, true),
            notInArray(questions.id, answeredIds.length > 0 ? answeredIds : [-1])
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(10);
    }

    candidateQuestions.push(...fetchedQuestions);
  }

  if (candidateQuestions.length === 0) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'No more questions available' });
  }

  // Apply focus area filtering
  let filteredQuestions = candidateQuestions;
  
  if (focusArea === 'strengthen') {
    // Prefer easy questions
    filteredQuestions = [
      ...candidateQuestions.filter(q => q.difficulty === 'easy'),
      ...candidateQuestions.filter(q => q.difficulty === 'medium'),
      ...candidateQuestions.filter(q => q.difficulty === 'hard'),
    ];
  } else if (focusArea === 'improve') {
    // Prefer hard questions
    filteredQuestions = [
      ...candidateQuestions.filter(q => q.difficulty === 'hard'),
      ...candidateQuestions.filter(q => q.difficulty === 'medium'),
      ...candidateQuestions.filter(q => q.difficulty === 'easy'),
    ];
  } else {
    // Balanced: random mix
    filteredQuestions = candidateQuestions.sort(() => Math.random() - 0.5);
  }

  // Find first question that's not a duplicate (by text)
  let selectedQuestion = null;
  for (const question of filteredQuestions) {
    const normalizedText = question.questionText.toLowerCase().trim();
    if (!answeredQuestionTexts.includes(normalizedText)) {
      selectedQuestion = question;
      break;
    }
  }

  // Fallback: if all have duplicate texts, just pick the first one
  if (!selectedQuestion) {
    selectedQuestion = filteredQuestions[0];
  }

  if (!selectedQuestion) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'No suitable question found' });
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
  };
}
