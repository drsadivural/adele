CREATE TABLE `agent_performance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentType` enum('coordinator','research','coder','database','security','reporter','browser') NOT NULL,
	`metricDate` timestamp NOT NULL,
	`totalTasks` int NOT NULL DEFAULT 0,
	`successfulTasks` int NOT NULL DEFAULT 0,
	`failedTasks` int NOT NULL DEFAULT 0,
	`avgDurationMs` int,
	`avgTokensUsed` int,
	`errorTypes` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_performance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` varchar(100),
	`eventType` enum('page_view','project_created','project_deployed','template_used','agent_task_started','agent_task_completed','code_generated','voice_command','collaboration_started','file_downloaded','tool_connected','error_occurred','feedback_submitted','login','logout') NOT NULL,
	`eventData` json,
	`pageUrl` varchar(500),
	`referrer` varchar(500),
	`userAgent` varchar(500),
	`ipAddress` varchar(45),
	`country` varchar(100),
	`city` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`metricType` enum('daily_active_users','monthly_active_users','projects_created','projects_deployed','templates_used','agent_tasks_completed','code_lines_generated','voice_commands_processed','avg_session_duration','error_rate','deployment_success_rate') NOT NULL,
	`metricValue` int NOT NULL,
	`metricDate` timestamp NOT NULL,
	`dimensions` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mcp_servers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`serverType` enum('github','gitlab','slack','discord','postgresql','mysql','mongodb','redis','s3','gcs','filesystem','browser','custom') NOT NULL,
	`transportType` enum('stdio','sse','websocket') NOT NULL DEFAULT 'stdio',
	`command` varchar(500),
	`args` json,
	`url` varchar(500),
	`env` json,
	`capabilities` json,
	`status` enum('connected','disconnected','error','initializing') NOT NULL DEFAULT 'disconnected',
	`lastConnectedAt` timestamp,
	`errorMessage` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mcp_servers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mcp_tool_invocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`toolId` int NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`input` json,
	`output` json,
	`status` enum('pending','running','success','error') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`durationMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mcp_tool_invocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mcp_tools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serverId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`inputSchema` json,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`lastUsedAt` timestamp,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mcp_tools_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`metricDate` timestamp NOT NULL,
	`views` int NOT NULL DEFAULT 0,
	`uses` int NOT NULL DEFAULT 0,
	`completions` int NOT NULL DEFAULT 0,
	`avgRating` int,
	`feedbackCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_analytics_id` PRIMARY KEY(`id`)
);
