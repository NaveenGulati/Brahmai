/**
 * Advanced Challenge Algorithm v2
 * 
 * Redesigned to work with actual database schema (questions table)
 * Following CRITICAL_DEVELOPMENT_GUIDELINES.md
 */

import { getDb } from '../db';
import { questions } from '../../drizzle/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';

// ============================================
// TYPES
// ============================================

export interface TopicSelection {
  subject: string;
  topic: string;
  subtopics: string[] | 'all'; // 'all' or array of specific subtopic names
}

export interface AvailableQuestion {
  available: number;
  selections: TopicSelection;
}

export interface Distribution {
  subject: string;
  topic: string;
  subtopics: string[] | 'all';
  available: number;
  allocated: number;
}

export interface Shortfall {
  subject: string;
  topic: string;
  subtopics: string[] | 'all';
  requested: number;
  available: number;
  shortfall: number;
}

export interface SelectedQuestion {
  id: number;
  questionText: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
  subject: string;
  topic: string;
  subTopic: string;
}

// ============================================
// CONSTANTS
// ============================================

const MIN_QUESTIONS_PER_TOPIC = 3;
const MAX_CONSECUTIVE_FROM_SAME_TOPIC = 3;
const MIN_TOTAL_QUESTIONS = 9; // 3 topics × 3 questions
const MAX_TOTAL_QUESTIONS = 200;
const MAX_TOPICS = 10;

// ============================================
// FUNCTION 1: Calculate Available Questions
// ============================================

/**
 * Count available questions for each topic selection
 * Queries the questions table directly
 */
export async function calculateAvailableQuestions(
  selections: TopicSelection[]
): Promise<AvailableQuestion[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const results: AvailableQuestion[] = [];

  for (const selection of selections) {
    let count: number;

    if (selection.subtopics === 'all') {
      // Count all questions for this subject + topic
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(questions)
        .where(
          and(
            eq(questions.subject, selection.subject),
            eq(questions.topic, selection.topic),
            eq(questions.status, 'approved'),
            eq(questions.isActive, true)
          )
        );
      count = result[0]?.count || 0;
    } else {
      // Count questions for specific subtopics
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(questions)
        .where(
          and(
            eq(questions.subject, selection.subject),
            eq(questions.topic, selection.topic),
            inArray(questions.subTopic, selection.subtopics),
            eq(questions.status, 'approved'),
            eq(questions.isActive, true)
          )
        );
      count = result[0]?.count || 0;
    }

    results.push({
      available: count,
      selections: selection
    });
  }

  return results;
}

// ============================================
// FUNCTION 2: Suggest Question Count
// ============================================

/**
 * Suggest optimal total question count based on number of topics
 */
export function suggestQuestionCount(topicCount: number): number {
  if (topicCount <= 0) return MIN_TOTAL_QUESTIONS;
  if (topicCount === 1) return 25;
  if (topicCount <= 3) return 30;
  if (topicCount <= 5) return 50;
  if (topicCount <= 8) return 75;
  return 100;
}

// ============================================
// FUNCTION 3: Calculate Distribution
// ============================================

/**
 * Calculate proportional distribution with graceful degradation
 * Returns distribution and any shortfalls
 */
