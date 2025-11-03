/**
 * ============================================
 * PERFORMANCE ANALYZER
 * ============================================
 * Analyzes student quiz performance and updates topic-level statistics
 * Used for adaptive challenge creation
 * 
 * This module is called after each quiz completion to:
 * 1. Calculate performance metrics per topic
 * 2. Update rolling window (last 5 quizzes)
 * 3. Classify topics as weak/neutral/strong
 * 4. Store in studentTopicPerformance table
 */

import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './db';
import { studentTopicPerformance, quizSessions, quizResponses, questions } from '../drizzle/schema';

interface QuizPerformanceData {
  sessionId: number;
  childId: number;
  subject: string;
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  avgTimePerQuestion: number;
  easyCorrect: number;
  easyTotal: number;
  mediumCorrect: number;
  mediumTotal: number;
  hardCorrect: number;
  hardTotal: number;
}

/**
 * Main function: Analyze quiz and update performance tracking
 * Called after quiz completion
 */
export async function analyzeQuizPerformance(sessionId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn('[Performance Analyzer] Database not available');
    return;
  }

  try {
    // 1. Get quiz session details
    const session = await db
      .select()
      .from(quizSessions)
      .where(eq(quizSessions.id, sessionId))
      .limit(1);

    if (!session || session.length === 0) {
      console.warn(`[Performance Analyzer] Quiz session ${sessionId} not found`);
      return;
    }

    const quiz = session[0];
    if (!quiz.childId) {
      console.warn(`[Performance Analyzer] No childId for session ${sessionId}`);
      return;
    }

    // 2. Get all responses for this quiz with question details
    const responses = await db
      .select({
        questionId: quizResponses.questionId,
        isCorrect: quizResponses.isCorrect,
        timeTaken: quizResponses.timeTaken,
        difficulty: questions.difficulty,
        topic: questions.topic,
        subject: questions.subject,
      })
      .from(quizResponses)
      .leftJoin(questions, eq(quizResponses.questionId, questions.id))
      .where(eq(quizResponses.sessionId, sessionId));

    if (responses.length === 0) {
      console.warn(`[Performance Analyzer] No responses found for session ${sessionId}`);
      return;
    }

    // 3. Group responses by topic
    const topicData = new Map<string, QuizPerformanceData>();

    for (const response of responses) {
      if (!response.topic || !response.subject) continue;

      const key = `${response.subject}::${response.topic}`;
      
      if (!topicData.has(key)) {
        topicData.set(key, {
          sessionId,
          childId: quiz.childId,
          subject: response.subject,
          topic: response.topic,
          totalQuestions: 0,
          correctAnswers: 0,
          avgTimePerQuestion: 0,
          easyCorrect: 0,
          easyTotal: 0,
          mediumCorrect: 0,
          mediumTotal: 0,
          hardCorrect: 0,
          hardTotal: 0,
        });
      }

      const data = topicData.get(key)!;
      data.totalQuestions++;
      if (response.isCorrect) data.correctAnswers++;
      data.avgTimePerQuestion += response.timeTaken || 0;

      // Track by difficulty
      if (response.difficulty === 'easy') {
        data.easyTotal++;
        if (response.isCorrect) data.easyCorrect++;
      } else if (response.difficulty === 'medium') {
        data.mediumTotal++;
        if (response.isCorrect) data.mediumCorrect++;
      } else if (response.difficulty === 'hard') {
        data.hardTotal++;
        if (response.isCorrect) data.hardCorrect++;
      }
    }

    // 4. Update performance tracking for each topic
    for (const [_, data] of topicData) {
      data.avgTimePerQuestion = Math.round(data.avgTimePerQuestion / data.totalQuestions);
      await updateTopicPerformance(data);
    }

    console.log(`[Performance Analyzer] Updated performance for ${topicData.size} topics from session ${sessionId}`);
  } catch (error) {
    console.error('[Performance Analyzer] Error analyzing quiz:', error);
  }
}

/**
 * Update or create performance record for a topic
 * Maintains rolling window of last 5 quizzes
 */
