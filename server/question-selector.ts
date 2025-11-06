/**
 * ============================================
 * ADAPTIVE QUESTION SELECTOR
 * ============================================
 * Selects questions for challenges based on:
 * - Complexity level (1-10)
 * - Focus area (strengthen/improve/neutral)
 * - Student performance data
 * - Progressive difficulty mixing
 * 
 * This is the core algorithm for adaptive challenge creation
 */

import { eq, and, inArray, sql } from 'drizzle-orm';
import { getDb } from './db';
import { questions, studentTopicPerformance } from '../drizzle/schema';

export interface QuestionSelectionConfig {
  moduleId: number;
  subject: string;
  topic: string;
  childId: number;
  questionCount: number; // 10-100
  focusArea: 'strengthen' | 'improve' | 'balanced';
}

export interface DifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

/**
 * Main function: Select questions for a challenge
 * Returns array of question IDs and the difficulty distribution used
 */
export async function selectQuestionsForChallenge(
  config: QuestionSelectionConfig
): Promise<{
  questionIds: number[];
  distribution: DifficultyDistribution;
  estimatedDuration: number; // in minutes
}> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    // 1. Calculate difficulty distribution based on focus area
    const distribution = calculateDifficultyDistribution(config.focusArea);

    // 2. Get topic filter based on focus area
    const topicFilter = await getTopicFilter(config.childId, config.subject, config.focusArea);

    // 3. Fetch available questions
    const availableQuestions = await fetchAvailableQuestions(
      config.subject,
      config.topic,
      topicFilter
    );

    if (availableQuestions.length === 0) {
      throw new Error(`No questions found for ${config.subject} - ${config.topic}`);
    }

    // 4. Select questions according to distribution
    const selectedQuestions = selectByDistribution(
      availableQuestions,
      distribution,
      config.questionCount
    );

    // 5. Calculate estimated duration
    const estimatedDuration = calculateEstimatedDuration(selectedQuestions);

    return {
      questionIds: selectedQuestions.map(q => q.id),
      distribution,
      estimatedDuration,
    };
  } catch (error) {
    console.error('[Question Selector] Error selecting questions:', error);
    throw error;
  }
}

/**
 * Calculate difficulty distribution based on focus area
 * - strengthen: More easy questions (60% easy, 30% medium, 10% hard)
 * - balanced: Even mix (33% easy, 34% medium, 33% hard)
 * - improve: More hard questions (10% easy, 30% medium, 60% hard)
 */
function calculateDifficultyDistribution(focusArea: 'strengthen' | 'improve' | 'balanced'): DifficultyDistribution {
  switch (focusArea) {
    case 'strengthen':
      return {
        easy: 60,
        medium: 30,
        hard: 10,
      };
    
    case 'balanced':
      return {
        easy: 33,
        medium: 34,
        hard: 33,
      };
    
    case 'improve':
      return {
        easy: 10,
        medium: 30,
        hard: 60,
      };
    
    default:
      // Default to balanced
      return {
        easy: 33,
        medium: 34,
        hard: 33,
      };
  }
}

/**
 * Get topic filter based on focus area and student performance
 */
async function getTopicFilter(
  childId: number,
  subject: string,
  focusArea: 'strengthen' | 'improve' | 'balanced'
): Promise<string[] | null> {
  if (focusArea === 'balanced') {
    return null; // No filtering
  }

  const db = await getDb();
  if (!db) return null;

  try {
    const performance = await db
      .select()
      .from(studentTopicPerformance)
      .where(
        and(
          eq(studentTopicPerformance.childId, childId),
          eq(studentTopicPerformance.subject, subject)
        )
      );

    if (performance.length === 0) {
      return null; // No performance data yet, use neutral
    }

    if (focusArea === 'strengthen') {
      // Return topics where student is strong
      return performance
        .filter(p => p.performanceLevel === 'strong')
        .map(p => p.topic);
    } else {
      // Return topics where student is weak
      return performance
        .filter(p => p.performanceLevel === 'weak')
        .map(p => p.topic);
    }
  } catch (error) {
    console.error('[Question Selector] Error getting topic filter:', error);
    return null;
  }
}

