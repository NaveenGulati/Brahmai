CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(100),
	`criteria` text,
	`points` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activityLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`activityDate` timestamp NOT NULL,
	`quizzesTaken` int DEFAULT 0,
	`questionsAnswered` int DEFAULT 0,
	`pointsEarned` int DEFAULT 0,
	`timeSpent` int DEFAULT 0,
	CONSTRAINT `activityLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`orderIndex` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `modules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moduleId` int NOT NULL,
	`questionType` enum('mcq','true_false','fill_blank','match','image_based') NOT NULL,
	`questionText` text NOT NULL,
	`questionImage` varchar(500),
	`options` json,
	`correctAnswer` text NOT NULL,
	`explanation` text,
	`difficulty` enum('easy','medium','hard','olympiad') NOT NULL DEFAULT 'medium',
	`points` int DEFAULT 10,
	`timeLimit` int DEFAULT 60,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`questionId` int NOT NULL,
	`userAnswer` text,
	`isCorrect` boolean NOT NULL,
	`pointsEarned` int DEFAULT 0,
	`timeSpent` int DEFAULT 0,
	`answeredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quizResponses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`moduleId` int NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`totalQuestions` int NOT NULL,
	`correctAnswers` int DEFAULT 0,
	`wrongAnswers` int DEFAULT 0,
	`skippedQuestions` int DEFAULT 0,
	`totalPoints` int DEFAULT 0,
	`timeTaken` int DEFAULT 0,
	`scorePercentage` int DEFAULT 0,
	`isCompleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `quizSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(20) NOT NULL,
	`description` text,
	`icon` varchar(100),
	`color` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `subjects_name_unique` UNIQUE(`name`),
	CONSTRAINT `subjects_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `userAchievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`achievementId` int NOT NULL,
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userAchievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','parent','child') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `parentId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `grade` int DEFAULT 7;--> statement-breakpoint
ALTER TABLE `users` ADD `totalPoints` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `currentStreak` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `longestStreak` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `lastActivityDate` timestamp;