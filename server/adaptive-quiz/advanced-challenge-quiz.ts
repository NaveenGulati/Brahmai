/**
 * Advanced Challenge Quiz Handler
 * Handles quiz start for advanced challenges with multiple topics
 */

import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { questions } from '../../drizzle/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import * as dbAdapter from './db-adapter';
import type { FocusArea } from './types';

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface TopicSelection {
  subject: string;
  topic: string;
  subtopics: string[] | 'all';
}

interface ChallengeScope {
  topics: TopicSelection[];
}

/**
 * Fetch questions for advanced challenge based on challenge scope
 */
export async function fetchAdvancedChallengeQuestions(
  challengeScope: ChallengeScope,
  totalQuestions: number,
  focusArea: FocusArea
): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const allQuestions: any[] = [];
  const seenQuestionIds = new Set<number>();
  const seenQuestionTexts = new Set<string>();

  // Calculate questions per topic (proportional distribution)
  const topicCount = challengeScope.topics.length;
  const questionsPerTopic = Math.floor(totalQuestions / topicCount);
  const remainder = totalQuestions % topicCount;

  // Fetch questions for each topic
  for (let i = 0; i < challengeScope.topics.length; i++) {
    const selection = challengeScope.topics[i];
    const questionsNeeded = questionsPerTopic + (i < remainder ? 1 : 0);

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
            eq(questions.isActive, true)
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(questionsNeeded * 3); // Fetch extra for deduplication
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
            eq(questions.isActive, true)
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(questionsNeeded * 3);
    }

    // Apply focus area filtering
    let filteredQuestions = fetchedQuestions;
    if (focusArea === 'strengthen') {
      // 60% easy, 30% medium, 10% hard
      const easyCount = Math.ceil(questionsNeeded * 0.6);
      const mediumCount = Math.ceil(questionsNeeded * 0.3);
      const hardCount = questionsNeeded - easyCount - mediumCount;
      
      filteredQuestions = [
        ...fetchedQuestions.filter(q => q.difficulty === 'easy').slice(0, easyCount),
        ...fetchedQuestions.filter(q => q.difficulty === 'medium').slice(0, mediumCount),
        ...fetchedQuestions.filter(q => q.difficulty === 'hard').slice(0, hardCount),
      ];
    } else if (focusArea === 'improve') {
      // 60% hard, 30% medium, 10% easy
      const hardCount = Math.ceil(questionsNeeded * 0.6);
      const mediumCount = Math.ceil(questionsNeeded * 0.3);
      const easyCount = questionsNeeded - hardCount - mediumCount;
      
      filteredQuestions = [
        ...fetchedQuestions.filter(q => q.difficulty === 'hard').slice(0, hardCount),
        ...fetchedQuestions.filter(q => q.difficulty === 'medium').slice(0, mediumCount),
        ...fetchedQuestions.filter(q => q.difficulty === 'easy').slice(0, easyCount),
      ];
    } else {
      // Balanced: 33% each
      const perDifficulty = Math.ceil(questionsNeeded / 3);
      filteredQuestions = [
        ...fetchedQuestions.filter(q => q.difficulty === 'easy').slice(0, perDifficulty),
        ...fetchedQuestions.filter(q => q.difficulty === 'medium').slice(0, perDifficulty),
        ...fetchedQuestions.filter(q => q.difficulty === 'hard').slice(0, perDifficulty),
      ];
    }

    // Add questions with deduplication
    for (const question of filteredQuestions) {
      const normalizedText = question.questionText.toLowerCase().trim();
      
      if (!seenQuestionIds.has(question.id) && !seenQuestionTexts.has(normalizedText)) {
        allQuestions.push(question);
        seenQuestionIds.add(question.id);
        seenQuestionTexts.add(normalizedText);
        
        if (allQuestions.length >= totalQuestions) {
          break;
        }
      }
    }

    if (allQuestions.length >= totalQuestions) {
      break;
    }
  }

  // Shuffle questions to mix topics
  for (let i = allQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
  }

  return allQuestions.slice(0, totalQuestions);
}

/**
 * Start quiz for advanced challenge
 */
export async function startAdvancedChallengeQuiz(
  challengeId: number,
  childId: number
): Promise<{
  sessionId: number;
  totalQuestions: number;
  currentQuestionNumber: number;
  focusArea: FocusArea;
  question: any;
}> {
  // Get challenge details
  const challenge = await dbAdapter.getChallenge(challengeId);
  if (!challenge) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Challenge not found' });
  }

  if (challenge.challengeType !== 'advanced') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not an advanced challenge' });
  }

  const focusArea = (challenge.focusArea as FocusArea) || 'balanced';
  const quizSize = challenge.questionCount || 20;
  
  // Handle both formats: direct array or {topics: array}
  let challengeScope: ChallengeScope;
  const rawScope = challenge.challengeScope as any;
  
  if (Array.isArray(rawScope)) {
    // Direct array format from database
    challengeScope = { topics: rawScope };
  } else if (rawScope && rawScope.topics) {
    // Wrapped format
    challengeScope = rawScope as ChallengeScope;
  } else {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid challenge scope' });
  }

  if (!challengeScope.topics || challengeScope.topics.length === 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid challenge scope' });
  }

  // Fetch questions for all selected topics
  const allQuestions = await fetchAdvancedChallengeQuestions(
    challengeScope,
    quizSize,
    focusArea
  );

  if (allQuestions.length === 0) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'No questions found for selected topics' });
  }

  // Create quiz session (use first topic's moduleId as placeholder, or null)
  // For advanced challenges, we'll use moduleId = null since it's multi-topic
  const sessionId = await dbAdapter.createSession({
    childId,
    moduleId: null as any, // Advanced challenges don't have a single moduleId
    totalQuestions: allQuestions.length,
    focusArea,
    challengeId,
  });

  // Store the question sequence in session metadata (we'll need to track this)
  // For now, we'll rely on the adaptive quiz flow to select questions

  // Select first question
  const firstQuestion = allQuestions[0];

  // Parse and shuffle options for MCQs
  const parsedOptions = typeof firstQuestion.options === 'string' 
    ? JSON.parse(firstQuestion.options) 
    : firstQuestion.options;
  const shuffledOptions = firstQuestion.questionType === 'multiple_choice' && Array.isArray(parsedOptions)
    ? shuffleArray(parsedOptions)
    : parsedOptions;

  return {
    sessionId,
    totalQuestions: allQuestions.length,
    currentQuestionNumber: 1,
    focusArea,
    question: {
      id: firstQuestion.id,
      questionType: firstQuestion.questionType,
      questionText: firstQuestion.questionText,
      questionImage: firstQuestion.questionImage,
      options: shuffledOptions,
      points: firstQuestion.points,
      timeLimit: firstQuestion.timeLimit,
      difficulty: firstQuestion.difficulty,
      topic: firstQuestion.topic,
    },
  };
}
