CREATE TABLE `tool_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`toolType` enum('github','gitlab','bitbucket','slack','discord','teams','postgresql','mysql','mongodb','redis','aws_s3','gcp_storage','azure_blob','vercel','netlify','railway','heroku','docker_hub','openai','anthropic','google_ai','stripe','twilio','sendgrid','notion','linear','jira','figma','custom_api') NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`credentials` json,
	`config` json,
	`scopes` json,
	`status` enum('connected','disconnected','error','pending') NOT NULL DEFAULT 'pending',
	`lastSyncAt` timestamp,
	`errorMessage` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tool_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tts_providers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`provider` enum('google','elevenlabs','azure','amazon','openai') NOT NULL,
	`apiKey` varchar(500),
	`apiEndpoint` varchar(500),
	`config` json,
	`isDefault` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tts_providers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_biometrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`biometricType` enum('voice','face') NOT NULL,
	`dataUrl` varchar(500),
	`embedding` json,
	`metadata` json,
	`isVerified` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_biometrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`theme` enum('light','dark','system') NOT NULL DEFAULT 'system',
	`language` varchar(10) NOT NULL DEFAULT 'en',
	`timezone` varchar(100) NOT NULL DEFAULT 'UTC',
	`voiceEnabled` boolean NOT NULL DEFAULT true,
	`voiceLanguage` varchar(10) NOT NULL DEFAULT 'en',
	`ttsEnabled` boolean NOT NULL DEFAULT true,
	`ttsProviderId` int,
	`biometricLoginEnabled` boolean NOT NULL DEFAULT false,
	`notifications` json,
	`editorSettings` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_settings_userId_unique` UNIQUE(`userId`)
);
