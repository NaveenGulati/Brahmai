ALTER TABLE `questions` ADD `board` enum('CBSE','ICSE','IB','State','Other') DEFAULT 'ICSE' NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `grade` int DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `subject` varchar(100);--> statement-breakpoint
ALTER TABLE `questions` ADD `topic` varchar(200);--> statement-breakpoint
ALTER TABLE `questions` ADD `subTopic` varchar(200);--> statement-breakpoint
ALTER TABLE `questions` ADD `scope` enum('School','Olympiad','Competitive','Advanced') DEFAULT 'School' NOT NULL;