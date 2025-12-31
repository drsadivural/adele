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
