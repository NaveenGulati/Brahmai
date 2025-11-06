/**
 * TypeScript types for Adaptive Quiz System
 */

export type FocusArea = 'strengthen' | 'improve' | 'balanced';

export interface TopicPerformance {
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  avgTime: number;
  totalTime: number;
}

export interface PerformanceMetrics {
  overallAccuracy: number;
  recentAccuracy: number;
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  topicPerformance: Record<string, TopicPerformance>;
  difficultyPerformance: Record<string, number>;
  avgTimePerQuestion: number;
  masteryScore: number;
  lastDifficulty: string;
  recentTopics: string[];
}

export interface QuestionCandidate {
  question: any;
  score: number;
}
