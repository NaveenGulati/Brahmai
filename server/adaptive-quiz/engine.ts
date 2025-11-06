/**
 * Adaptive Quiz System - Helper Functions
 * Implements world-class adaptive quiz logic with Focus Areas
 */

import type { FocusArea, PerformanceMetrics, TopicPerformance, QuestionCandidate } from './types';

/**
 * ============================================
 * PERFORMANCE CALCULATION
 * ============================================
 */

/**
 * Calculate comprehensive performance metrics from quiz responses
 */
export function calculatePerformanceMetrics(
  responses: any[],
  questions: any[]
): PerformanceMetrics {
  if (responses.length === 0) {
    return {
      overallAccuracy: 0.5,
      recentAccuracy: 0.5,
      questionsAnswered: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      topicPerformance: {},
      difficultyPerformance: { easy: 0, medium: 0, hard: 0 },
      avgTimePerQuestion: 0,
      masteryScore: 0,
      lastDifficulty: 'medium',
      recentTopics: [],
    };
  }

  const questionsMap = new Map(questions.map(q => [q.id, q]));
  
  // Basic metrics
  const correctAnswers = responses.filter(r => r.isCorrect).length;
  const wrongAnswers = responses.length - correctAnswers;
  const overallAccuracy = correctAnswers / responses.length;
  
  // Recent performance (last 5 questions)
  const recentResponses = responses.slice(-5);
  const recentCorrect = recentResponses.filter(r => r.isCorrect).length;
  const recentAccuracy = recentResponses.length > 0 ? recentCorrect / recentResponses.length : 0.5;
  
  // Topic-based performance
  const topicPerformance: Record<string, TopicPerformance> = {};
  const recentTopics: string[] = [];
  
  responses.forEach((response, index) => {
    const question = questionsMap.get(response.questionId);
    if (!question) return;
    
    const topic = question.topic;
    
    // Track recent topics (last 3)
    if (index >= responses.length - 3) {
      recentTopics.push(topic);
    }
    
    if (!topicPerformance[topic]) {
      topicPerformance[topic] = {
        topic,
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        avgTime: 0,
        totalTime: 0,
      };
    }
    
    topicPerformance[topic].totalQuestions++;
    if (response.isCorrect) {
      topicPerformance[topic].correctAnswers++;
    }
    topicPerformance[topic].totalTime += response.timeTaken || 0;
  });
  
  // Calculate topic accuracy and avg time
  Object.values(topicPerformance).forEach(tp => {
    tp.accuracy = tp.correctAnswers / tp.totalQuestions;
    tp.avgTime = tp.totalTime / tp.totalQuestions;
  });
  
  // Difficulty-based performance
  const difficultyPerformance: Record<string, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  };
  
  ['easy', 'medium', 'hard'].forEach(difficulty => {
    const diffResponses = responses.filter(r => {
      const q = questionsMap.get(r.questionId);
      return q && q.difficulty === difficulty;
    });
    
    if (diffResponses.length > 0) {
      const correct = diffResponses.filter(r => r.isCorrect).length;
      difficultyPerformance[difficulty] = correct / diffResponses.length;
    }
  });
  
  // Time metrics
  const totalTime = responses.reduce((sum, r) => sum + (r.timeTaken || 0), 0);
  const avgTimePerQuestion = totalTime / responses.length;
  
  // Mastery score (0-100)
  const masteryScore = calculateMasteryScore({
    overallAccuracy,
    recentAccuracy,
    difficultyPerformance,
    avgTimePerQuestion,
  });
  
  // Last difficulty
  const lastResponse = responses[responses.length - 1];
  const lastQuestion = questionsMap.get(lastResponse.questionId);
  const lastDifficulty = lastQuestion?.difficulty || 'medium';
  
  return {
    overallAccuracy,
    recentAccuracy,
    questionsAnswered: responses.length,
    correctAnswers,
    wrongAnswers,
    topicPerformance,
    difficultyPerformance,
    avgTimePerQuestion,
    masteryScore,
    lastDifficulty,
    recentTopics,
  };
}

/**
 * Calculate mastery score (0-100) from multiple factors
 */
function calculateMasteryScore(data: {
  overallAccuracy: number;
  recentAccuracy: number;
  difficultyPerformance: Record<string, number>;
  avgTimePerQuestion: number;
}): number {
  // Weight: Accuracy 40%, Recent 30%, Consistency 20%, Efficiency 10%
  
  const accuracyScore = data.overallAccuracy * 40;
  const recentScore = data.recentAccuracy * 30;
  
  // Consistency: Low variance between recent and overall is good
  const consistency = 1 - Math.abs(data.overallAccuracy - data.recentAccuracy);
  const consistencyScore = consistency * 20;
  
  // Efficiency: Faster is better (assume 60s is baseline)
  const efficiency = Math.max(0, 1 - (data.avgTimePerQuestion / 60));
  const efficiencyScore = efficiency * 10;
  
  return Math.round(accuracyScore + recentScore + consistencyScore + efficiencyScore);
}

