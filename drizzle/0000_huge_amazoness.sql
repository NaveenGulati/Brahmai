CREATE TYPE "public"."board" AS ENUM('CBSE', 'ICSE', 'IB', 'State', 'Other');--> statement-breakpoint
CREATE TYPE "public"."challenge_status" AS ENUM('pending', 'in_progress', 'completed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('multiple_choice', 'true_false', 'fill_blank', 'short_answer');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('parent', 'child', 'teacher', 'superadmin', 'qb_admin');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(100),
	"category" varchar(20) DEFAULT 'completion',
	"criteria" text,
	"points" integer DEFAULT 0,
	"rarity" varchar(20) DEFAULT 'common',
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activityLog" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"activityDate" timestamp NOT NULL,
	"quizzesTaken" integer DEFAULT 0,
	"questionsAnswered" integer DEFAULT 0,
	"pointsEarned" integer DEFAULT 0,
	"timeSpent" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "aiExplanationCache" (
	"questionId" integer PRIMARY KEY NOT NULL,
	"detailedExplanation" text NOT NULL,
	"audioUrl" text,
	"generatedAt" timestamp DEFAULT now() NOT NULL,
	"timesUsed" integer DEFAULT 1 NOT NULL,
	"lastUsedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdBy" integer NOT NULL,
	"targetType" varchar(20) NOT NULL,
	"targetId" integer,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"expiresAt" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditLog" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"entityType" varchar(50) NOT NULL,
	"entityId" integer,
	"changes" jsonb,
	"ipAddress" varchar(45),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boardGradeSubjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"boardId" integer NOT NULL,
	"gradeId" integer NOT NULL,
	"subjectId" integer NOT NULL,
	"isCompulsory" boolean DEFAULT true,
	"displayOrder" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"country" varchar(100) DEFAULT 'India',
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"displayOrder" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "boards_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignedBy" integer NOT NULL,
	"assignedTo" integer NOT NULL,
	"assignedToType" varchar(20) DEFAULT 'individual' NOT NULL,
	"groupId" integer,
	"moduleId" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text,
	"questionCount" integer DEFAULT 10 NOT NULL,
	"complexity" integer DEFAULT 5 NOT NULL,
	"focusArea" varchar(20) DEFAULT 'neutral' NOT NULL,
	"estimatedDuration" integer,
	"difficultyDistribution" jsonb,
	"selectedQuestionIds" text,
	"useComplexityBoundaries" boolean DEFAULT true NOT NULL,
	"startDate" timestamp,
	"dueDate" timestamp,
	"expiresAt" timestamp,
	"status" "challenge_status" DEFAULT 'pending' NOT NULL,
	"completedAt" timestamp,
	"sessionId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "childProfiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"parentId" integer NOT NULL,
	"currentGrade" integer NOT NULL,
	"board" "board" NOT NULL,
	"schoolName" varchar(200),
	"totalPoints" integer DEFAULT 0,
	"currentStreak" integer DEFAULT 0,
	"longestStreak" integer DEFAULT 0,
	"lastActivityDate" timestamp,
	"learningPreferences" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "childProfiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "gradeHistory" (
	"id" serial PRIMARY KEY NOT NULL,
	"childId" integer NOT NULL,
	"grade" integer NOT NULL,
	"board" "board" NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp,
	"academicYear" varchar(20),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" integer NOT NULL,
	"name" varchar(50) NOT NULL,
	"displayOrder" integer NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grades_level_unique" UNIQUE("level")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"fromUserId" integer NOT NULL,
	"toUserId" integer NOT NULL,
	"subject" varchar(200),
	"content" text NOT NULL,
	"messageType" varchar(20) DEFAULT 'direct' NOT NULL,
	"relatedEntityType" varchar(50),
	"relatedEntityId" integer,
	"isRead" boolean DEFAULT false NOT NULL,
	"readAt" timestamp,
	"sentAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"subjectId" integer NOT NULL,
	"boardId" integer,
	"gradeId" integer,
	"name" varchar(200) NOT NULL,
	"description" text,
	"parentModuleId" integer,
	"prerequisiteModuleIds" jsonb,
	"orderIndex" integer DEFAULT 0,
	"estimatedTime" integer,
	"difficulty" "difficulty" DEFAULT 'medium',
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parentProfiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"phone" varchar(20),
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100) DEFAULT 'India',
	"timezone" varchar(50) DEFAULT 'Asia/Kolkata',
	"preferredLanguage" varchar(10) DEFAULT 'en',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "parentProfiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "platformSettings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"valueType" varchar(20) DEFAULT 'string' NOT NULL,
	"description" text,
	"isPublic" boolean DEFAULT false NOT NULL,
	"updatedBy" integer,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qbAdminAssignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"boardId" integer,
	"gradeId" integer,
	"subjectId" integer,
	"canCreate" boolean DEFAULT true NOT NULL,
	"canEdit" boolean DEFAULT true NOT NULL,
	"canDelete" boolean DEFAULT false NOT NULL,
	"canApprove" boolean DEFAULT false NOT NULL,
	"assignedBy" integer NOT NULL,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionReports" (
	"id" serial PRIMARY KEY NOT NULL,
	"questionId" integer NOT NULL,
	"reportedBy" integer NOT NULL,
	"reportType" varchar(50) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"resolvedBy" integer,
	"resolvedAt" timestamp,
	"resolutionNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"board" varchar(50) NOT NULL,
	"grade" integer NOT NULL,
	"subject" varchar(100) NOT NULL,
	"topic" varchar(200) NOT NULL,
	"subTopic" varchar(200),
	"scope" varchar(20) DEFAULT 'School' NOT NULL,
	"questionType" varchar(50) NOT NULL,
	"questionText" text NOT NULL,
	"questionImage" varchar(500),
	"options" jsonb,
	"correctAnswer" text NOT NULL,
	"explanation" text,
	"difficulty" "difficulty" DEFAULT 'medium' NOT NULL,
	"points" integer DEFAULT 10,
	"timeLimit" integer DEFAULT 60,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"submittedBy" integer NOT NULL,
	"reviewedBy" integer,
	"reviewedAt" timestamp,
	"reviewNotes" text,
	"timesUsed" integer DEFAULT 0,
	"averageScore" numeric(5, 2),
	"reportCount" integer DEFAULT 0,
	"tags" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizResponses" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer NOT NULL,
	"questionId" integer NOT NULL,
	"userAnswer" text,
	"isCorrect" boolean NOT NULL,
	"pointsEarned" integer DEFAULT 0,
	"timeSpent" integer DEFAULT 0,
	"answeredAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizSessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"childId" integer NOT NULL,
	"moduleId" integer NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"totalQuestions" integer NOT NULL,
	"correctAnswers" integer DEFAULT 0,
	"wrongAnswers" integer DEFAULT 0,
	"skippedQuestions" integer DEFAULT 0,
	"totalPoints" integer DEFAULT 0,
	"timeTaken" integer DEFAULT 0,
	"scorePercentage" integer DEFAULT 0,
	"isCompleted" boolean DEFAULT false NOT NULL,
	"assignedBy" integer,
	"assignmentType" varchar(50),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studentGroupMembers" (
	"id" serial PRIMARY KEY NOT NULL,
	"groupId" integer NOT NULL,
	"childId" integer NOT NULL,
	"addedAt" timestamp DEFAULT now() NOT NULL,
	"addedBy" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studentGroups" (
	"id" serial PRIMARY KEY NOT NULL,
	"teacherId" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"board" "board" NOT NULL,
	"grade" integer NOT NULL,
	"subjectId" integer,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studentTopicPerformance" (
	"id" serial PRIMARY KEY NOT NULL,
	"childId" integer NOT NULL,
	"subject" varchar(100) NOT NULL,
	"topic" varchar(200) NOT NULL,
	"totalAttempts" integer DEFAULT 0 NOT NULL,
	"totalQuestions" integer DEFAULT 0 NOT NULL,
	"correctAnswers" integer DEFAULT 0 NOT NULL,
	"accuracyPercent" numeric(5, 2),
	"avgTimePerQuestion" integer,
	"easyCorrect" integer DEFAULT 0,
	"easyTotal" integer DEFAULT 0,
	"mediumCorrect" integer DEFAULT 0,
	"mediumTotal" integer DEFAULT 0,
	"hardCorrect" integer DEFAULT 0,
	"hardTotal" integer DEFAULT 0,
	"performanceLevel" varchar(20) NOT NULL,
	"confidenceScore" numeric(5, 2),
	"lastUpdated" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"description" text,
	"icon" varchar(100),
	"color" varchar(20),
	"category" varchar(20) DEFAULT 'core',
	"isActive" boolean DEFAULT true NOT NULL,
	"displayOrder" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "teacherProfiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"bio" text,
	"qualifications" text,
	"experience" integer,
	"specializations" jsonb,
	"phone" varchar(20),
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100) DEFAULT 'India',
	"isPublicProfile" boolean DEFAULT false,
	"hourlyRate" numeric(10, 2),
	"isVerified" boolean DEFAULT false,
	"verifiedAt" timestamp,
	"verifiedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "teacherProfiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "teacherStudentAssignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"teacherId" integer NOT NULL,
	"childId" integer NOT NULL,
	"parentId" integer NOT NULL,
	"board" "board" NOT NULL,
	"grade" integer NOT NULL,
	"subjectIds" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp,
	"assignmentNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userAchievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"achievementId" integer NOT NULL,
	"earnedAt" timestamp DEFAULT now() NOT NULL,
	"progress" integer DEFAULT 100
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64),
	"email" varchar(320),
	"name" text,
	"loginMethod" varchar(64),
	"role" "role" NOT NULL,
	"username" varchar(50),
	"passwordHash" varchar(255),
	"isActive" boolean DEFAULT true NOT NULL,
	"isEmailVerified" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_date" ON "activityLog" USING btree ("userId","activityDate");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_board_grade_subject" ON "boardGradeSubjects" USING btree ("boardId","gradeId","subjectId");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_group_child" ON "studentGroupMembers" USING btree ("groupId","childId");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_teacher_child" ON "teacherStudentAssignments" USING btree ("teacherId","childId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_achievement" ON "userAchievements" USING btree ("userId","achievementId");