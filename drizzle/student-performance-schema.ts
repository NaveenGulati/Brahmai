import { int, mysqlEnum, mysqlTable, decimal, varchar, timestamp } from "drizzle-orm/mysql-core";

/**
 * ============================================
 * STUDENT PERFORMANCE TRACKING
 * ============================================
 * Tracks student performance per topic to enable adaptive challenge creation
 * Updated after each quiz completion (rolling window of last 5 quizzes)
 */

export const studentTopicPerformance = mysqlTable("studentTopicPerformance", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(), // FK to childProfiles
  subject: varchar("subject", { length: 100 }).notNull(),
  topic: varchar("topic", { length: 200 }).notNull(),
  
  // Performance metrics (calculated from last 5 quizzes on this topic)
  totalAttempts: int("totalAttempts").default(0).notNull(), // Number of quizzes taken
  totalQuestions: int("totalQuestions").default(0).notNull(), // Total questions answered
  correctAnswers: int("correctAnswers").default(0).notNull(), // Total correct answers
  accuracyPercent: decimal("accuracyPercent", { precision: 5, scale: 2 }), // Overall accuracy %
  avgTimePerQuestion: int("avgTimePerQuestion"), // Average time in seconds
  
  // Difficulty-wise breakdown
  easyCorrect: int("easyCorrect").default(0),
  easyTotal: int("easyTotal").default(0),
  mediumCorrect: int("mediumCorrect").default(0),
  mediumTotal: int("mediumTotal").default(0),
  hardCorrect: int("hardCorrect").default(0),
  hardTotal: int("hardTotal").default(0),
  
  // Classification (auto-calculated)
  performanceLevel: mysqlEnum("performanceLevel", ["weak", "neutral", "strong"]).notNull(),
  confidenceScore: decimal("confidenceScore", { precision: 5, scale: 2 }), // 0-100, based on consistency
  
  // Metadata
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StudentTopicPerformance = typeof studentTopicPerformance.$inferSelect;
export type InsertStudentTopicPerformance = typeof studentTopicPerformance.$inferInsert;