export async function calculateDistribution(
  selections: TopicSelection[],
  totalQuestions: number
): Promise<{ distribution: Distribution[]; shortfalls: Shortfall[] }> {
  // Validation
  if (selections.length === 0) {
    throw new Error('At least one topic must be selected');
  }
  if (selections.length > MAX_TOPICS) {
    throw new Error(`Maximum ${MAX_TOPICS} topics allowed`);
  }
  if (totalQuestions < MIN_TOTAL_QUESTIONS) {
    throw new Error(`Minimum ${MIN_TOTAL_QUESTIONS} questions required`);
  }
  if (totalQuestions > MAX_TOTAL_QUESTIONS) {
    throw new Error(`Maximum ${MAX_TOTAL_QUESTIONS} questions allowed`);
  }

  // Get available questions for each selection
  const availableQuestions = await calculateAvailableQuestions(selections);

  // Calculate total available
  const totalAvailable = availableQuestions.reduce((sum, aq) => sum + aq.available, 0);

  if (totalAvailable === 0) {
    throw new Error('No questions available for selected topics');
  }

  // Calculate proportional distribution
  const distribution: Distribution[] = [];
  const shortfalls: Shortfall[] = [];
  let allocatedSoFar = 0;

  for (let i = 0; i < availableQuestions.length; i++) {
    const aq = availableQuestions[i];
    const isLast = i === availableQuestions.length - 1;

    // Calculate proportional share
    const proportion = aq.available / totalAvailable;
    let allocated = Math.round(proportion * totalQuestions);

    // For last topic, allocate remaining to avoid rounding errors
    if (isLast) {
      allocated = totalQuestions - allocatedSoFar;
    }

    // Apply minimum (with graceful degradation)
    if (allocated < MIN_QUESTIONS_PER_TOPIC && aq.available > 0) {
      if (aq.available >= MIN_QUESTIONS_PER_TOPIC) {
        allocated = MIN_QUESTIONS_PER_TOPIC;
      } else {
        // Graceful degradation: use what's available
        allocated = aq.available;
        shortfalls.push({
          subject: aq.selections.subject,
          topic: aq.selections.topic,
          subtopics: aq.selections.subtopics,
          requested: MIN_QUESTIONS_PER_TOPIC,
          available: aq.available,
          shortfall: MIN_QUESTIONS_PER_TOPIC - aq.available
        });
      }
    }

    // Cap at available
    if (allocated > aq.available) {
      shortfalls.push({
        subject: aq.selections.subject,
        topic: aq.selections.topic,
        subtopics: aq.selections.subtopics,
        requested: allocated,
        available: aq.available,
        shortfall: allocated - aq.available
      });
      allocated = aq.available;
    }

    distribution.push({
      subject: aq.selections.subject,
      topic: aq.selections.topic,
      subtopics: aq.selections.subtopics,
      available: aq.available,
      allocated
    });

    allocatedSoFar += allocated;
  }

  return { distribution, shortfalls };
}

// ============================================
// FUNCTION 4: Select Questions
// ============================================

/**
 * Select questions based on distribution with:
 * - Strict deduplication (no question appears twice)
 * - Adaptive mixing (max 3 consecutive from same topic)
 */
export async function selectQuestions(
  distribution: Distribution[]
): Promise<SelectedQuestion[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Step 1: Fetch questions for each distribution
  const questionPools: Map<string, SelectedQuestion[]> = new Map();

  for (const dist of distribution) {
    const key = `${dist.subject}|${dist.topic}`;
    
    let fetchedQuestions: any[];

    if (dist.subtopics === 'all') {
      // Fetch all questions for this topic
      fetchedQuestions = await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.subject, dist.subject),
            eq(questions.topic, dist.topic),
            eq(questions.status, 'approved'),
            eq(questions.isActive, true)
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(dist.allocated * 2); // Fetch extra for deduplication safety
    } else {
      // Fetch questions for specific subtopics
      fetchedQuestions = await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.subject, dist.subject),
            eq(questions.topic, dist.topic),
            inArray(questions.subTopic, dist.subtopics as string[]),
            eq(questions.status, 'approved'),
            eq(questions.isActive, true)
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(dist.allocated * 2);
    }

    questionPools.set(key, fetchedQuestions);
  }

  // Step 2: Select questions with deduplication and adaptive mixing
  const selectedQuestions: SelectedQuestion[] = [];
  const seenQuestionIds = new Set<number>();
  const seenQuestionTexts = new Set<string>();
  
  let consecutiveFromSameTopic = 0;
  let lastTopicKey = '';

  // Create weighted random selector
  const topicKeys = Array.from(questionPools.keys());
  const weights = topicKeys.map(key => {
    const dist = distribution.find(d => `${d.subject}|${d.topic}` === key)!;
    return dist.allocated;
  });

  while (selectedQuestions.length < distribution.reduce((sum, d) => sum + d.allocated, 0)) {
    // Select next topic (weighted random, avoid too many consecutive)
    let selectedKey: string;
    
    if (consecutiveFromSameTopic >= MAX_CONSECUTIVE_FROM_SAME_TOPIC && topicKeys.length > 1) {
      // Force switch to different topic
      const otherKeys = topicKeys.filter(k => k !== lastTopicKey);
      selectedKey = otherKeys[Math.floor(Math.random() * otherKeys.length)];
    } else {
      // Weighted random selection
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let random = Math.random() * totalWeight;
      let selectedIndex = 0;
      
      for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          selectedIndex = i;
          break;
        }
      }
      
      selectedKey = topicKeys[selectedIndex];
    }

    // Get next question from selected pool
    const pool = questionPools.get(selectedKey)!;
    let question: any = null;

    // Find first non-duplicate question
    for (const q of pool) {
      const normalizedText = q.questionText.toLowerCase().trim();
      
      if (!seenQuestionIds.has(q.id) && !seenQuestionTexts.has(normalizedText)) {
        question = q;
        break;
      }
    }

    if (!question) {
      // No more unique questions in this pool, skip
      const index = topicKeys.indexOf(selectedKey);
      topicKeys.splice(index, 1);
      weights.splice(index, 1);
      
      if (topicKeys.length === 0) break; // No more questions available
      continue;
    }

    // Add question
    selectedQuestions.push(question);
    seenQuestionIds.add(question.id);
    seenQuestionTexts.add(question.questionText.toLowerCase().trim());

    // Remove from pool
    const pool2 = questionPools.get(selectedKey)!;
    const qIndex = pool2.findIndex(q => q.id === question.id);
    pool2.splice(qIndex, 1);

    // Update consecutive counter
    if (selectedKey === lastTopicKey) {
      consecutiveFromSameTopic++;
    } else {
      consecutiveFromSameTopic = 1;
      lastTopicKey = selectedKey;
    }

    // Decrease weight for this topic
    const index = topicKeys.indexOf(selectedKey);
    weights[index] = Math.max(0, weights[index] - 1);
  }

  return selectedQuestions;
}

