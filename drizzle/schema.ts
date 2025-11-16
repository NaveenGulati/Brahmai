import { pgTable, pgEnum, serial, integer, varchar, text, timestamp, boolean, jsonb, numeric, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * ============================================
 * ENUMS - Must be defined before tables
 * ============================================
 */
export const roleEnum = pgEnum("role", ["parent", "child", "teacher", "superadmin", "qb_admin"]);
export const boardEnum = pgEnum("board", ["CBSE", "ICSE", "IB", "State", "Other"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const questionTypeEnum = pgEnum("question_type", ["multiple_choice", "true_false", "fill_blank", "short_answer"]);
export const challengeStatusEnum = pgEnum("challenge_status", ["pending", "in_progress", "completed", "expired"]);

/**
 * ============================================
 * CORE USER & AUTHENTICATION TABLES
 * ============================================
 */

/**
 * Main users table - supports all user types in the platform
 * Roles: parent, child, teacher, superadmin, qb_admin
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // OAuth ID (nullable for local accounts)
  email: varchar("email", { length: 320 }).unique(), // Email (unique for teachers, parents with OAuth)
  name: text("name"),
  loginMethod: varchar("loginMethod", { length: 64 }), // oauth, local, google, etc.
  role: roleEnum().notNull(),
  
  // Local authentication (for children and optionally teachers)
  username: varchar("username", { length: 50 }).unique(), // For local login
  passwordHash: varchar("passwordHash", { length: 255 }), // Bcrypt hash
  
  // Account status
  isActive: boolean("isActive").default(true).notNull(),
  isEmailVerified: boolean("isEmailVerified").default(false).notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Parent profiles - extended information for parents
 */
export const parentProfiles = pgTable("parentProfiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(), // FK to users table
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }).default("India"),
  timezone: varchar("timezone", { length: 50 }).default("Asia/Kolkata"),
  preferredLanguage: varchar("preferredLanguage", { length: 10 }).default("en"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Child profiles - students in the system
 */
export const childProfiles = pgTable("childProfiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(), // FK to users table
  parentId: integer("parentId").notNull(), // FK to users table (parent)
  
  // Academic information
  currentGrade: integer("currentGrade").notNull(), // Current grade (1-12)
  board: boardEnum().notNull(),
  schoolName: varchar("schoolName", { length: 200 }),
  
  // Gamification
  totalPoints: integer("totalPoints").default(0),
  currentStreak: integer("currentStreak").default(0),
  longestStreak: integer("longestStreak").default(0),
  lastActivityDate: timestamp("lastActivityDate"),
  
  // Settings
  learningPreferences: jsonb("learningPreferences"), // Difficulty preferences, pace, etc.
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Grade history - tracks student progression through grades
 */
export const gradeHistory = pgTable("gradeHistory", {
  id: serial("id").primaryKey(),
  childId: integer("childId").notNull(), // FK to childProfiles
  grade: integer("grade").notNull(),
  board: boardEnum().notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"), // Null if current grade
  academicYear: varchar("academicYear", { length: 20 }), // e.g., "2024-25"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Teacher profiles - educators in the system
 */
export const teacherProfiles = pgTable("teacherProfiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(), // FK to users table
  
  // Professional information
  bio: text("bio"),
  qualifications: text("qualifications"), // Degrees, certifications
  experience: integer("experience"), // Years of experience
  specializations: jsonb("specializations"), // ["CBSE Math", "ICSE Science", "Olympiad"]
  
  // Contact
  phone: varchar("phone", { length: 20 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }).default("India"),
  
  // Platform settings
  isPublicProfile: boolean("isPublicProfile").default(false), // For future marketplace
  hourlyRate: numeric("hourlyRate", { precision: 10, scale: 2 }), // For future monetization
  
  // Verification
  isVerified: boolean("isVerified").default(false), // Admin verification
  verifiedAt: timestamp("verifiedAt"),
  verifiedBy: integer("verifiedBy"), // FK to users (superadmin)
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * ============================================
 * TEACHER-STUDENT RELATIONSHIP TABLES
 * ============================================
 */

/**
 * Teacher-student assignments - maps teachers to students with subject access
 */
export const teacherStudentAssignments = pgTable("teacherStudentAssignments", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacherId").notNull(), // FK to users (teacher)
  childId: integer("childId").notNull(), // FK to childProfiles
  parentId: integer("parentId").notNull(), // FK to users (parent who made assignment)
  
  // Access control
  board: boardEnum().notNull(),
  grade: integer("grade").notNull(), // Grade at time of assignment
  subjectIds: jsonb("subjectIds").notNull(), // Array of subject IDs teacher can access
  
  // Status
  status: varchar("status", { length: 20 }).default("active").notNull(),
  
  // Dates
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"), // Null if ongoing
  
  // Notes
  assignmentNotes: text("assignmentNotes"), // Parent's notes about this assignment
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: one teacher-child-subject combination at a time
  uniqueAssignment: uniqueIndex("unique_teacher_child").on(table.teacherId, table.childId, table.status),
}));

/**
 * Student groups/classes - for bulk operations by teachers
 */
export const studentGroups = pgTable("studentGroups", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacherId").notNull(), // FK to users (teacher)
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Grade 7 Batch A"
  description: text("description"),
  board: boardEnum().notNull(),
  grade: integer("grade").notNull(),
  subjectId: integer("subjectId"), // Optional: group specific to a subject
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Student group members - many-to-many relationship
 */
export const studentGroupMembers = pgTable("studentGroupMembers", {
  id: serial("id").primaryKey(),
  groupId: integer("groupId").notNull(), // FK to studentGroups
  childId: integer("childId").notNull(), // FK to childProfiles
  addedAt: timestamp("addedAt").defaultNow().notNull(),
  addedBy: integer("addedBy").notNull(), // FK to users (teacher)
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
export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(), // CBSE, ICSE, IB, STATE_UP
  name: varchar("name", { length: 100 }).notNull(), // Central Board of Secondary Education
  country: varchar("country", { length: 100 }).default("India"),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  displayOrder: integer("displayOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Grades - grade levels (1-12, plus special categories)
 */
export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  level: integer("level").notNull().unique(), // 1-12
  name: varchar("name", { length: 50 }).notNull(), // "Grade 7", "Class 7"
  displayOrder: integer("displayOrder").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Subjects - academic subjects
 */
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // Mathematics, Physics, Chemistry
  code: varchar("code", { length: 20 }).notNull().unique(), // MATH, PHY, CHEM
  description: text("description"),
  icon: varchar("icon", { length: 100 }), // Emoji or icon name
  color: varchar("color", { length: 20 }), // Hex color for UI
  category: varchar("category", { length: 20 }).default("core"),
  isActive: boolean("isActive").default(true).notNull(),
  displayOrder: integer("displayOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Board-Grade-Subject mapping - defines which subjects are available for each board-grade combination
 */
export const boardGradeSubjects = pgTable("boardGradeSubjects", {
  id: serial("id").primaryKey(),
  boardId: integer("boardId").notNull(), // FK to boards
  gradeId: integer("gradeId").notNull(), // FK to grades
  subjectId: integer("subjectId").notNull(), // FK to subjects
  isCompulsory: boolean("isCompulsory").default(true), // vs elective
  displayOrder: integer("displayOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  uniqueMapping: uniqueIndex("unique_board_grade_subject").on(table.boardId, table.gradeId, table.subjectId),
}));

/**
 * Modules/Topics within each subject
 */
export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  subjectId: integer("subjectId").notNull(), // FK to subjects
  boardId: integer("boardId"), // Optional: module specific to a board
  gradeId: integer("gradeId"), // Optional: module specific to a grade
  
  name: varchar("name", { length: 200 }).notNull(), // "Algebra - Linear Equations"
  description: text("description"),
  
  // Curriculum sequencing
  parentModuleId: integer("parentModuleId"), // For hierarchical topics
  prerequisiteModuleIds: jsonb("prerequisiteModuleIds"), // Modules that must be completed first
  orderIndex: integer("orderIndex").default(0),
  
  // Metadata
  estimatedTime: integer("estimatedTime"), // Minutes to complete
  difficulty: difficultyEnum().default("medium"),
  
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * ============================================
 * QUESTION BANK TABLES
 * ============================================
 */

/**
 * Question bank - stores all questions with comprehensive metadata
 */
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  
  // Content classification (free text for flexibility)
  board: varchar("board", { length: 50 }).notNull(), // e.g., "ICSE", "CBSE"
  grade: integer("grade").notNull(), // e.g., 7, 8, 9
  subject: varchar("subject", { length: 100 }).notNull(), // e.g., "Mathematics", "Spanish"
  topic: varchar("topic", { length: 200 }).notNull(), // Main topic
  subTopic: varchar("subTopic", { length: 200 }), // Granular sub-topic
  scope: varchar("scope", { length: 20 }).default("School").notNull(),
  
  // Question content
  questionType: varchar("questionType", { length: 50 }).notNull(),
  questionText: text("questionText").notNull(),
  questionImage: varchar("questionImage", { length: 500 }), // URL to image
  
  // Answer data
  options: jsonb("options"), // MCQ options, match pairs, etc.
  correctAnswer: text("correctAnswer").notNull(),
  explanation: text("explanation"), // Brief explanation
  
  // Difficulty & scoring
  difficulty: difficultyEnum().default("medium").notNull(),
  points: integer("points").default(10),
  timeLimit: integer("timeLimit").default(60), // Seconds
  
  // Approval workflow
  status: varchar("status", { length: 50 }).default("draft").notNull(),
  submittedBy: integer("submittedBy").notNull(), // FK to users (QB Admin)
  reviewedBy: integer("reviewedBy"), // FK to users (SuperAdmin)
  reviewedAt: timestamp("reviewedAt"),
  reviewNotes: text("reviewNotes"),
  
  // Quality metrics (populated over time)
  timesUsed: integer("timesUsed").default(0),
  averageScore: numeric("averageScore", { precision: 5, scale: 2 }), // Percentage
  reportCount: integer("reportCount").default(0), // Times reported as problematic
  
  // Metadata
  tags: jsonb("tags"), // Additional searchable tags
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Question reports - users flag problematic questions
 */
export const questionReports = pgTable("questionReports", {
  id: serial("id").primaryKey(),
  questionId: integer("questionId").notNull(), // FK to questions
  reportedBy: integer("reportedBy").notNull(), // FK to users
  reportType: varchar("reportType", { length: 50 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  resolvedBy: integer("resolvedBy"), // FK to users (admin)
  resolvedAt: timestamp("resolvedAt"),
  resolutionNotes: text("resolutionNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * AI Explanation Cache - stores AI-generated detailed explanations
 */
export const aiExplanationCache = pgTable("aiExplanationCache", {
  questionId: integer("questionId").primaryKey().notNull(),
  detailedExplanation: text("detailedExplanation").notNull(),
  audioUrl: text("audioUrl"),
  imageData: text("imageData"), // JSON array of {url, caption, attribution}
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  timesUsed: integer("timesUsed").default(1).notNull(),
  lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
});

/**
 * Explanation Versions - stores simplified versions of explanations
 * Supports progressive learning with multiple intelligence levels
 */
export const explanationVersions = pgTable("explanationVersions", {
  id: serial("id").primaryKey(),
  questionId: integer("questionId").notNull(),
  simplificationLevel: integer("simplificationLevel").notNull(), // 0=standard, 1=simple, 2=very simple, 3=ELI5
  explanationText: text("explanationText").notNull(),
  audioUrl: text("audioUrl"),
  imageData: text("imageData"), // JSON array of {url, caption, attribution}
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  usageCount: integer("usageCount").default(1).notNull(),
  lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
}, (table) => ({
  // Composite unique index for questionId + simplificationLevel
  questionLevelIdx: uniqueIndex("explanation_versions_question_level_idx").on(table.questionId, table.simplificationLevel),
}));

/**
 * ============================================
 * QUIZ & ASSESSMENT TABLES
 * ============================================
 */

/**
 * Quiz sessions - tracks each quiz attempt
 */
export const quizSessions = pgTable("quizSessions", {
  id: serial("id").primaryKey(),
  childId: integer("childId").notNull(), // FK to childProfiles
  moduleId: integer("moduleId").notNull(), // FK to modules
  
  // Session metadata
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  totalQuestions: integer("totalQuestions").notNull(),
  
  // Results
  correctAnswers: integer("correctAnswers").default(0),
  wrongAnswers: integer("wrongAnswers").default(0),
  skippedQuestions: integer("skippedQuestions").default(0),
  totalPoints: integer("totalPoints").default(0),
  timeTaken: integer("timeTaken").default(0), // Seconds
  scorePercentage: integer("scorePercentage").default(0),
  
  // Status
  isCompleted: boolean("isCompleted").default(false).notNull(),
  
  // Context (who assigned this quiz?)
  assignedBy: integer("assignedBy"), // FK to users (teacher or parent)
  assignmentType: varchar("assignmentType", { length: 50 }),
  
  // Adaptive quiz configuration
  challengeId: integer("challengeId"), // FK to challenges
  focusArea: varchar("focusArea", { length: 20 }).default("balanced"), // 'strengthen', 'improve', 'balanced'
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Quiz responses - individual question responses
 */
export const quizResponses = pgTable("quizResponses", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId").notNull(), // FK to quizSessions
  questionId: integer("questionId").notNull(), // FK to questions
  userAnswer: text("userAnswer"),
  isCorrect: boolean("isCorrect").notNull(),
  pointsEarned: integer("pointsEarned").default(0),
  timeSpent: integer("timeSpent").default(0), // Seconds
  answeredAt: timestamp("answeredAt").defaultNow().notNull(),
});

/**
 * Challenges - assignments from parents or teachers
 */
export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  assignedBy: integer("assignedBy").notNull(), // FK to users (parent or teacher)
  assignedTo: integer("assignedTo").notNull(), // FK to childProfiles
  assignedToType: varchar("assignedToType", { length: 20 }).default("individual").notNull(),
  groupId: integer("groupId"), // FK to studentGroups (if group assignment)
  
  // Challenge details
  challengeType: varchar("challengeType", { length: 20 }).default("simple").notNull(), // 'simple' or 'advanced'
  challengeScope: jsonb("challengeScope"), // For advanced challenges: topic selections and distribution
  moduleId: integer("moduleId"), // FK to modules (nullable for advanced challenges)
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message"),
  
  // Adaptive challenge configuration
  questionCount: integer("questionCount").default(10).notNull(), // Number of questions (10-100)
  focusArea: varchar("focusArea", { length: 20 }).default("balanced").notNull(), // 'strengthen', 'improve', 'balanced'
  estimatedDuration: integer("estimatedDuration"), // Estimated duration in minutes
  
  // Scheduling
  startDate: timestamp("startDate"),
  dueDate: timestamp("dueDate"),
  expiresAt: timestamp("expiresAt"),
  
  // Status
  status: challengeStatusEnum().default("pending").notNull(),
  completedAt: timestamp("completedAt"),
  sessionId: integer("sessionId"), // FK to quizSessions (when completed)
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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
/**
 * Question Bank Shortfalls - tracks when question bank cannot fulfill requirements
 * Used for monitoring and alerting QB admins to refill question banks
 */
export const questionBankShortfalls = pgTable("question_bank_shortfalls", {
  id: serial("id").primaryKey(),
  challengeId: integer("challengeId"), // FK to challenges (nullable - can be deleted)
  subject: varchar("subject", { length: 100 }).notNull(),
  topic: varchar("topic", { length: 200 }).notNull(),
  subtopic: varchar("subtopic", { length: 200 }),
  requestedCount: integer("requestedCount").notNull(),
  availableCount: integer("availableCount").notNull(),
  shortfall: integer("shortfall").notNull(), // requested - available
  difficulty: varchar("difficulty", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolved: boolean("resolved").default(false).notNull(),
  resolvedAt: timestamp("resolvedAt"),
  notes: text("notes"),
});

export const studentTopicPerformance = pgTable("studentTopicPerformance", {
  id: serial("id").primaryKey(),
  childId: integer("childId").notNull(), // FK to childProfiles
  subject: varchar("subject", { length: 100 }).notNull(),
  topic: varchar("topic", { length: 200 }).notNull(),
  
  // Performance metrics (calculated from last 5 quizzes on this topic)
  totalAttempts: integer("totalAttempts").default(0).notNull(),
  totalQuestions: integer("totalQuestions").default(0).notNull(),
  correctAnswers: integer("correctAnswers").default(0).notNull(),
  accuracyPercent: numeric("accuracyPercent", { precision: 5, scale: 2 }),
  avgTimePerQuestion: integer("avgTimePerQuestion"),
  
  // Difficulty-wise breakdown
  easyCorrect: integer("easyCorrect").default(0),
  easyTotal: integer("easyTotal").default(0),
  mediumCorrect: integer("mediumCorrect").default(0),
  mediumTotal: integer("mediumTotal").default(0),
  hardCorrect: integer("hardCorrect").default(0),
  hardTotal: integer("hardTotal").default(0),
  
  // Classification
  performanceLevel: varchar("performanceLevel", { length: 20 }).notNull(),
  confidenceScore: numeric("confidenceScore", { precision: 5, scale: 2 }),
  
  lastUpdated: timestamp("lastUpdated").defaultNow().notNull(),
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
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  category: varchar("category", { length: 20 }).default("completion"),
  criteria: text("criteria"), // JSON describing how to earn
  points: integer("points").default(0),
  rarity: varchar("rarity", { length: 20 }).default("common"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * User achievements - tracks earned badges
 */
export const userAchievements = pgTable("userAchievements", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(), // FK to users (child)
  achievementId: integer("achievementId").notNull(), // FK to achievements
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
  progress: integer("progress").default(100), // For progressive achievements
}, (table) => ({
  uniqueAchievement: uniqueIndex("unique_user_achievement").on(table.userId, table.achievementId),
}));

/**
 * Daily activity log for streak tracking
 */
export const activityLog = pgTable("activityLog", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(), // FK to users (child)
  activityDate: timestamp("activityDate").notNull(),
  quizzesTaken: integer("quizzesTaken").default(0),
  questionsAnswered: integer("questionsAnswered").default(0),
  pointsEarned: integer("pointsEarned").default(0),
  timeSpent: integer("timeSpent").default(0), // Seconds
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
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromUserId: integer("fromUserId").notNull(), // FK to users
  toUserId: integer("toUserId").notNull(), // FK to users
  subject: varchar("subject", { length: 200 }),
  content: text("content").notNull(),
  messageType: varchar("messageType", { length: 20 }).default("direct").notNull(),
  
  // Context
  relatedEntityType: varchar("relatedEntityType", { length: 50 }), // quiz_session, challenge, etc.
  relatedEntityId: integer("relatedEntityId"),
  
  // Status
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Announcements - broadcast messages from teachers to groups
 */
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  createdBy: integer("createdBy").notNull(), // FK to users (teacher)
  targetType: varchar("targetType", { length: 20 }).notNull(),
  targetId: integer("targetId"), // groupId or childId
  
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  priority: varchar("priority", { length: 20 }).default("normal").notNull(),
  
  expiresAt: timestamp("expiresAt"),
  isActive: boolean("isActive").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * ============================================
 * ADMIN & PLATFORM MANAGEMENT TABLES
 * ============================================
 */

/**
 * QB Admin assignments - defines which QB Admins manage which domains
 */
export const qbAdminAssignments = pgTable("qbAdminAssignments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(), // FK to users (qb_admin)
  boardId: integer("boardId"), // Null = all boards
  gradeId: integer("gradeId"), // Null = all grades
  subjectId: integer("subjectId"), // Null = all subjects
  
  // Permissions
  canCreate: boolean("canCreate").default(true).notNull(),
  canEdit: boolean("canEdit").default(true).notNull(),
  canDelete: boolean("canDelete").default(false).notNull(),
  canApprove: boolean("canApprove").default(false).notNull(), // Usually only SuperAdmin
  
  assignedBy: integer("assignedBy").notNull(), // FK to users (superadmin)
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  isActive: boolean("isActive").default(true).notNull(),
});

/**
 * Audit log - tracks important platform actions
 */
export const auditLog = pgTable("auditLog", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(), // Who performed the action
  action: varchar("action", { length: 100 }).notNull(), // create_user, delete_question, etc.
  entityType: varchar("entityType", { length: 50 }).notNull(), // user, question, assignment
  entityId: integer("entityId"),
  changes: jsonb("changes"), // Before/after values
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Platform settings - key-value store for configuration
 */
export const platformSettings = pgTable("platformSettings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  valueType: varchar("valueType", { length: 20 }).default("string").notNull(),
  description: text("description"),
  isPublic: boolean("isPublic").default(false).notNull(), // Can non-admins read this?
  updatedBy: integer("updatedBy"), // FK to users
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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
export type ExplanationVersion = typeof explanationVersions.$inferSelect;
export type InsertExplanationVersion = typeof explanationVersions.$inferInsert;
export type QBAdminAssignment = typeof qbAdminAssignments.$inferSelect;
export type InsertQBAdminAssignment = typeof qbAdminAssignments.$inferInsert;
export type GradeHistory = typeof gradeHistory.$inferSelect;
export type InsertGradeHistory = typeof gradeHistory.$inferInsert;
export type StudentTopicPerformance = typeof studentTopicPerformance.$inferSelect;
export type InsertStudentTopicPerformance = typeof studentTopicPerformance.$inferInsert;
export type QuestionBankShortfall = typeof questionBankShortfalls.$inferSelect;
export type InsertQuestionBankShortfall = typeof questionBankShortfalls.$inferInsert;

