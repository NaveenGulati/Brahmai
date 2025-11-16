/**
 * Advanced Challenge Algorithm
 * 
 * Implements multi-topic challenge creation with:
 * - Adaptive question mixing (not sequential)
 * - Proportional distribution with minimum guarantees
 * - Graceful degradation when question bank is insufficient
 * - Silent error logging for QB admin monitoring
 * - Strict deduplication (no repeated questions)
 */

import { getDb } from '../db';
import { questions, questionBankShortfalls } from '../../drizzle/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface TopicSelection {
  subject: string;
  topic: string;
  subtopics: string[] | 'all'; // 'all' or specific subtopic names
}

export interface AvailableQuestions {
  selection: TopicSelection;
  totalAvailable: number;
  byDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface QuestionCountSuggestion {
  recommended: number;
  minimum: number;
  maximum: number;
  reasoning: string;
  estimatedDuration: number; // in minutes
}

export interface QuestionDistribution {
  selection: TopicSelection;
  allocated: number;
  percentage: number;
  byDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  availableByDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface SelectedQuestion {
  questionId: number;
  topicIndex: number; // Which topic this came from
  difficulty: 'easy' | 'medium' | 'hard';
  orderIndex: number; // Position in final quiz
  questionText: string; // For deduplication
}

export interface ShortfallLog {
  subject: string;
  topic: string;
  subtopic?: string;
  requestedCount: number;
  availableCount: number;
  shortfall: number;
  difficulty?: string;
}

// ============================================
// CONSTANTS
// ============================================

const MIN_QUESTIONS_PER_TOPIC = 3;
const MAX_CONSECUTIVE_SAME_TOPIC = 3;
const MAX_TOTAL_QUESTIONS = 200;
const MAX_TOPICS = 10;

// ============================================
// STEP 1: CALCULATE AVAILABLE QUESTIONS
// ============================================

/**
 * Calculate how many questions are available for each topic selection
 */
export async function calculateAvailableQuestions(
  selections: TopicSelection[]
): Promise<AvailableQuestions[]> {
  if (selections.length === 0) {
    throw new Error('At least one topic must be selected');
  }
  
  if (selections.length > MAX_TOPICS) {
    throw new Error(`Maximum ${MAX_TOPICS} topics allowed`);
  }
  
  const results: AvailableQuestions[] = [];
  
  for (const selection of selections) {
    // Build where conditions
    const whereConditions = [
      eq(questions.subject, selection.subject),
      eq(questions.topic, selection.topic),
      eq(questions.status, 'approved'),
      eq(questions.isActive, true)
    ];
    
    // Add subtopic filter if not 'all'
    if (selection.subtopics !== 'all') {
      whereConditions.push(inArray(questions.subTopic, selection.subtopics));
    }
    
    // Query database for available questions
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const availableQuestions = await db.select({
      id: questions.id,
      difficulty: questions.difficulty,
      questionText: questions.questionText
    })
    .from(questions)
    .where(and(...whereConditions));
    
    // Count by difficulty
    const byDifficulty = {
      easy: availableQuestions.filter(q => q.difficulty === 'easy').length,
      medium: availableQuestions.filter(q => q.difficulty === 'medium').length,
      hard: availableQuestions.filter(q => q.difficulty === 'hard').length
    };
    
    results.push({
      selection,
      totalAvailable: availableQuestions.length,
      byDifficulty
    });
  }
  
  return results;
}

// ============================================
// STEP 2: SUGGEST OPTIMAL QUESTION COUNT
// ============================================

/**
 * Suggest optimal question count based on number of topics
 */
export function suggestQuestionCount(
  available: AvailableQuestions[]
): QuestionCountSuggestion {
  const topicCount = available.length;
  const totalAvailable = available.reduce((sum, a) => sum + a.totalAvailable, 0);
  
  // Base recommendation on topic count
  let recommended: number;
  if (topicCount === 1) {
    recommended = 25;
  } else if (topicCount <= 3) {
    recommended = 30;
  } else if (topicCount <= 5) {
    recommended = 50;
  } else if (topicCount <= 7) {
    recommended = 75;
  } else {
    recommended = 100;
  }
  
  // Minimum: 3 questions per topic (or available if less)
  const minimum = Math.min(
    topicCount * MIN_QUESTIONS_PER_TOPIC,
    totalAvailable
  );
  
  // Maximum: total available or 200 (whichever is lower)
  const maximum = Math.min(totalAvailable, MAX_TOTAL_QUESTIONS);
  
  // Adjust recommended if outside bounds
  recommended = Math.max(minimum, Math.min(recommended, maximum));
  
  // Generate reasoning
  let reasoning = `Based on ${topicCount} topic${topicCount > 1 ? 's' : ''} selected, `;
  reasoning += `we recommend ${recommended} questions for comprehensive coverage. `;
  
  if (recommended >= topicCount * MIN_QUESTIONS_PER_TOPIC) {
    reasoning += `This ensures at least ${Math.floor(recommended / topicCount)} questions per topic.`;
  } else {
    reasoning += `Note: Limited questions available in selected topics.`;
  }
  
  // Estimate duration (assume 60 seconds per question)
  const estimatedDuration = recommended;
  
  return {
    recommended,
    minimum,
    maximum,
    reasoning,
    estimatedDuration
  };
}

// ============================================
// STEP 3: CALCULATE DISTRIBUTION
// ============================================

function getDifficultyWeights(focusArea: 'strengthen' | 'balanced' | 'improve') {
  switch (focusArea) {
    case 'strengthen':
      return { easy: 0.6, medium: 0.3, hard: 0.1 };
    case 'balanced':
      return { easy: 0.33, medium: 0.34, hard: 0.33 };
    case 'improve':
      return { easy: 0.1, medium: 0.3, hard: 0.6 };
  }
}

function calculateDifficultyDistribution(
  totalAllocated: number,
  available: { easy: number; medium: number; hard: number },
  weights: { easy: number; medium: number; hard: number }
): { easy: number; medium: number; hard: number } {
  // Calculate ideal distribution
  let easy = Math.round(totalAllocated * weights.easy);
  let medium = Math.round(totalAllocated * weights.medium);
  let hard = Math.round(totalAllocated * weights.hard);
  
  // Adjust for availability constraints
  easy = Math.min(easy, available.easy);
  medium = Math.min(medium, available.medium);
  hard = Math.min(hard, available.hard);
  
  // Adjust for rounding errors
  let current = easy + medium + hard;
  let diff = totalAllocated - current;
  
  // Distribute remaining questions to available difficulties
  while (diff > 0) {
    if (easy < available.easy) { easy++; diff--; }
    else if (medium < available.medium) { medium++; diff--; }
    else if (hard < available.hard) { hard++; diff--; }
    else break; // Can't allocate more
  }
  
  // If we still can't meet total, reduce from largest
  while (diff < 0) {
    if (easy > 0 && easy >= medium && easy >= hard) { easy--; diff++; }
    else if (medium > 0 && medium >= hard) { medium--; diff++; }
    else if (hard > 0) { hard--; diff++; }
    else break;
  }
  
  return { easy, medium, hard };
}

/**
 * Calculate proportional distribution of questions across topics
 * WITH GRACEFUL DEGRADATION - continues even if some topics have insufficient questions
 */
export function calculateDistribution(
  available: AvailableQuestions[],
  totalQuestions: number,
  focusArea: 'strengthen' | 'balanced' | 'improve'
): { distribution: QuestionDistribution[]; shortfalls: ShortfallLog[] } {
  const shortfalls: ShortfallLog[] = [];
  
  // Step 1: Calculate total available across all topics
  const totalAvailable = available.reduce((sum, a) => sum + a.totalAvailable, 0);
  
  // Step 2: Initial proportional allocation
  let distribution = available.map(a => {
    const proportion = a.totalAvailable / totalAvailable;
    const allocated = Math.round(totalQuestions * proportion);
    
    return {
      selection: a.selection,
      allocated,
      percentage: proportion * 100,
      available: a.totalAvailable,
      byDifficultyAvailable: a.byDifficulty
    };
  });
  
  // Step 3: Apply minimum guarantee (3 questions per topic)
  // BUT if topic has < 3 questions, use what's available (graceful degradation)
  distribution = distribution.map(d => {
    if (d.allocated < MIN_QUESTIONS_PER_TOPIC && d.available >= MIN_QUESTIONS_PER_TOPIC) {
      return { ...d, allocated: MIN_QUESTIONS_PER_TOPIC };
    } else if (d.available < MIN_QUESTIONS_PER_TOPIC && d.available > 0) {
      // Graceful degradation: use what's available
      const shortfall = MIN_QUESTIONS_PER_TOPIC - d.available;
      shortfalls.push({
        subject: d.selection.subject,
        topic: d.selection.topic,
        subtopic: d.selection.subtopics === 'all' ? undefined : d.selection.subtopics.join(', '),
        requestedCount: MIN_QUESTIONS_PER_TOPIC,
        availableCount: d.available,
        shortfall
      });
      return { ...d, allocated: d.available };
    }
    return d;
  });
  
  // Step 4: Adjust for rounding errors
  let currentTotal = distribution.reduce((sum, d) => sum + d.allocated, 0);
  let difference = totalQuestions - currentTotal;
  
  while (difference !== 0) {
    if (difference > 0) {
      // Need to add questions - give to largest allocation that has capacity
      const largest = distribution
        .filter(d => d.allocated < d.available)
        .reduce((max, d) => d.allocated > max.allocated ? d : max, distribution[0]);
      
      if (largest && largest.allocated < largest.available) {
        largest.allocated++;
        difference--;
      } else {
        // Can't add more - log shortfall
        shortfalls.push({
          subject: 'Multiple',
          topic: 'Multiple',
          requestedCount: totalQuestions,
          availableCount: currentTotal,
          shortfall: difference
        });
        break;
      }
    } else {
      // Need to remove questions - take from largest allocation (above minimum or available)
      const largest = distribution
        .filter(d => d.allocated > Math.min(MIN_QUESTIONS_PER_TOPIC, d.available))
        .reduce((max, d) => d.allocated > max.allocated ? d : max, distribution[0]);
      
      if (largest && largest.allocated > Math.min(MIN_QUESTIONS_PER_TOPIC, largest.available)) {
        largest.allocated--;
        difference++;
      } else {
        break; // Can't reduce further
      }
    }
  }
  
  // Step 5: Calculate difficulty distribution for each topic
  const difficultyWeights = getDifficultyWeights(focusArea);
  
  const finalDistribution = distribution.map(d => {
    const byDifficulty = calculateDifficultyDistribution(
      d.allocated,
      d.byDifficultyAvailable,
      difficultyWeights
    );
    
    // Check if difficulty distribution has shortfalls
    const diffShortfall = d.allocated - (byDifficulty.easy + byDifficulty.medium + byDifficulty.hard);
    if (diffShortfall > 0) {
      shortfalls.push({
        subject: d.selection.subject,
        topic: d.selection.topic,
        subtopic: d.selection.subtopics === 'all' ? undefined : d.selection.subtopics.join(', '),
        requestedCount: d.allocated,
        availableCount: byDifficulty.easy + byDifficulty.medium + byDifficulty.hard,
        shortfall: diffShortfall,
        difficulty: focusArea
      });
    }
    
    return {
      selection: d.selection,
      allocated: d.allocated,
      percentage: (d.allocated / totalQuestions) * 100,
      byDifficulty,
      availableByDifficulty: d.byDifficultyAvailable
    };
  });
  
  return { distribution: finalDistribution, shortfalls };
}

// ============================================
// STEP 4: SELECT QUESTIONS WITH ADAPTIVE MIXING
// ============================================

function randomSelect<T>(array: T[], count: number): T[] {
  if (count >= array.length) return [...array];
  
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function weightedRandomSelect<T>(items: T[], weights: number[]): T {
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return items[i];
    }
  }
  