/**
 * ============================================
 * TOPIC SELECTION (Focus Area Logic)
 * ============================================
 */

/**
 * Select next topic based on focus area and performance
 */
export function selectTopic(
  focusArea: FocusArea,
  metrics: PerformanceMetrics,
  availableTopics: string[]
): string {
  
  if (focusArea === 'strengthen') {
    return selectStrongTopic(metrics, availableTopics);
  }
  
  if (focusArea === 'improve') {
    return selectWeakTopic(metrics, availableTopics);
  }
  
  // Balanced: Random with diversity
  return selectBalancedTopic(metrics, availableTopics);
}

/**
 * Select from strong topics (accuracy > 70%)
 */
function selectStrongTopic(
  metrics: PerformanceMetrics,
  availableTopics: string[]
): string {
  const strongTopics = Object.entries(metrics.topicPerformance)
    .filter(([topic, perf]) => perf.accuracy > 0.7 && availableTopics.includes(topic))
    .sort((a, b) => b[1].accuracy - a[1].accuracy) // Strongest first
    .map(([topic]) => topic);
  
  if (strongTopics.length > 0) {
    // Avoid recent topics for diversity
    const nonRecentStrong = strongTopics.filter(t => !metrics.recentTopics.includes(t));
    if (nonRecentStrong.length > 0) {
      return nonRecentStrong[0];
    }
    return strongTopics[0];
  }
  
  // No strong topics yet - pick random
  return availableTopics[Math.floor(Math.random() * availableTopics.length)];
}

/**
 * Select from weak topics (accuracy < 60%)
 */
function selectWeakTopic(
  metrics: PerformanceMetrics,
  availableTopics: string[]
): string {
  const weakTopics = Object.entries(metrics.topicPerformance)
    .filter(([topic, perf]) => perf.accuracy < 0.6 && availableTopics.includes(topic))
    .sort((a, b) => a[1].accuracy - b[1].accuracy) // Weakest first
    .map(([topic]) => topic);
  
  if (weakTopics.length > 0) {
    // Avoid recent topics for diversity
    const nonRecentWeak = weakTopics.filter(t => !metrics.recentTopics.includes(t));
    if (nonRecentWeak.length > 0) {
      return nonRecentWeak[0];
    }
    return weakTopics[0];
  }
  
  // No weak topics - pick medium performing
  const mediumTopics = Object.entries(metrics.topicPerformance)
    .filter(([topic, perf]) => perf.accuracy >= 0.6 && perf.accuracy <= 0.7 && availableTopics.includes(topic))
    .map(([topic]) => topic);
  
  if (mediumTopics.length > 0) {
    return mediumTopics[0];
  }
  
  // Fallback: random
  return availableTopics[Math.floor(Math.random() * availableTopics.length)];
}

/**
 * Select random topic with diversity
 */
function selectBalancedTopic(
  metrics: PerformanceMetrics,
  availableTopics: string[]
): string {
  // Avoid recent topics
  const nonRecentTopics = availableTopics.filter(t => !metrics.recentTopics.includes(t));
  
  if (nonRecentTopics.length > 0) {
    return nonRecentTopics[Math.floor(Math.random() * nonRecentTopics.length)];
  }
  
  // All topics are recent - pick any
  return availableTopics[Math.floor(Math.random() * availableTopics.length)];
}

/**
 * ============================================
 * DIFFICULTY SELECTION (Fully Adaptive)
 * ============================================
 */

/**
 * Determine optimal difficulty based on performance (NO BOUNDARIES!)
 */
