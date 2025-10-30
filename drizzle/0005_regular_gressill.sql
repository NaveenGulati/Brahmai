CREATE TABLE `aiExplanationCache` (
	`questionId` int NOT NULL,
	`detailedExplanation` text NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`timesUsed` int NOT NULL DEFAULT 1,
	`lastUsedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiExplanationCache_questionId` PRIMARY KEY(`questionId`)
);
