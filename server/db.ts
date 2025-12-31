import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  projects, InsertProject, Project,
  messages, InsertMessage, Message,
  agentTasks, InsertAgentTask, AgentTask,
  generatedFiles, InsertGeneratedFile, GeneratedFile,
  feedback, InsertFeedback,
  templates, InsertTemplate,
  deployments, InsertDeployment
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER QUERIES ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ PROJECT QUERIES ============

export async function createProject(project: InsertProject): Promise<Project | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(projects).values(project);
  const insertId = result[0].insertId;
  const created = await db.select().from(projects).where(eq(projects.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getProjectById(id: number): Promise<Project | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0] || null;
}

export async function getProjectsByUserId(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
}

export async function updateProject(id: number, updates: Partial<InsertProject>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(projects).set(updates).where(eq(projects.id, id));
}

export async function deleteProject(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(projects).where(eq(projects.id, id));
}

// ============ MESSAGE QUERIES ============

export async function createMessage(message: InsertMessage): Promise<Message | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(messages).values(message);
  const insertId = result[0].insertId;
  const created = await db.select().from(messages).where(eq(messages.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getMessagesByProjectId(projectId: number, limit = 100): Promise<Message[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(messages.createdAt)
    .limit(limit);
}

// ============ AGENT TASK QUERIES ============

export async function createAgentTask(task: InsertAgentTask): Promise<AgentTask | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(agentTasks).values(task);
  const insertId = result[0].insertId;
  const created = await db.select().from(agentTasks).where(eq(agentTasks.id, insertId)).limit(1);
  return created[0] || null;
}

export async function updateAgentTask(id: number, updates: Partial<InsertAgentTask>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(agentTasks).set(updates).where(eq(agentTasks.id, id));
}

export async function getAgentTasksByProjectId(projectId: number): Promise<AgentTask[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(agentTasks)
    .where(eq(agentTasks.projectId, projectId))
    .orderBy(desc(agentTasks.createdAt));
}

export async function getPendingAgentTasks(projectId: number): Promise<AgentTask[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(agentTasks)
    .where(and(eq(agentTasks.projectId, projectId), eq(agentTasks.status, "pending")))
    .orderBy(agentTasks.createdAt);
}

// ============ GENERATED FILES QUERIES ============

export async function createGeneratedFile(file: InsertGeneratedFile): Promise<GeneratedFile | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(generatedFiles).values(file);
  const insertId = result[0].insertId;
  const created = await db.select().from(generatedFiles).where(eq(generatedFiles.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getGeneratedFilesByProjectId(projectId: number): Promise<GeneratedFile[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(generatedFiles)
    .where(and(eq(generatedFiles.projectId, projectId), eq(generatedFiles.isActive, true)))
    .orderBy(generatedFiles.filePath);
}

export async function updateGeneratedFile(id: number, updates: Partial<InsertGeneratedFile>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(generatedFiles).set(updates).where(eq(generatedFiles.id, id));
}

export async function getGeneratedFileByPath(projectId: number, filePath: string): Promise<GeneratedFile | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(generatedFiles)
    .where(and(
      eq(generatedFiles.projectId, projectId), 
      eq(generatedFiles.filePath, filePath),
      eq(generatedFiles.isActive, true)
    ))
    .limit(1);
  return result[0] || null;
}

// ============ FEEDBACK QUERIES ============

export async function createFeedback(fb: InsertFeedback): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(feedback).values(fb);
}

export async function getFeedbackByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(feedback)
    .where(eq(feedback.projectId, projectId))
    .orderBy(desc(feedback.createdAt));
}

// ============ TEMPLATE QUERIES ============

export async function getPublicTemplates() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(templates)
    .where(eq(templates.isPublic, true))
    .orderBy(desc(templates.usageCount));
}

export async function getTemplatesByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(templates)
    .where(and(eq(templates.category, category as any), eq(templates.isPublic, true)))
    .orderBy(desc(templates.usageCount));
}

export async function incrementTemplateUsage(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(templates)
    .set({ usageCount: sql`${templates.usageCount} + 1` })
    .where(eq(templates.id, id));
}

// ============ DEPLOYMENT QUERIES ============

export async function createDeployment(deployment: InsertDeployment) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(deployments).values(deployment);
  const insertId = result[0].insertId;
  const created = await db.select().from(deployments).where(eq(deployments.id, insertId)).limit(1);
  return created[0] || null;
}

export async function updateDeployment(id: number, updates: Partial<InsertDeployment>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(deployments).set(updates).where(eq(deployments.id, id));
}

export async function getDeploymentsByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(deployments)
    .where(eq(deployments.projectId, projectId))
    .orderBy(desc(deployments.createdAt));
}

export async function getLatestDeployment(projectId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(deployments)
    .where(eq(deployments.projectId, projectId))
    .orderBy(desc(deployments.createdAt))
    .limit(1);
  return result[0] || null;
}