/**
 * Fetch available questions from database
 */
async function fetchAvailableQuestions(
  subject: string,
  topic: string,
  topicFilter: string[] | null
): Promise<Array<{ id: number; difficulty: string; timeLimit: number; topic: string }>> {
  const db = await getDb();
  if (!db) return [];

  try {
    let query = db
      .select({
        id: questions.id,
        difficulty: questions.difficulty,
        timeLimit: questions.timeLimit,
        topic: questions.topic,
      })
      .from(questions)
      .where(
        and(
          eq(questions.subject, subject),
          eq(questions.status, 'approved'),
          eq(questions.isActive, true)
        )
      );

    // Apply topic filter if focus area is not neutral
    if (topicFilter && topicFilter.length > 0) {
      query = query.where(
        and(
          eq(questions.subject, subject),
          inArray(questions.topic, topicFilter),
          eq(questions.status, 'approved'),
          eq(questions.isActive, true)
        )
      ) as any;
    }

    const result = await query;
    return result as any;
  } catch (error) {
    console.error('[Question Selector] Error fetching questions:', error);
    return [];
  }
}

/**
 * Select questions according to difficulty distribution
 * Randomizes within each difficulty level
 */
function selectByDistribution(
  availableQuestions: Array<{ id: number; difficulty: string; timeLimit: number; topic: string }>,
  distribution: DifficultyDistribution,
  totalCount: number
): Array<{ id: number; difficulty: string; timeLimit: number; topic: string }> {
  // Group questions by difficulty
  const easyQuestions = availableQuestions.filter(q => q.difficulty === 'easy');
  const mediumQuestions = availableQuestions.filter(q => q.difficulty === 'medium');
  const hardQuestions = availableQuestions.filter(q => q.difficulty === 'hard');

  // Calculate counts for each difficulty
  const easyCount = Math.round((distribution.easy / 100) * totalCount);
  const mediumCount = Math.round((distribution.medium / 100) * totalCount);
  const hardCount = Math.round((distribution.hard / 100) * totalCount);

  // Adjust for rounding errors
  let adjustedCounts = { easy: easyCount, medium: mediumCount, hard: hardCount };
  const currentTotal = easyCount + mediumCount + hardCount;
  
  if (currentTotal < totalCount) {
    // Add missing questions to the most prominent difficulty
    const diff = totalCount - currentTotal;
    if (distribution.easy >= distribution.medium && distribution.easy >= distribution.hard) {
      adjustedCounts.easy += diff;
    } else if (distribution.medium >= distribution.hard) {
      adjustedCounts.medium += diff;
    } else {
      adjustedCounts.hard += diff;
    }
  } else if (currentTotal > totalCount) {
    // Remove extra questions from the most prominent difficulty
    const diff = currentTotal - totalCount;
    if (distribution.easy >= distribution.medium && distribution.easy >= distribution.hard) {
      adjustedCounts.easy -= diff;
    } else if (distribution.medium >= distribution.hard) {
      adjustedCounts.medium -= diff;
    } else {
      adjustedCounts.hard -= diff;
    }
  }

  // Randomly select questions from each pool
  const selectedEasy = randomSelect(easyQuestions, adjustedCounts.easy);
  const selectedMedium = randomSelect(mediumQuestions, adjustedCounts.medium);
  const selectedHard = randomSelect(hardQuestions, adjustedCounts.hard);

  // Combine and shuffle
  const allSelected = [...selectedEasy, ...selectedMedium, ...selectedHard];
  return shuffle(allSelected);
}

/**
 * Randomly select N items from array
 */
function randomSelect<T>(array: T[], count: number): T[] {
  if (count >= array.length) return [...array];
  
  const shuffled = shuffle([...array]);
  return shuffled.slice(0, count);
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Calculate estimated duration based on question time limits
 */
function calculateEstimatedDuration(
  questions: Array<{ timeLimit: number }>
): number {
  const totalSeconds = questions.reduce((sum, q) => sum + (q.timeLimit || 60), 0);
  return Math.ceil(totalSeconds / 60); // Convert to minutes
}

