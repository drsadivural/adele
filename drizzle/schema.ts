import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table - stores user's application projects
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "generating", "completed", "deployed", "failed"]).default("draft").notNull(),
  appType: varchar("appType", { length: 100 }), // e.g., "saas", "enterprise", "ecommerce"
  techStack: json("techStack").$type<{
    frontend: string;
    backend: string;
    database: string;
    deployment: string;
  }>(),
  deploymentUrl: varchar("deploymentUrl", { length: 500 }),
  previewUrl: varchar("previewUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Chat messages table - stores conversation history
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system", "agent"]).notNull(),
  content: text("content").notNull(),
  agentName: varchar("agentName", { length: 100 }), // Which agent sent this message
  metadata: json("metadata").$type<{
    tokens?: number;
    model?: string;
    duration?: number;
    attachments?: string[];
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Agent tasks table - tracks agent execution
 */
export const agentTasks = mysqlTable("agent_tasks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  agentType: mysqlEnum("agentType", [
    "coordinator",
    "research",
    "coder",
    "database",
    "security",
    "reporter",
    "browser"
  ]).notNull(),
  taskDescription: text("taskDescription").notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  input: json("input").$type<Record<string, unknown>>(),
  output: json("output").$type<Record<string, unknown>>(),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentTask = typeof agentTasks.$inferSelect;
export type InsertAgentTask = typeof agentTasks.$inferInsert;

/**
 * Generated files table - stores all generated code files
 */
export const generatedFiles = mysqlTable("generated_files", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  filePath: varchar("filePath", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(), // e.g., "tsx", "py", "sql", "json"
  content: text("content").notNull(),
  category: mysqlEnum("category", ["frontend", "backend", "database", "config", "docs"]).notNull(),
  version: int("version").default(1).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GeneratedFile = typeof generatedFiles.$inferSelect;
export type InsertGeneratedFile = typeof generatedFiles.$inferInsert;

/**
 * Feedback table - stores user feedback for auto-learning
 */
export const feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  rating: int("rating"), // 1-5 stars
  feedbackType: mysqlEnum("feedbackType", ["code_quality", "ui_design", "functionality", "performance", "general"]).notNull(),
  comment: text("comment"),
  context: json("context").$type<{
    agentType?: string;
    fileId?: number;
    taskId?: number;
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;

/**
 * Templates table - stores reusable code templates
 */
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["frontend", "backend", "database", "fullstack", "component"]).notNull(),
  techStack: varchar("techStack", { length: 100 }).notNull(),
  content: text("content").notNull(),
  variables: json("variables").$type<string[]>(), // Template variables to replace
  usageCount: int("usageCount").default(0).notNull(),
  isPublic: boolean("isPublic").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

/**
 * Deployments table - tracks deployment history
 */
export const deployments = mysqlTable("deployments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["pending", "building", "deploying", "live", "failed", "stopped"]).default("pending").notNull(),
  deploymentUrl: varchar("deploymentUrl", { length: 500 }),
  buildLogs: text("buildLogs"),
  errorMessage: text("errorMessage"),
  config: json("config").$type<{
    environment?: string;
    envVars?: Record<string, string>;
    resources?: { cpu?: string; memory?: string };
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Deployment = typeof deployments.$inferSelect;
export type InsertDeployment = typeof deployments.$inferInsert;

/**
 * Application templates table - pre-built app templates
 */
export const appTemplates = mysqlTable("app_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  category: mysqlEnum("category", ["crm", "ecommerce", "dashboard", "social", "blog", "portfolio", "saas", "marketplace", "inventory", "booking"]).notNull(),
  thumbnail: varchar("thumbnail", { length: 500 }),
  previewUrl: varchar("previewUrl", { length: 500 }),
  techStack: json("techStack").$type<{
    frontend: string;
    backend: string;
    database: string;
  }>(),
  features: json("features").$type<string[]>(),
  files: json("files").$type<Array<{
    path: string;
    content: string;
    type: string;
  }>>(),
  config: json("config").$type<{
    envVars?: string[];
    dependencies?: { frontend: string[]; backend: string[] };
  }>(),
  usageCount: int("usageCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppTemplate = typeof appTemplates.$inferSelect;
export type InsertAppTemplate = typeof appTemplates.$inferInsert;

/**
 * Project versions table - version control for projects
 */
export const projectVersions = mysqlTable("project_versions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  commitMessage: text("commitMessage"),
  snapshot: json("snapshot").$type<Array<{
    filePath: string;
    content: string;
    fileType: string;
  }>>(),
  diff: json("diff").$type<Array<{
    filePath: string;
    type: "added" | "modified" | "deleted";
    additions: number;
    deletions: number;
  }>>(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectVersion = typeof projectVersions.$inferSelect;
export type InsertProjectVersion = typeof projectVersions.$inferInsert;

/**
 * Collaboration sessions table - real-time collaboration
 */
export const collaborationSessions = mysqlTable("collaboration_sessions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  sessionId: varchar("sessionId", { length: 100 }).notNull(),
  cursorPosition: json("cursorPosition").$type<{
    file?: string;
    line?: number;
    column?: number;
  }>(),
  isActive: boolean("isActive").default(true).notNull(),
  lastActivity: timestamp("lastActivity").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CollaborationSession = typeof collaborationSessions.$inferSelect;
export type InsertCollaborationSession = typeof collaborationSessions.$inferInsert;

/**
 * Voice commands table - tracks voice interactions
 */
export const voiceCommands = mysqlTable("voice_commands", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  transcription: text("transcription").notNull(),
  intent: varchar("intent", { length: 100 }),
  action: json("action").$type<{
    type: string;
    params: Record<string, unknown>;
  }>(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  response: text("response"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VoiceCommand = typeof voiceCommands.$inferSelect;
export type InsertVoiceCommand = typeof voiceCommands.$inferInsert;


/**
 * TTS Provider Settings - configurable text-to-speech engines
 */
export const ttsProviders = mysqlTable("tts_providers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  provider: mysqlEnum("provider", ["google", "elevenlabs", "azure", "amazon", "openai"]).notNull(),
  apiKey: varchar("apiKey", { length: 500 }),
  apiEndpoint: varchar("apiEndpoint", { length: 500 }),
  config: json("config").$type<{
    voiceId?: string;
    languageCode?: string;
    speakingRate?: number;
    pitch?: number;
    volumeGainDb?: number;
    sampleRateHertz?: number;
    model?: string;
  }>(),
  isDefault: boolean("isDefault").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TtsProvider = typeof ttsProviders.$inferSelect;
export type InsertTtsProvider = typeof ttsProviders.$inferInsert;

/**
 * User Biometrics - voice and face registration
 */
export const userBiometrics = mysqlTable("user_biometrics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  biometricType: mysqlEnum("biometricType", ["voice", "face"]).notNull(),
  dataUrl: varchar("dataUrl", { length: 500 }), // S3 URL for voice sample or face photo
  embedding: json("embedding").$type<number[]>(), // Vector embedding for recognition
  metadata: json("metadata").$type<{
    duration?: number; // For voice samples
    quality?: number;
    format?: string;
    dimensions?: { width: number; height: number }; // For face photos
  }>(),
  isVerified: boolean("isVerified").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserBiometric = typeof userBiometrics.$inferSelect;
export type InsertUserBiometric = typeof userBiometrics.$inferInsert;

/**
 * Tool Connections - external service integrations
 */
export const toolConnections = mysqlTable("tool_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  toolType: mysqlEnum("toolType", [
    "github",
    "gitlab",
    "bitbucket",
    "slack",
    "discord",
    "teams",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "aws_s3",
    "gcp_storage",
    "azure_blob",
    "vercel",
    "netlify",
    "railway",
    "heroku",
    "docker_hub",
    "openai",
    "anthropic",
    "google_ai",
    "stripe",
    "twilio",
    "sendgrid",
    "notion",
    "linear",
    "jira",
    "figma",
    "custom_api"
  ]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  credentials: json("credentials").$type<{
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
    webhookUrl?: string;
    connectionString?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  }>(),
  config: json("config").$type<{
    baseUrl?: string;
    organization?: string;
    repository?: string;
    workspace?: string;
    channel?: string;
    database?: string;
    bucket?: string;
    region?: string;
    headers?: Record<string, string>;
  }>(),
  scopes: json("scopes").$type<string[]>(),
  status: mysqlEnum("status", ["connected", "disconnected", "error", "pending"]).default("pending").notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  errorMessage: text("errorMessage"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ToolConnection = typeof toolConnections.$inferSelect;
export type InsertToolConnection = typeof toolConnections.$inferInsert;

/**
 * User Settings - extended user preferences
 */
export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  theme: mysqlEnum("theme", ["light", "dark", "system"]).default("system").notNull(),
  language: varchar("language", { length: 10 }).default("en").notNull(),
  timezone: varchar("timezone", { length: 100 }).default("UTC").notNull(),
  voiceEnabled: boolean("voiceEnabled").default(true).notNull(),
  voiceLanguage: varchar("voiceLanguage", { length: 10 }).default("en").notNull(),
  ttsEnabled: boolean("ttsEnabled").default(true).notNull(),
  ttsProviderId: int("ttsProviderId"),
  biometricLoginEnabled: boolean("biometricLoginEnabled").default(false).notNull(),
  notifications: json("notifications").$type<{
    email: boolean;
    push: boolean;
    slack: boolean;
    projectUpdates: boolean;
    deploymentAlerts: boolean;
    collaborationInvites: boolean;
  }>(),
  editorSettings: json("editorSettings").$type<{
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
    lineNumbers: boolean;
    autoSave: boolean;
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSetting = typeof userSettings.$inferSelect;
export type InsertUserSetting = typeof userSettings.$inferInsert;


/**
 * MCP Servers - Model Context Protocol server configurations
 */
export const mcpServers = mysqlTable("mcp_servers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  serverType: mysqlEnum("serverType", [
    "github",
    "gitlab",
    "slack",
    "discord",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "s3",
    "gcs",
    "filesystem",
    "browser",
    "custom"
  ]).notNull(),
  transportType: mysqlEnum("transportType", ["stdio", "sse", "websocket"]).default("stdio").notNull(),
  command: varchar("command", { length: 500 }), // For stdio transport
  args: json("args").$type<string[]>(),
  url: varchar("url", { length: 500 }), // For SSE/WebSocket transport
  env: json("env").$type<Record<string, string>>(),
  capabilities: json("capabilities").$type<{
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
    sampling?: boolean;
  }>(),
  status: mysqlEnum("status", ["connected", "disconnected", "error", "initializing"]).default("disconnected").notNull(),
  lastConnectedAt: timestamp("lastConnectedAt"),
  errorMessage: text("errorMessage"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type McpServer = typeof mcpServers.$inferSelect;
export type InsertMcpServer = typeof mcpServers.$inferInsert;

/**
 * MCP Tools - discovered tools from MCP servers
 */
export const mcpTools = mysqlTable("mcp_tools", {
  id: int("id").autoincrement().primaryKey(),
  serverId: int("serverId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  inputSchema: json("inputSchema").$type<{
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  }>(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type McpTool = typeof mcpTools.$inferSelect;
export type InsertMcpTool = typeof mcpTools.$inferInsert;

/**
 * MCP Tool Invocations - log of tool calls
 */
export const mcpToolInvocations = mysqlTable("mcp_tool_invocations", {
  id: int("id").autoincrement().primaryKey(),
  toolId: int("toolId").notNull(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  input: json("input").$type<Record<string, unknown>>(),
  output: json("output").$type<unknown>(),
  status: mysqlEnum("status", ["pending", "running", "success", "error"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  durationMs: int("durationMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type McpToolInvocation = typeof mcpToolInvocations.$inferSelect;
export type InsertMcpToolInvocation = typeof mcpToolInvocations.$inferInsert;

/**
 * Analytics Events - tracks all user events for analytics
 */
export const analyticsEvents = mysqlTable("analytics_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  sessionId: varchar("sessionId", { length: 100 }),
  eventType: mysqlEnum("eventType", [
    "page_view",
    "project_created",
    "project_deployed",
    "template_used",
    "agent_task_started",
    "agent_task_completed",
    "code_generated",
    "voice_command",
    "collaboration_started",
    "file_downloaded",
    "tool_connected",
    "error_occurred",
    "feedback_submitted",
    "login",
    "logout"
  ]).notNull(),
  eventData: json("eventData").$type<{
    projectId?: number;
    templateId?: number;
    agentType?: string;
    duration?: number;
    success?: boolean;
    errorType?: string;
    metadata?: Record<string, unknown>;
  }>(),
  pageUrl: varchar("pageUrl", { length: 500 }),
  referrer: varchar("referrer", { length: 500 }),
  userAgent: varchar("userAgent", { length: 500 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

/**
 * Analytics Metrics - aggregated metrics for dashboard
 */
export const analyticsMetrics = mysqlTable("analytics_metrics", {
  id: int("id").autoincrement().primaryKey(),
  metricType: mysqlEnum("metricType", [
    "daily_active_users",
    "monthly_active_users",
    "projects_created",
    "projects_deployed",
    "templates_used",
    "agent_tasks_completed",
    "code_lines_generated",
    "voice_commands_processed",
    "avg_session_duration",
    "error_rate",
    "deployment_success_rate"
  ]).notNull(),
  metricValue: int("metricValue").notNull(),
  metricDate: timestamp("metricDate").notNull(),
  dimensions: json("dimensions").$type<{
    templateId?: number;
    agentType?: string;
    appType?: string;
    country?: string;
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type InsertAnalyticsMetric = typeof analyticsMetrics.$inferInsert;

/**
 * Agent Performance - tracks agent execution metrics
 */
export const agentPerformance = mysqlTable("agent_performance", {
  id: int("id").autoincrement().primaryKey(),
  agentType: mysqlEnum("agentType", [
    "coordinator",
    "research",
    "coder",
    "database",
    "security",
    "reporter",
    "browser"
  ]).notNull(),
  metricDate: timestamp("metricDate").notNull(),
  totalTasks: int("totalTasks").default(0).notNull(),
  successfulTasks: int("successfulTasks").default(0).notNull(),
  failedTasks: int("failedTasks").default(0).notNull(),
  avgDurationMs: int("avgDurationMs"),
  avgTokensUsed: int("avgTokensUsed"),
  errorTypes: json("errorTypes").$type<Record<string, number>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentPerformanceMetric = typeof agentPerformance.$inferSelect;
export type InsertAgentPerformanceMetric = typeof agentPerformance.$inferInsert;

/**
 * Template Analytics - tracks template usage and popularity
 */
export const templateAnalytics = mysqlTable("template_analytics", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  metricDate: timestamp("metricDate").notNull(),
  views: int("views").default(0).notNull(),
  uses: int("uses").default(0).notNull(),
  completions: int("completions").default(0).notNull(),
  avgRating: int("avgRating"),
  feedbackCount: int("feedbackCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TemplateAnalytic = typeof templateAnalytics.$inferSelect;
export type InsertTemplateAnalytic = typeof templateAnalytics.$inferInsert;
