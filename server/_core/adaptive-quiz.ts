import { invokeLLM } from './llm';
import * as db from '../db';

interface QuizHistory {
  moduleId: number;
  avgScore: number;
  totalQuizzes: number;
  recentTrend: 'improving' | 'declining' | 'stable';
  lastScore: number;
}

interface CurrentPerformance {
  questionsAnswered: number;
  correctAnswers: number;
  currentDifficulty: string;
  timePerQuestion: number;
}

/**
 * AI-powered adaptive quiz system that analyzes historical performance
 * and current quiz progress to select optimal next question difficulty
 */
export async function getNextQuestionDifficulty(
  userId: number,
  moduleId: number,
  currentPerformance: CurrentPerformance
): Promise<{ difficulty: 'easy' | 'medium' | 'hard'; reasoning: string }> {
  try {
    // Fetch historical performance
    const history = await getHistoricalPerformance(userId, moduleId);
    
    // Use AI to analyze and decide
    const aiDecision = await analyzeWithAI(history, currentPerformance);
    
    return aiDecision;
  } catch (error) {
    console.error('AI analysis failed, using fallback:', error);
    // Fallback to rule-based logic
    return fallbackLogic(currentPerformance);
  }
}

async function getHistoricalPerformance(userId: number, moduleId: number): Promise<QuizHistory> {
  // Get past quiz sessions for this user and module
  const allSessions = await db.getUserQuizHistory(userId, 10);
  const sessions = allSessions.filter((s: any) => s.moduleId === moduleId && s.isCompleted);

  if (sessions.length === 0) {
    return { moduleId, avgScore: 50, totalQuizzes: 0, recentTrend: 'stable', lastScore: 50 };
  }

  const avgScore = sessions.reduce((sum: number, s: any) => sum + (s.scorePercentage || 0), 0) / sessions.length;
  const lastScore = sessions[0].scorePercentage || 50;
  
  // Determine trend
  let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (sessions.length >= 3) {
    const recent = sessions.slice(0, 3).reduce((sum: number, s: any) => sum + (s.scorePercentage || 0), 0) / 3;
    const older = sessions.slice(3, 6).reduce((sum: number, s: any) => sum + (s.scorePercentage || 0), 0) / Math.min(3, sessions.length - 3);
    
    if (recent > older + 10) recentTrend = 'improving';
    else if (recent < older - 10) recentTrend = 'declining';
  }

  return {
    moduleId,
    avgScore: Math.round(avgScore),
    totalQuizzes: sessions.length,
    recentTrend,
    lastScore
  };
}

async function analyzeWithAI(
  history: QuizHistory,
  current: CurrentPerformance
): Promise<{ difficulty: 'easy' | 'medium' | 'hard'; reasoning: string }> {
  
  const prompt = `You are an adaptive learning AI that selects optimal question difficulty for students.

**Student's Historical Performance:**
- Total quizzes taken on this topic: ${history.totalQuizzes}
- Average score: ${history.avgScore}%
- Last quiz score: ${history.lastScore}%
- Performance trend: ${history.recentTrend}

**Current Quiz Progress:**
- Questions answered: ${current.questionsAnswered}
- Correct answers: ${current.correctAnswers}
- Current accuracy: ${current.questionsAnswered > 0 ? Math.round((current.correctAnswers / current.questionsAnswered) * 100) : 0}%
- Current difficulty level: ${current.currentDifficulty}
- Average time per question: ${current.timePerQuestion}s

**Your Task:**
Select the optimal difficulty level (easy, medium, or hard) for the NEXT question to:
1. Build confidence if student is struggling
2. Challenge if student is excelling
3. Maintain engagement and learning momentum
4. Strengthen skills progressively

**Decision Rules:**
- If historical performance is weak (<50%) → Start easier, build foundation
- If historical performance is strong (>80%) → Challenge with harder questions
- If currently struggling in this quiz → Reduce difficulty temporarily
- If currently excelling → Increase difficulty to maintain challenge
- If improving trend → Gradually increase difficulty
- If declining trend → Provide easier questions to rebuild confidence

Respond with ONLY a JSON object:
{
  "difficulty": "easy" | "medium" | "hard",
  "reasoning": "Brief explanation (max 20 words)"
}`;

  const response = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are an adaptive learning expert. Return only valid JSON.' },
      { role: 'user', content: prompt }
    ]
  });

  const messageContent = response.choices[0]?.message?.content;
  const content = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
  
  try {
    const decision = JSON.parse(content);
    if (['easy', 'medium', 'hard'].includes(decision.difficulty)) {
      return decision;
    }
  } catch (e) {
    console.warn('AI response not valid JSON:', content);
  }

  // Fallback if AI response is invalid
  return fallbackLogic(current);
}

function fallbackLogic(current: CurrentPerformance): { difficulty: 'easy' | 'medium' | 'hard'; reasoning: string } {
  if (current.questionsAnswered === 0) {
    return { difficulty: 'medium', reasoning: 'Starting with medium difficulty' };
  }

  const accuracy = current.correctAnswers / current.questionsAnswered;

  if (accuracy >= 0.8) {
    return { difficulty: 'hard', reasoning: 'High accuracy, increasing challenge' };
  } else if (accuracy >= 0.5) {
    return { difficulty: 'medium', reasoning: 'Moderate accuracy, maintaining level' };
  } else {
    return { difficulty: 'easy', reasoning: 'Low accuracy, reducing difficulty' };
  }
}