async function updateTopicPerformance(data: QuizPerformanceData): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Get existing performance record
    const existing = await db
      .select()
      .from(studentTopicPerformance)
      .where(
        and(
          eq(studentTopicPerformance.childId, data.childId),
          eq(studentTopicPerformance.subject, data.subject),
          eq(studentTopicPerformance.topic, data.topic)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      // Create new record
      const accuracyPercent = (data.correctAnswers / data.totalQuestions) * 100;
      const performanceLevel = classifyPerformance(accuracyPercent);

      await db.insert(studentTopicPerformance).values({
        childId: data.childId,
        subject: data.subject,
        topic: data.topic,
        totalAttempts: 1,
        totalQuestions: data.totalQuestions,
        correctAnswers: data.correctAnswers,
        accuracyPercent: accuracyPercent.toFixed(2),
        avgTimePerQuestion: data.avgTimePerQuestion,
        easyCorrect: data.easyCorrect,
        easyTotal: data.easyTotal,
        mediumCorrect: data.mediumCorrect,
        mediumTotal: data.mediumTotal,
        hardCorrect: data.hardCorrect,
        hardTotal: data.hardTotal,
        performanceLevel,
        confidenceScore: calculateConfidence(1, accuracyPercent),
      });
    } else {
      // Update existing record with rolling window logic
      const record = existing[0];
      
      // If we have 5+ attempts, use weighted average (recent quizzes matter more)
      const newAttempts = record.totalAttempts + 1;
      const weight = newAttempts > 5 ? 0.3 : 1 / newAttempts; // Recent quiz gets 30% weight if 5+ attempts
      
      const newTotalQuestions = record.totalQuestions + data.totalQuestions;
      const newCorrectAnswers = record.correctAnswers + data.correctAnswers;
      const newAccuracy = (newCorrectAnswers / newTotalQuestions) * 100;
      
      // Weighted average for time
      const newAvgTime = Math.round(
        record.avgTimePerQuestion * (1 - weight) + data.avgTimePerQuestion * weight
      );

      // Update difficulty breakdowns
      const newEasyCorrect = record.easyCorrect + data.easyCorrect;
      const newEasyTotal = record.easyTotal + data.easyTotal;
      const newMediumCorrect = record.mediumCorrect + data.mediumCorrect;
      const newMediumTotal = record.mediumTotal + data.mediumTotal;
      const newHardCorrect = record.hardCorrect + data.hardCorrect;
      const newHardTotal = record.hardTotal + data.hardTotal;

      const performanceLevel = classifyPerformance(newAccuracy);
      const confidenceScore = calculateConfidence(newAttempts, newAccuracy);

      await db
        .update(studentTopicPerformance)
        .set({
          totalAttempts: newAttempts,
          totalQuestions: newTotalQuestions,
          correctAnswers: newCorrectAnswers,
          accuracyPercent: newAccuracy.toFixed(2),
          avgTimePerQuestion: newAvgTime,
          easyCorrect: newEasyCorrect,
          easyTotal: newEasyTotal,
          mediumCorrect: newMediumCorrect,
          mediumTotal: newMediumTotal,
          hardCorrect: newHardCorrect,
          hardTotal: newHardTotal,
          performanceLevel,
          confidenceScore: confidenceScore.toFixed(2),
        })
        .where(eq(studentTopicPerformance.id, record.id));
    }
  } catch (error) {
    console.error('[Performance Analyzer] Error updating topic performance:', error);
  }
}

/**
 * Classify performance level based on accuracy
 */
function classifyPerformance(accuracyPercent: number): 'weak' | 'neutral' | 'strong' {
  if (accuracyPercent < 60) return 'weak';
  if (accuracyPercent >= 75) return 'strong';
  return 'neutral';
}

/**
 * Calculate confidence score (0-100)
 * Higher confidence = more attempts with consistent performance
 */
function calculateConfidence(attempts: number, accuracy: number): number {
  // Base confidence on number of attempts (max 5)
  const attemptFactor = Math.min(attempts / 5, 1) * 50;
  
  // Add accuracy factor (consistent high or low performance = higher confidence)
  const accuracyFactor = accuracy > 75 || accuracy < 40 ? 50 : 25;
  
  return attemptFactor + accuracyFactor;
}

/**
 * Get student's performance summary for a subject
 * Used by challenge creator to show strengths/weaknesses
 */
export async function getStudentPerformanceSummary(
  childId: number,
  subject: string
): Promise<{
  strong: Array<{ topic: string; accuracy: number }>;
  weak: Array<{ topic: string; accuracy: number }>;
  neutral: Array<{ topic: string; accuracy: number }>;
}> {
  const db = await getDb();
  if (!db) {
    return { strong: [], weak: [], neutral: [] };
  }

  try {
    const performance = await db
      .select()
      .from(studentTopicPerformance)
      .where(
        and(
          eq(studentTopicPerformance.childId, childId),
          eq(studentTopicPerformance.subject, subject)
        )
      )
      .orderBy(desc(studentTopicPerformance.accuracyPercent));

    const strong = performance
      .filter(p => p.performanceLevel === 'strong')
      .map(p => ({ topic: p.topic, accuracy: parseFloat(p.accuracyPercent || '0') }));

    const weak = performance
      .filter(p => p.performanceLevel === 'weak')
      .map(p => ({ topic: p.topic, accuracy: parseFloat(p.accuracyPercent || '0') }));

    const neutral = performance
      .filter(p => p.performanceLevel === 'neutral')
      .map(p => ({ topic: p.topic, accuracy: parseFloat(p.accuracyPercent || '0') }));

    return { strong, weak, neutral };
  } catch (error) {
    console.error('[Performance Analyzer] Error getting performance summary:', error);
    return { strong: [], weak: [], neutral: [] };
  }
}