// ============================================
// FUNCTION 5: Log Shortfalls
// ============================================

/**
 * Log question bank shortfalls for QB admin review
 * Never throws - silent logging
 */
export async function logShortfalls(
  challengeId: number | null,
  shortfalls: Shortfall[]
): Promise<void> {
  if (shortfalls.length === 0) return;

  try {
    const db = await getDb();
    if (!db) return;

    const { questionBankShortfalls } = await import('../../drizzle/schema');

    for (const shortfall of shortfalls) {
      await db.insert(questionBankShortfalls).values({
        challengeId,
        subject: shortfall.subject,
        topic: shortfall.topic,
        subtopic: shortfall.subtopics === 'all' ? null : (shortfall.subtopics as string[]).join(', '),
        requestedCount: shortfall.requested,
        availableCount: shortfall.available,
        shortfall: shortfall.shortfall
      });
    }
  } catch (error) {
    // Silent failure - don't block challenge creation
    console.error('[Advanced Challenge] Failed to log shortfalls:', error);
  }
}

// ============================================
// FUNCTION 6: Adjust Distribution
// ============================================

/**
 * Adjust distribution when parent changes total question count
 * Maintains proportions
 */
export function adjustDistribution(
  currentDistribution: Distribution[],
  newTotal: number
): Distribution[] {
  const currentTotal = currentDistribution.reduce((sum, d) => sum + d.allocated, 0);
  if (currentTotal === 0) return currentDistribution;

  const adjusted: Distribution[] = [];
  let allocatedSoFar = 0;

  for (let i = 0; i < currentDistribution.length; i++) {
    const dist = currentDistribution[i];
    const isLast = i === currentDistribution.length - 1;

    // Calculate new allocation proportionally
    const proportion = dist.allocated / currentTotal;
    let newAllocated = Math.round(proportion * newTotal);

    // For last, allocate remaining
    if (isLast) {
      newAllocated = newTotal - allocatedSoFar;
    }

    // Apply constraints
    newAllocated = Math.max(MIN_QUESTIONS_PER_TOPIC, newAllocated);
    newAllocated = Math.min(dist.available, newAllocated);

    adjusted.push({
      ...dist,
      allocated: newAllocated
    });

    allocatedSoFar += newAllocated;
  }

  return adjusted;
}