  return items[items.length - 1];
}

/**
 * Adaptive Mixing Algorithm
 * Ensures questions from different topics are interleaved, not sequential
 * 
 * Strategy:
 * 1. Create "buckets" for each topic
 * 2. Distribute questions round-robin across topics
 * 3. Add randomness to avoid predictable patterns
 * 4. Ensure no topic has more than MAX_CONSECUTIVE_SAME_TOPIC consecutive questions
 */
function adaptiveMixing(
  questions: SelectedQuestion[],
  topicCount: number
): SelectedQuestion[] {
  // Group questions by topic
  const byTopic: SelectedQuestion[][] = Array.from(
    { length: topicCount },
    () => []
  );
  
  questions.forEach(q => {
    byTopic[q.topicIndex].push(q);
  });
  
  // Shuffle within each topic to randomize order
  byTopic.forEach(bucket => {
    bucket.sort(() => Math.random() - 0.5);
  });
  
  const mixed: SelectedQuestion[] = [];
  let lastTopicIndex = -1;
  let consecutiveCount = 0;
  
  // Round-robin with adaptive selection
  while (mixed.length < questions.length) {
    // Find topics that still have questions
    const availableTopics = byTopic
      .map((bucket, index) => ({ index, count: bucket.length }))
      .filter(t => t.count > 0);
    
    if (availableTopics.length === 0) break;
    
    // Select next topic
    let nextTopicIndex: number;
    
    if (consecutiveCount >= MAX_CONSECUTIVE_SAME_TOPIC) {
      // Force switch to different topic
      const otherTopics = availableTopics.filter(t => t.index !== lastTopicIndex);
      if (otherTopics.length > 0) {
        nextTopicIndex = otherTopics[Math.floor(Math.random() * otherTopics.length)].index;
      } else {
        // No other topics available, continue with same
        nextTopicIndex = availableTopics[0].index;
      }
    } else if (availableTopics.length === 1) {
      // Only one topic left
      nextTopicIndex = availableTopics[0].index;
    } else {
      // Weighted random selection (prefer topics with more questions left)
      const totalRemaining = availableTopics.reduce((sum, t) => sum + t.count, 0);
      const weights = availableTopics.map(t => t.count / totalRemaining);
      nextTopicIndex = weightedRandomSelect(availableTopics, weights).index;
    }
    
    // Take next question from selected topic
    const question = byTopic[nextTopicIndex].shift()!;
    question.orderIndex = mixed.length;
    mixed.push(question);
    
    // Update consecutive tracking
    if (nextTopicIndex === lastTopicIndex) {
      consecutiveCount++;
    } else {
      consecutiveCount = 1;
      lastTopicIndex = nextTopicIndex;
    }
  }
  
  return mixed;
}

/**
 * Select specific questions based on distribution
 * WITH STRICT DEDUPLICATION - no question appears twice
 */
export async function selectQuestions(
  distribution: QuestionDistribution[]
): Promise<SelectedQuestion[]> {
  const allSelected: SelectedQuestion[] = [];
  const seenQuestionTexts = new Set<string>(); // For deduplication
  const seenQuestionIds = new Set<number>(); // For deduplication
  
  // Step 1: Select questions for each topic
  for (let topicIndex = 0; topicIndex < distribution.length; topicIndex++) {
    const dist = distribution[topicIndex];
    
    // Build where conditions
    const whereConditions = [
      eq(questions.subject, dist.selection.subject),
      eq(questions.topic, dist.selection.topic),
      eq(questions.status, 'approved'),
      eq(questions.isActive, true)
    ];
    
    // Add subtopic filter if not 'all'
    if (dist.selection.subtopics !== 'all') {
      whereConditions.push(inArray(questions.subTopic, dist.selection.subtopics));
    }
    
    // Get available questions for this topic
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const availableQuestions = await db.select({
      id: questions.id,
      difficulty: questions.difficulty,
      questionText: questions.questionText
    })
    .from(questions)
    .where(and(...whereConditions));
    
    // Group by difficulty
    const byDifficulty = {
      easy: availableQuestions.filter(q => q.difficulty === 'easy'),
      medium: availableQuestions.filter(q => q.difficulty === 'medium'),
      hard: availableQuestions.filter(q => q.difficulty === 'hard')
    };
    
    // Randomly select from each difficulty
    const selectedEasy = randomSelect(byDifficulty.easy, dist.byDifficulty.easy);
    const selectedMedium = randomSelect(byDifficulty.medium, dist.byDifficulty.medium);
    const selectedHard = randomSelect(byDifficulty.hard, dist.byDifficulty.hard);
    
    // Add to collection with deduplication
    [...selectedEasy, ...selectedMedium, ...selectedHard].forEach(q => {
      const normalizedText = q.questionText.trim().toLowerCase();
      
      // Check for duplicates
      if (!seenQuestionIds.has(q.id) && !seenQuestionTexts.has(normalizedText)) {
        seenQuestionIds.add(q.id);
        seenQuestionTexts.add(normalizedText);
        
        allSelected.push({
          questionId: q.id,
          topicIndex,
          difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
          orderIndex: 0, // Will be set in next step
          questionText: q.questionText
        });
      }
      // If duplicate, silently skip (graceful degradation)
    });
  }
  
  // Step 2: Mix questions adaptively (not sequential by topic)
  const mixed = adaptiveMixing(allSelected, distribution.length);
  
  return mixed;
}

// ============================================
// STEP 5: LOG SHORTFALLS
// ============================================

/**
 * Log question bank shortfalls for QB admin review
 * Silent operation - does not throw errors
 */
export async function logShortfalls(
  challengeId: number | null,
  shortfalls: ShortfallLog[]
): Promise<void> {
  if (shortfalls.length === 0) return;
  
  try {
    const db = await getDb();
    if (!db) {
      console.error('[QB Monitoring] Database not available');
      return;
    }
    
    for (const shortfall of shortfalls) {
      await db.insert(questionBankShortfalls).values({
        challengeId,
        subject: shortfall.subject,
        topic: shortfall.topic,
        subtopic: shortfall.subtopic,
        requestedCount: shortfall.requestedCount,
        availableCount: shortfall.availableCount,
        shortfall: shortfall.shortfall,
        difficulty: shortfall.difficulty,
        resolved: false
      });
    }
    
    console.log(`[QB Monitoring] Logged ${shortfalls.length} shortfall(s) for challenge ${challengeId}`);
  } catch (error) {
    // Silent failure - don't block challenge creation
    console.error('[QB Monitoring] Failed to log shortfalls:', error);
  }
}

// ============================================
// STEP 6: ADJUST DISTRIBUTION (FOR PARENT MODIFICATIONS)
// ============================================

/**
 * Adjust distribution when parent changes total question count
 * Maintains proportions while respecting minimums
 */
export function adjustDistribution(
  currentDistribution: QuestionDistribution[],
  newTotal: number,
  focusArea: 'strengthen' | 'balanced' | 'improve'
): { distribution: QuestionDistribution[]; shortfalls: ShortfallLog[] } {
  const shortfalls: ShortfallLog[] = [];
  
  // Recalculate with new total, maintaining proportions
  const currentTotal = currentDistribution.reduce((sum, d) => sum + d.allocated, 0);
  
  if (newTotal === currentTotal) {
    return { distribution: currentDistribution, shortfalls }; // No change needed
  }
  
  // Calculate new allocations proportionally
  let newDistribution = currentDistribution.map(d => {
    const proportion = d.allocated / currentTotal;
    const newAllocated = Math.round(newTotal * proportion);
    
    return {
      ...d,
      allocated: newAllocated
    };
  });
  
  // Apply minimum guarantee with graceful degradation
  newDistribution = newDistribution.map(d => {
    const availableTotal = d.availableByDifficulty.easy + 
                          d.availableByDifficulty.medium + 
                          d.availableByDifficulty.hard;
    
    if (d.allocated < MIN_QUESTIONS_PER_TOPIC && availableTotal >= MIN_QUESTIONS_PER_TOPIC) {
      return { ...d, allocated: MIN_QUESTIONS_PER_TOPIC };
    } else if (availableTotal < MIN_QUESTIONS_PER_TOPIC && availableTotal > 0) {
      // Graceful degradation
      shortfalls.push({
        subject: d.selection.subject,
        topic: d.selection.topic,
        subtopic: d.selection.subtopics === 'all' ? undefined : d.selection.subtopics.join(', '),
        requestedCount: MIN_QUESTIONS_PER_TOPIC,
        availableCount: availableTotal,
        shortfall: MIN_QUESTIONS_PER_TOPIC - availableTotal
      });
      return { ...d, allocated: availableTotal };
    }
    return d;
  });
  
  // Adjust for rounding errors
  let currentSum = newDistribution.reduce((sum, d) => sum + d.allocated, 0);
  let diff = newTotal - currentSum;
  
  while (diff !== 0) {
    if (diff > 0) {
      const largest = newDistribution.reduce((max, d) => 
        d.allocated > max.allocated ? d : max
      );
      largest.allocated++;
      diff--;
    } else {
      const largest = newDistribution
        .filter(d => {
          const availableTotal = d.availableByDifficulty.easy + 
                                d.availableByDifficulty.medium + 
                                d.availableByDifficulty.hard;
          return d.allocated > Math.min(MIN_QUESTIONS_PER_TOPIC, availableTotal);
        })
        .reduce((max, d) => d.allocated > max.allocated ? d : max, newDistribution[0]);
      
      if (largest) {
        largest.allocated--;
        diff++;
      } else {
        break;
      }
    }
  }
  
  // Recalculate difficulty distribution
  const difficultyWeights = getDifficultyWeights(focusArea);
  
  const finalDistribution = newDistribution.map(d => {
    const byDifficulty = calculateDifficultyDistribution(
      d.allocated,
      d.availableByDifficulty,
      difficultyWeights
    );
    
    return {
      ...d,
      percentage: (d.allocated / newTotal) * 100,
      byDifficulty
    };
  });
  
  return { distribution: finalDistribution, shortfalls };
}
