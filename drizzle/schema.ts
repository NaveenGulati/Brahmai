import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, decimal, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * ============================================
 * CORE USER & AUTHENTICATION TABLES
 * ============================================
 */

/**
 * Main users table - supports all user types in the platform
 * Roles: parent, child, teacher, superadmin, qb_admin
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // OAuth ID (nullable for local accounts)
  email: varchar("email", { length: 320 }).unique(), // Email (unique for teachers, parents with OAuth)
  name: text("name"),
  loginMethod: varchar("loginMethod", { length: 64 }), // oauth, local, google, etc.
  role: mysqlEnum("role", ["parent", "child", "teacher", "superadmin", "qb_admin"]).notNull(),
  
  // Local authentication (for children and optionally teachers)
  username: varchar("username", { length: 50 }).unique(), // For local login
  passwordHash: varchar("passwordHash", { length: 255 }), // Bcrypt hash
  
  // Account status
  isActive: boolean("isActive").default(true).notNull(),
  isEmailVerified: boolean("isEmailVerified").default(false).notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Parent profiles - extended information for parents
 */
export const parentProfiles = mysqlTable("parentProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // FK to users table
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }).default("India"),
  timezone: varchar("timezone", { length: 50 }).default("Asia/Kolkata"),
  preferredLanguage: varchar("preferredLanguage", { length: 10 }).default("en"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Child profiles - students in the system
 */
export const childProfiles = mysqlTable("childProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // FK to users table
  parentId: int("parentId").notNull(), // FK to users table (parent)
  
  // Academic information
  currentGrade: int("currentGrade").notNull(), // Current grade (1-12)
  board: mysqlEnum("board", ["CBSE", "ICSE", "IB", "State", "Other"]).notNull(),
  schoolName: varchar("schoolName", { length: 200 }),
  
  // Gamification
  totalPoints: int("totalPoints").default(0),
  currentStreak: int("currentStreak").default(0),
  longestStreak: int("longestStreak").default(0),
  lastActivityDate: timestamp("lastActivityDate"),
  
  // Settings
  learningPreferences: json("learningPreferences"), // Difficulty preferences, pace, etc.
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Grade history - tracks student progression through grades
 */
export const gradeHistory = mysqlTable("gradeHistory", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(), // FK to childProfiles
  grade: int("grade").notNull(),
  board: mysqlEnum("board", ["CBSE", "ICSE", "IB", "State", "Other"]).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"), // Null if current grade
  academicYear: varchar("academicYear", { length: 20 }), // e.g., "2024-25"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Teacher profiles - educators in the system
 */
export const teacherProfiles = mysqlTable("teacherProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // FK to users table
  
  // Professional information
  bio: text("bio"),
  qualifications: text("qualifications"), // Degrees, certifications
  experience: int("experience"), // Years of experience
  specializations: json("specializations"), // ["CBSE Math", "ICSE Science", "Olympiad"]
  
  // Contact
  phone: varchar("phone", { length: 20 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }).default("India"),
  
  // Platform settings
  isPublicProfile: boolean("isPublicProfile").default(false), // For future marketplace
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }), // For future monetization
  
  // Verification
  isVerified: boolean("isVerified").default(false), // Admin verification
  verifiedAt: timestamp("verifiedAt"),
  verifiedBy: int("verifiedBy"), // FK to users (superadmin)
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * ============================================
 * TEACHER-STUDENT RELATIONSHIP TABLES
 * ============================================
 */

/**
 * Teacher-student assignments - maps teachers to students with subject access
 */
export const teacherStudentAssignments = mysqlTable("teacherStudentAssignments", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(), // FK to users (teacher)
  childId: int("childId").notNull(), // FK to childProfiles
  parentId: int("parentId").notNull(), // FK to users (parent who made assignment)
  
  // Access control
  board: mysqlEnum("board", ["CBSE", "ICSE", "IB", "State", "Other"]).notNull(),
  grade: int("grade").notNull(), // Grade at time of assignment
  subjectIds: json("subjectIds").notNull(), // Array of subject IDs teacher can access
  
  // Status
  status: mysqlEnum("status", ["active", "inactive", "completed"]).default("active").notNull(),
  
  // Dates
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"), // Null if ongoing
  
  // Notes
  assignmentNotes: text("assignmentNotes"), // Parent's notes about this assignment
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  // Unique constraint: one teacher-child-subject combination at a time
  uniqueAssignment: uniqueIndex("unique_teacher_child").on(table.teacherId, table.childId, table.status),
}));

