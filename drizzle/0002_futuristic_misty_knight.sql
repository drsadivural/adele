CREATE TABLE `app_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`category` enum('crm','ecommerce','dashboard','social','blog','portfolio','saas','marketplace','inventory','booking') NOT NULL,
	`thumbnail` varchar(500),
	`previewUrl` varchar(500),
	`techStack` json,
	`features` json,
	`files` json,
	`config` json,
	`usageCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_templates_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `collaboration_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`sessionId` varchar(100) NOT NULL,
	`cursorPosition` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastActivity` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collaboration_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`commitMessage` text,
	`snapshot` json,
	`diff` json,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `voice_commands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`transcription` text NOT NULL,
	`intent` varchar(100),
	`action` json,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`response` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `voice_commands_id` PRIMARY KEY(`id`)
);
