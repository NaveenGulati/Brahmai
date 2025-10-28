CREATE TABLE `challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`childId` int NOT NULL,
	`moduleId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`message` text,
	`status` enum('pending','completed','expired') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`expiresAt` timestamp,
	`sessionId` int,
	CONSTRAINT `challenges_id` PRIMARY KEY(`id`)
);