export function determineOptimalDifficulty(
  metrics: PerformanceMetrics,
  targetTopic: string
): 'easy' | 'medium' | 'hard' {
  
  console.log(`[Difficulty] Target topic: ${targetTopic}`);
  console.log(`[Difficulty] Recent accuracy: ${metrics.recentAccuracy.toFixed(2)}, Overall: ${metrics.overallAccuracy.toFixed(2)}`);
  
  // First question - start with medium
  if (metrics.questionsAnswered === 0) {
    console.log(`[Difficulty] First question -> medium`);
    return 'medium';
  }
  
  const topicPerf = metrics.topicPerformance[targetTopic];
  const recentAccuracy = metrics.recentAccuracy;
  const overallAccuracy = metrics.overallAccuracy;
  
  console.log(`[Difficulty] Topic performance:`, topicPerf);
  
  // RULE 1: First question in this topic - start medium
  if (!topicPerf || topicPerf.totalQuestions === 0) {
    console.log(`[Difficulty] RULE 1: First question in topic -> medium`);
    return 'medium';
  }
  
  // RULE 2: Recent performance (last 5 questions across all topics)
  if (recentAccuracy < 0.4) {
    console.log(`[Difficulty] RULE 2: Recent accuracy < 0.4 -> easy`);
    return 'easy';
  }
  
  if (recentAccuracy > 0.9) {
    console.log(`[Difficulty] RULE 2: Recent accuracy > 0.9 -> hard`);
    return 'hard';
  }
  
  // RULE 3: Topic-specific performance
  const topicAccuracy = topicPerf.accuracy;
  console.log(`[Difficulty] Topic accuracy: ${topicAccuracy.toFixed(2)}`);
  
  if (topicAccuracy < 0.5) {
    console.log(`[Difficulty] RULE 3: Topic accuracy < 0.5 -> easy`);
    return 'easy';
  }
  
  if (topicAccuracy > 0.8) {
    console.log(`[Difficulty] RULE 3: Topic accuracy > 0.8 -> hard`);
    return 'hard';
  }
  
  // RULE 4: Difficulty progression (smooth curve)
  const currentDifficulty = metrics.lastDifficulty;
  const difficultyAccuracy = metrics.difficultyPerformance[currentDifficulty] || 0.5;
  
  if (difficultyAccuracy > 0.8) {
    // Mastered current difficulty - progress up
    return progressDifficulty(currentDifficulty, 'up');
  }
  
  if (difficultyAccuracy < 0.5) {
    // Struggling at current difficulty - step down
    return progressDifficulty(currentDifficulty, 'down');
  }
  
  // RULE 5: Zone of Proximal Development (60-80% sweet spot)
  if (recentAccuracy >= 0.6 && recentAccuracy <= 0.8) {
    // Perfect challenge level - maintain
    return currentDifficulty as 'easy' | 'medium' | 'hard';
  }
  
  // Default: medium
  console.log(`[Difficulty] DEFAULT: No rule matched -> medium`);
  return 'medium';
}

/**
 * Progress difficulty up or down
 */
function progressDifficulty(
  current: string,
  direction: 'up' | 'down'
): 'easy' | 'medium' | 'hard' {
  const order: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
  const index = order.indexOf(current as any);
  
  if (direction === 'up' && index < 2) {
    return order[index + 1];
  }
  if (direction === 'down' && index > 0) {
    return order[index - 1];
  }
  return current as 'easy' | 'medium' | 'hard';
}

/**
 * ============================================
 * QUESTION SELECTION (Quality Scoring)
 * ============================================
 */

/**
 * Score and select best question from candidates
 */
export function selectBestQuestion(
  candidates: any[],
  context: {
    recentTopics: string[];
    recentQuestionIds: number[];
    studentAvgTime: number;
  }
): any {
  
  const scoredQuestions: QuestionCandidate[] = candidates.map(question => ({
    question,
    score: scoreQuestion(question, context),
  }));
  
  // Sort by score (highest first)
  scoredQuestions.sort((a, b) => b.score - a.score);
  
  // Pick from top 3 candidates (add variety)
  const topCandidates = scoredQuestions.slice(0, Math.min(3, scoredQuestions.length));
  const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
  
  return selected.question;
}

/**
 * Score a question based on multiple quality factors
 */
function scoreQuestion(
  question: any,
  context: {
    recentTopics: string[];
    recentQuestionIds: number[];
    studentAvgTime: number;
  }
): number {
  let score = 100;
  
  // 1. Topic Diversity (30% weight)
  if (context.recentTopics.includes(question.topic)) {
    score -= 30; // Penalize repetition
  }
  
  // 2. Question Quality (25% weight)
  // Based on historical data
  const avgAccuracy = question.averageScore ? parseFloat(question.averageScore) / 100 : 0.5;
  if (avgAccuracy < 0.2 || avgAccuracy > 0.95) {
    score -= 25; // Too hard or too easy for everyone
  }
  
  // 3. Time Appropriateness (20% weight)
  if (question.timeLimit && context.studentAvgTime > 0) {
    if (question.timeLimit > context.studentAvgTime * 2) {
      score -= 20; // Too time-consuming
    }
  }
  
  // 4. Freshness (25% weight)
  if (context.recentQuestionIds.includes(question.id)) {
    score = 0; // Already answered - exclude completely
  }
  
  return score;
}