/**
 * Student groups/classes - for bulk operations by teachers
 */
export const studentGroups = mysqlTable("studentGroups", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(), // FK to users (teacher)
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Grade 7 Batch A"
  description: text("description"),
  board: mysqlEnum("board", ["CBSE", "ICSE", "IB", "State", "Other"]).notNull(),
  grade: int("grade").notNull(),
  subjectId: int("subjectId"), // Optional: group specific to a subject
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Student group members - many-to-many relationship
 */
export const studentGroupMembers = mysqlTable("studentGroupMembers", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(), // FK to studentGroups
  childId: int("childId").notNull(), // FK to childProfiles
  addedAt: timestamp("addedAt").defaultNow().notNull(),
  addedBy: int("addedBy").notNull(), // FK to users (teacher)
}, (table) => ({
  uniqueMember: uniqueIndex("unique_group_child").on(table.groupId, table.childId),
}));

/**
 * ============================================
 * CONTENT & CURRICULUM TABLES
 * ============================================
 */

/**
 * Boards - educational boards (CBSE, ICSE, etc.)
 */
export const boards = mysqlTable("boards", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(), // CBSE, ICSE, IB, STATE_UP
  name: varchar("name", { length: 100 }).notNull(), // Central Board of Secondary Education
  country: varchar("country", { length: 100 }).default("India"),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  displayOrder: int("displayOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Grades - grade levels (1-12, plus special categories)
 */
export const grades = mysqlTable("grades", {
  id: int("id").autoincrement().primaryKey(),
  level: int("level").notNull().unique(), // 1-12
  name: varchar("name", { length: 50 }).notNull(), // "Grade 7", "Class 7"
  displayOrder: int("displayOrder").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Subjects - academic subjects
 */
export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // Mathematics, Physics, Chemistry
  code: varchar("code", { length: 20 }).notNull().unique(), // MATH, PHY, CHEM
  description: text("description"),
  icon: varchar("icon", { length: 100 }), // Emoji or icon name
  color: varchar("color", { length: 20 }), // Hex color for UI
  category: mysqlEnum("category", ["core", "language", "elective", "skill"]).default("core"),
  isActive: boolean("isActive").default(true).notNull(),
  displayOrder: int("displayOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Board-Grade-Subject mapping - defines which subjects are available for each board-grade combination
 */
export const boardGradeSubjects = mysqlTable("boardGradeSubjects", {
  id: int("id").autoincrement().primaryKey(),
  boardId: int("boardId").notNull(), // FK to boards
  gradeId: int("gradeId").notNull(), // FK to grades
  subjectId: int("subjectId").notNull(), // FK to subjects
  isCompulsory: boolean("isCompulsory").default(true), // vs elective
  displayOrder: int("displayOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  uniqueMapping: uniqueIndex("unique_board_grade_subject").on(table.boardId, table.gradeId, table.subjectId),
}));

/**
 * Modules/Topics within each subject
 */
export const modules = mysqlTable("modules", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull(), // FK to subjects
  boardId: int("boardId"), // Optional: module specific to a board
  gradeId: int("gradeId"), // Optional: module specific to a grade
  
  name: varchar("name", { length: 200 }).notNull(), // "Algebra - Linear Equations"
  description: text("description"),
  
  // Curriculum sequencing
  parentModuleId: int("parentModuleId"), // For hierarchical topics
  prerequisiteModuleIds: json("prerequisiteModuleIds"), // Modules that must be completed first
  orderIndex: int("orderIndex").default(0),
  
  // Metadata
  estimatedTime: int("estimatedTime"), // Minutes to complete
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]).default("intermediate"),
  
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * ============================================
 * QUESTION BANK TABLES
 * ============================================
 */

/**
 * Question bank - stores all questions with comprehensive metadata
 */
export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  
  // Content classification (free text for flexibility)
  board: varchar("board", { length: 50 }).notNull(), // e.g., "ICSE", "CBSE"
  grade: int("grade").notNull(), // e.g., 7, 8, 9
  subject: varchar("subject", { length: 100 }).notNull(), // e.g., "Mathematics", "Spanish"
  topic: varchar("topic", { length: 200 }).notNull(), // Main topic
  subTopic: varchar("subTopic", { length: 200 }), // Granular sub-topic
  scope: mysqlEnum("scope", ["School", "Olympiad", "Competitive", "Advanced"]).default("School").notNull(),
  
  // Question content
  questionType: mysqlEnum("questionType", [
    "mcq",           // Multiple choice
    "true_false",    // True/False
    "fill_blank",    // Fill in the blanks
    "match",         // Match the following
    "image_based"    // Image-based questions
  ]).notNull(),
  questionText: text("questionText").notNull(),
  questionImage: varchar("questionImage", { length: 500 }), // URL to image
  
  // Answer data
  options: json("options"), // MCQ options, match pairs, etc.
  correctAnswer: text("correctAnswer").notNull(),
  explanation: text("explanation"), // Brief explanation
  
  // Difficulty & scoring
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium").notNull(),
  points: int("points").default(10),
  timeLimit: int("timeLimit").default(60), // Seconds
  
  // Approval workflow
  status: mysqlEnum("status", ["draft", "pending_review", "approved", "rejected", "archived"]).default("draft").notNull(),
  submittedBy: int("submittedBy").notNull(), // FK to users (QB Admin)
  reviewedBy: int("reviewedBy"), // FK to users (SuperAdmin)
  reviewedAt: timestamp("reviewedAt"),
  reviewNotes: text("reviewNotes"),
  
  // Quality metrics (populated over time)
  timesUsed: int("timesUsed").default(0),
  averageScore: decimal("averageScore", { precision: 5, scale: 2 }), // Percentage
  reportCount: int("reportCount").default(0), // Times reported as problematic
  
  // Metadata
  tags: json("tags"), // Additional searchable tags
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Question reports - users flag problematic questions
 */
export const questionReports = mysqlTable("questionReports", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull(), // FK to questions
  reportedBy: int("reportedBy").notNull(), // FK to users
  reportType: mysqlEnum("reportType", ["incorrect_answer", "typo", "unclear", "inappropriate", "other"]).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "reviewed", "resolved", "dismissed"]).default("pending").notNull(),
  resolvedBy: int("resolvedBy"), // FK to users (admin)
  resolvedAt: timestamp("resolvedAt"),
  resolutionNotes: text("resolutionNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * AI Explanation Cache - stores AI-generated detailed explanations
 */
export const aiExplanationCache = mysqlTable("aiExplanationCache", {
  questionId: int("questionId").primaryKey().notNull(),
  detailedExplanation: text("detailedExplanation").notNull(),
  audioUrl: text("audioUrl"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  timesUsed: int("timesUsed").default(1).notNull(),
  lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
});

/**
 * ============================================
 * QUIZ & ASSESSMENT TABLES
 * ============================================
 */

/**
 * Quiz sessions - tracks each quiz attempt
 */
export const quizSessions = mysqlTable("quizSessions", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(), // FK to childProfiles
  moduleId: int("moduleId").notNull(), // FK to modules
  
  // Session metadata
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  totalQuestions: int("totalQuestions").notNull(),
  
  // Results
  correctAnswers: int("correctAnswers").default(0),
  wrongAnswers: int("wrongAnswers").default(0),
  skippedQuestions: int("skippedQuestions").default(0),
  totalPoints: int("totalPoints").default(0),
  timeTaken: int("timeTaken").default(0), // Seconds
  scorePercentage: int("scorePercentage").default(0),
  
  // Status
  isCompleted: boolean("isCompleted").default(false).notNull(),
  
  // Context (who assigned this quiz?)
  assignedBy: int("assignedBy"), // FK to users (teacher or parent)
  assignmentType: mysqlEnum("assignmentType", ["self", "parent_challenge", "teacher_assignment", "group_assignment"]),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Quiz responses - individual question responses
 */
export const quizResponses = mysqlTable("quizResponses", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(), // FK to quizSessions
  questionId: int("questionId").notNull(), // FK to questions
  userAnswer: text("userAnswer"),
  isCorrect: boolean("isCorrect").notNull(),
  pointsEarned: int("pointsEarned").default(0),
  timeSpent: int("timeSpent").default(0), // Seconds
  answeredAt: timestamp("answeredAt").defaultNow().notNull(),
});

/**
 * Challenges - assignments from parents or teachers
 */
export const challenges = mysqlTable("challenges", {
  id: int("id").autoincrement().primaryKey(),
  assignedBy: int("assignedBy").notNull(), // FK to users (parent or teacher)
  assignedTo: int("assignedTo").notNull(), // FK to childProfiles
  assignedToType: mysqlEnum("assignedToType", ["individual", "group"]).default("individual").notNull(),
  groupId: int("groupId"), // FK to studentGroups (if group assignment)
  
  // Challenge details
  moduleId: int("moduleId").notNull(), // FK to modules
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message"),
  
  // Adaptive challenge configuration
  questionCount: int("questionCount").default(10).notNull(), // Number of questions (10-100)
  complexity: int("complexity").default(5).notNull(), // Complexity level (1-10)
  focusArea: mysqlEnum("focusArea", ["strengthen", "improve", "neutral"]).default("neutral").notNull(),
  estimatedDuration: int("estimatedDuration"), // Estimated duration in minutes
  difficultyDistribution: json("difficultyDistribution"), // Actual difficulty mix used {easy: 30, medium: 50, hard: 20}
  selectedQuestionIds: text("selectedQuestionIds"), // JSON array of pre-selected question IDs
  useComplexityBoundaries: boolean("useComplexityBoundaries").default(true).notNull(), // If false, fully adaptive
  
  // Scheduling
  startDate: timestamp("startDate"),
  dueDate: timestamp("dueDate"),
  expiresAt: timestamp("expiresAt"),
  
  // Status
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "expired"]).default("pending").notNull(),
  completedAt: timestamp("completedAt"),
  sessionId: int("sessionId"), // FK to quizSessions (when completed)
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * ============================================
 * STUDENT PERFORMANCE TRACKING
 * ============================================
 */

/**
 * Tracks student performance per topic for adaptive challenge creation
 * Updated after each quiz completion (rolling window of last 5 quizzes)
 */
export const studentTopicPerformance = mysqlTable("studentTopicPerformance", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(), // FK to childProfiles
  subject: varchar("subject", { length: 100 }).notNull(),
  topic: varchar("topic", { length: 200 }).notNull(),
  
  // Performance metrics (calculated from last 5 quizzes on this topic)
  totalAttempts: int("totalAttempts").default(0).notNull(),
  totalQuestions: int("totalQuestions").default(0).notNull(),
  correctAnswers: int("correctAnswers").default(0).notNull(),
  accuracyPercent: decimal("accuracyPercent", { precision: 5, scale: 2 }),
  avgTimePerQuestion: int("avgTimePerQuestion"),
  
  // Difficulty-wise breakdown
  easyCorrect: int("easyCorrect").default(0),
  easyTotal: int("easyTotal").default(0),
  mediumCorrect: int("mediumCorrect").default(0),
  mediumTotal: int("mediumTotal").default(0),
  hardCorrect: int("hardCorrect").default(0),
  hardTotal: int("hardTotal").default(0),
  
  // Classification
  performanceLevel: mysqlEnum("performanceLevel", ["weak", "neutral", "strong"]).notNull(),
  confidenceScore: decimal("confidenceScore", { precision: 5, scale: 2 }),
  
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * ============================================
 * GAMIFICATION & ENGAGEMENT TABLES
 * ============================================
 */

/**
 * Achievements/Badges
 */
export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  category: mysqlEnum("category", ["streak", "score", "completion", "speed", "special"]).default("completion"),
  criteria: text("criteria"), // JSON describing how to earn
  points: int("points").default(0),
  rarity: mysqlEnum("rarity", ["common", "rare", "epic", "legendary"]).default("common"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * User achievements - tracks earned badges
 */
export const userAchievements = mysqlTable("userAchievements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK to users (child)
  achievementId: int("achievementId").notNull(), // FK to achievements
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
  progress: int("progress").default(100), // For progressive achievements
}, (table) => ({
  uniqueAchievement: uniqueIndex("unique_user_achievement").on(table.userId, table.achievementId),
}));

/**
 * Daily activity log for streak tracking
 */
export const activityLog = mysqlTable("activityLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK to users (child)
  activityDate: timestamp("activityDate").notNull(),
  quizzesTaken: int("quizzesTaken").default(0),
  questionsAnswered: int("questionsAnswered").default(0),
  pointsEarned: int("pointsEarned").default(0),
  timeSpent: int("timeSpent").default(0), // Seconds
}, (table) => ({
  uniqueActivity: uniqueIndex("unique_user_date").on(table.userId, table.activityDate),
}));

/**
 * ============================================
 * COMMUNICATION TABLES
 * ============================================
 */

/**
 * Messages - in-app messaging between users
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  fromUserId: int("fromUserId").notNull(), // FK to users
  toUserId: int("toUserId").notNull(), // FK to users
  subject: varchar("subject", { length: 200 }),
  content: text("content").notNull(),
  messageType: mysqlEnum("messageType", ["direct", "announcement", "system"]).default("direct").notNull(),
  
  // Context
  relatedEntityType: varchar("relatedEntityType", { length: 50 }), // quiz_session, challenge, etc.
  relatedEntityId: int("relatedEntityId"),
  
  // Status
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Announcements - broadcast messages from teachers to groups
 */
export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull(), // FK to users (teacher)
  targetType: mysqlEnum("targetType", ["group", "individual", "all_students"]).notNull(),
  targetId: int("targetId"), // groupId or childId
  
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  
  expiresAt: timestamp("expiresAt"),
  isActive: boolean("isActive").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * ============================================
 * ADMIN & PLATFORM MANAGEMENT TABLES
 * ============================================
 */

/**
 * QB Admin assignments - defines which QB Admins manage which domains
 */
export const qbAdminAssignments = mysqlTable("qbAdminAssignments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK to users (qb_admin)
  boardId: int("boardId"), // Null = all boards
  gradeId: int("gradeId"), // Null = all grades
  subjectId: int("subjectId"), // Null = all subjects
  
  // Permissions
  canCreate: boolean("canCreate").default(true).notNull(),
  canEdit: boolean("canEdit").default(true).notNull(),
  canDelete: boolean("canDelete").default(false).notNull(),
  canApprove: boolean("canApprove").default(false).notNull(), // Usually only SuperAdmin
  
  assignedBy: int("assignedBy").notNull(), // FK to users (superadmin)
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  isActive: boolean("isActive").default(true).notNull(),
});

/**
 * Audit log - tracks important platform actions
 */
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Who performed the action
  action: varchar("action", { length: 100 }).notNull(), // create_user, delete_question, etc.
  entityType: varchar("entityType", { length: 50 }).notNull(), // user, question, assignment
  entityId: int("entityId"),
  changes: json("changes"), // Before/after values
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Platform settings - key-value store for configuration
 */
export const platformSettings = mysqlTable("platformSettings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  valueType: mysqlEnum("valueType", ["string", "number", "boolean", "json"]).default("string").notNull(),
  description: text("description"),
  isPublic: boolean("isPublic").default(false).notNull(), // Can non-admins read this?
  updatedBy: int("updatedBy"), // FK to users
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * ============================================
 * TYPE EXPORTS
 * ============================================
 */

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ParentProfile = typeof parentProfiles.$inferSelect;
export type InsertParentProfile = typeof parentProfiles.$inferInsert;
export type ChildProfile = typeof childProfiles.$inferSelect;
export type InsertChildProfile = typeof childProfiles.$inferInsert;
export type TeacherProfile = typeof teacherProfiles.$inferSelect;
export type InsertTeacherProfile = typeof teacherProfiles.$inferInsert;
export type TeacherStudentAssignment = typeof teacherStudentAssignments.$inferSelect;
export type InsertTeacherStudentAssignment = typeof teacherStudentAssignments.$inferInsert;
export type StudentGroup = typeof studentGroups.$inferSelect;
export type InsertStudentGroup = typeof studentGroups.$inferInsert;
export type Board = typeof boards.$inferSelect;
export type InsertBoard = typeof boards.$inferInsert;
export type Grade = typeof grades.$inferSelect;
export type InsertGrade = typeof grades.$inferInsert;
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
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = typeof challenges.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = typeof userAchievements.$inferInsert;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;
export type AiExplanationCache = typeof aiExplanationCache.$inferSelect;
export type InsertAiExplanationCache = typeof aiExplanationCache.$inferInsert;
export type QBAdminAssignment = typeof qbAdminAssignments.$inferSelect;
export type InsertQBAdminAssignment = typeof qbAdminAssignments.$inferInsert;
export type GradeHistory = typeof gradeHistory.$inferSelect;
export type InsertGradeHistory = typeof gradeHistory.$inferInsert;
export type StudentTopicPerformance = typeof studentTopicPerformance.$inferSelect;
export type InsertStudentTopicPerformance = typeof studentTopicPerformance.$inferInsert;

