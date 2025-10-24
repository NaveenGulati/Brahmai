import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "parent", "child"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  // Additional fields for parent-child relationship
  parentId: int("parentId"), // If this is a child account, reference to parent
  username: varchar("username", { length: 50 }), // For local authentication
  passwordHash: varchar("passwordHash", { length: 255 }), // Hashed password for local auth
  grade: int("grade").default(7), // Grade level
  totalPoints: int("totalPoints").default(0), // Gamification points
  currentStreak: int("currentStreak").default(0), // Daily streak
  longestStreak: int("longestStreak").default(0), // Best streak
  lastActivityDate: timestamp("lastActivityDate"), // For streak tracking
});

/**
 * Subjects table - ICSE Grade 7 subjects
 */
export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(), // e.g., Mathematics, Science, English
  code: varchar("code", { length: 20 }).notNull().unique(), // e.g., MATH, SCI, ENG
  description: text("description"),
  icon: varchar("icon", { length: 100 }), // Icon name or emoji
  color: varchar("color", { length: 20 }), // Hex color for UI
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Modules/Topics within each subject
 */
export const modules = mysqlTable("modules", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull(),
  name: varchar("name", { length: 200 }).notNull(), // e.g., "Algebra - Linear Equations"
  description: text("description"),
  orderIndex: int("orderIndex").default(0), // For sorting
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Question bank - stores all questions
 */
export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  moduleId: int("moduleId").notNull(),
  questionType: mysqlEnum("questionType", [
    "mcq",           // Multiple choice
    "true_false",    // True/False
    "fill_blank",    // Fill in the blanks
    "match",         // Match the following
    "image_based"    // Image-based questions
  ]).notNull(),
  questionText: text("questionText").notNull(),
  questionImage: varchar("questionImage", { length: 500 }), // URL to image if any
  // Options stored as JSON for flexibility
  // MCQ: ["option1", "option2", "option3", "option4"]
  // Match: [{"left": "A", "right": "1"}, ...]
  // Fill blank: ["answer1", "answer2"] for multiple blanks
  options: json("options"),
  correctAnswer: text("correctAnswer").notNull(), // JSON string for complex answers
  explanation: text("explanation"), // Detailed explanation for learning
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard", "olympiad"]).default("medium").notNull(),
  points: int("points").default(10), // Points awarded for correct answer
  timeLimit: int("timeLimit").default(60), // Time limit in seconds
  createdBy: int("createdBy").notNull(), // User ID of creator (parent)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  isActive: boolean("isActive").default(true).notNull(),
});

/**
 * Quiz sessions - tracks each quiz attempt
 */
export const quizSessions = mysqlTable("quizSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Child user ID
  moduleId: int("moduleId").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  totalQuestions: int("totalQuestions").notNull(),
  correctAnswers: int("correctAnswers").default(0),
  wrongAnswers: int("wrongAnswers").default(0),
  skippedQuestions: int("skippedQuestions").default(0),
  totalPoints: int("totalPoints").default(0),
  timeTaken: int("timeTaken").default(0), // Total time in seconds
  scorePercentage: int("scorePercentage").default(0),
  isCompleted: boolean("isCompleted").default(false).notNull(),
});

/**
 * Quiz responses - individual question responses
 */
export const quizResponses = mysqlTable("quizResponses", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  questionId: int("questionId").notNull(),
  userAnswer: text("userAnswer"), // JSON string for complex answers
  isCorrect: boolean("isCorrect").notNull(),
  pointsEarned: int("pointsEarned").default(0),
  timeSpent: int("timeSpent").default(0), // Time spent on this question in seconds
  answeredAt: timestamp("answeredAt").defaultNow().notNull(),
});

/**
 * Achievements/Badges
 */
export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  criteria: text("criteria"), // JSON string describing how to earn
  points: int("points").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * User achievements - tracks which badges users have earned
 */
export const userAchievements = mysqlTable("userAchievements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  achievementId: int("achievementId").notNull(),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
});

/**
 * Daily activity log for streak tracking
 */
export const activityLog = mysqlTable("activityLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  activityDate: timestamp("activityDate").notNull(),
  quizzesTaken: int("quizzesTaken").default(0),
  questionsAnswered: int("questionsAnswered").default(0),
  pointsEarned: int("pointsEarned").default(0),
  timeSpent: int("timeSpent").default(0), // in seconds
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = typeof subjects.$inferInsert;
export type Module = typeof modules.$inferSelect;
export type InsertModule = typeof modules.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;
export type QuizSession = typeof quizSessions.$inferSelect;
export type InsertQuizSession = typeof quizSessions.$inferInsert;
export type QuizResponse = typeof quizResponses.$inferSelect;
export type InsertQuizResponse = typeof quizResponses.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = typeof userAchievements.$inferInsert;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;

