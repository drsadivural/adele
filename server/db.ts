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
  deployments, InsertDeployment,
  appTemplates, InsertAppTemplate, AppTemplate,
  projectVersions, InsertProjectVersion, ProjectVersion,
  collaborationSessions, InsertCollaborationSession, CollaborationSession,
  voiceCommands, InsertVoiceCommand, VoiceCommand,
  ttsProviders, InsertTtsProvider, TtsProvider,
  userBiometrics, InsertUserBiometric, UserBiometric,
  toolConnections, InsertToolConnection, ToolConnection,
  userSettings, InsertUserSetting, UserSetting
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

export async function incrementCodeTemplateUsage(id: number): Promise<void> {
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

// ============ APP TEMPLATE QUERIES ============

export async function getAppTemplates(): Promise<AppTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(appTemplates)
    .where(eq(appTemplates.isActive, true))
    .orderBy(desc(appTemplates.usageCount));
}

export async function getAppTemplateBySlug(slug: string): Promise<AppTemplate | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(appTemplates)
    .where(and(eq(appTemplates.slug, slug), eq(appTemplates.isActive, true)))
    .limit(1);
  return result[0] || null;
}

export async function getAppTemplatesByCategory(category: string): Promise<AppTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(appTemplates)
    .where(and(eq(appTemplates.category, category as any), eq(appTemplates.isActive, true)))
    .orderBy(desc(appTemplates.usageCount));
}

export async function incrementTemplateUsage(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(appTemplates)
    .set({ usageCount: sql`${appTemplates.usageCount} + 1` })
    .where(eq(appTemplates.id, id));
}

// ============ PROJECT VERSION QUERIES ============

export async function createProjectVersion(version: InsertProjectVersion): Promise<ProjectVersion | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(projectVersions).values(version);
  const insertId = result[0].insertId;
  const created = await db.select().from(projectVersions).where(eq(projectVersions.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getProjectVersions(projectId: number): Promise<ProjectVersion[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(projectVersions)
    .where(eq(projectVersions.projectId, projectId))
    .orderBy(desc(projectVersions.versionNumber));
}

export async function getProjectVersion(projectId: number, versionNumber: number): Promise<ProjectVersion | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(projectVersions)
    .where(and(
      eq(projectVersions.projectId, projectId),
      eq(projectVersions.versionNumber, versionNumber)
    ))
    .limit(1);
  return result[0] || null;
}

export async function getLatestProjectVersion(projectId: number): Promise<ProjectVersion | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(projectVersions)
    .where(eq(projectVersions.projectId, projectId))
    .orderBy(desc(projectVersions.versionNumber))
    .limit(1);
  return result[0] || null;
}

// ============ COLLABORATION SESSION QUERIES ============

export async function createCollaborationSession(session: InsertCollaborationSession): Promise<CollaborationSession | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(collaborationSessions).values(session);
  const insertId = result[0].insertId;
  const created = await db.select().from(collaborationSessions).where(eq(collaborationSessions.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getActiveCollaborators(projectId: number): Promise<CollaborationSession[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(collaborationSessions)
    .where(and(
      eq(collaborationSessions.projectId, projectId),
      eq(collaborationSessions.isActive, true)
    ));
}

export async function updateCollaboratorCursor(
  sessionId: string, 
  cursorPosition: { file?: string; line?: number; column?: number }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(collaborationSessions)
    .set({ cursorPosition, lastActivity: new Date() })
    .where(eq(collaborationSessions.sessionId, sessionId));
}

export async function endCollaborationSession(sessionId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(collaborationSessions)
    .set({ isActive: false })
    .where(eq(collaborationSessions.sessionId, sessionId));
}

// ============ VOICE COMMAND QUERIES ============

export async function createVoiceCommand(command: InsertVoiceCommand): Promise<VoiceCommand | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(voiceCommands).values(command);
  const insertId = result[0].insertId;
  const created = await db.select().from(voiceCommands).where(eq(voiceCommands.id, insertId)).limit(1);
  return created[0] || null;
}

export async function updateVoiceCommand(id: number, updates: Partial<InsertVoiceCommand>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(voiceCommands).set(updates).where(eq(voiceCommands.id, id));
}

export async function getVoiceCommandsByProject(projectId: number): Promise<VoiceCommand[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(voiceCommands)
    .where(eq(voiceCommands.projectId, projectId))
    .orderBy(desc(voiceCommands.createdAt));
}


// ============ TTS PROVIDER QUERIES ============

export async function createTtsProvider(provider: InsertTtsProvider): Promise<TtsProvider | null> {
  const db = await getDb();
  if (!db) return null;
  
  // If setting as default, unset other defaults
  if (provider.isDefault) {
    await db.update(ttsProviders).set({ isDefault: false });
  }
  
  const result = await db.insert(ttsProviders).values(provider);
  const insertId = result[0].insertId;
  const created = await db.select().from(ttsProviders).where(eq(ttsProviders.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getTtsProviders(userId?: number): Promise<TtsProvider[]> {
  const db = await getDb();
  if (!db) return [];
  
  if (userId) {
    return db.select().from(ttsProviders)
      .where(and(eq(ttsProviders.createdBy, userId), eq(ttsProviders.isActive, true)))
      .orderBy(desc(ttsProviders.isDefault));
  }
  
  return db.select().from(ttsProviders)
    .where(eq(ttsProviders.isActive, true))
    .orderBy(desc(ttsProviders.isDefault));
}

export async function getDefaultTtsProvider(): Promise<TtsProvider | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(ttsProviders)
    .where(and(eq(ttsProviders.isDefault, true), eq(ttsProviders.isActive, true)))
    .limit(1);
  return result[0] || null;
}

export async function updateTtsProvider(id: number, data: Partial<InsertTtsProvider>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  if (data.isDefault) {
    await db.update(ttsProviders).set({ isDefault: false });
  }
  
  await db.update(ttsProviders).set(data).where(eq(ttsProviders.id, id));
}

export async function deleteTtsProvider(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(ttsProviders).set({ isActive: false }).where(eq(ttsProviders.id, id));
}

// ============ USER BIOMETRIC QUERIES ============

export async function createUserBiometric(biometric: InsertUserBiometric): Promise<UserBiometric | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(userBiometrics).values(biometric);
  const insertId = result[0].insertId;
  const created = await db.select().from(userBiometrics).where(eq(userBiometrics.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getUserBiometrics(userId: number): Promise<UserBiometric[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(userBiometrics)
    .where(and(eq(userBiometrics.userId, userId), eq(userBiometrics.isActive, true)));
}

export async function getAllActiveBiometrics(type?: "voice" | "face"): Promise<UserBiometric[]> {
  const db = await getDb();
  if (!db) return [];
  
  if (type) {
    return db.select().from(userBiometrics)
      .where(and(eq(userBiometrics.biometricType, type), eq(userBiometrics.isActive, true)));
  }
  
  return db.select().from(userBiometrics).where(eq(userBiometrics.isActive, true));
}

export async function updateUserBiometric(id: number, data: Partial<InsertUserBiometric>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(userBiometrics).set(data).where(eq(userBiometrics.id, id));
}

export async function deleteUserBiometric(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(userBiometrics).set({ isActive: false }).where(eq(userBiometrics.id, id));
}

// ============ TOOL CONNECTION QUERIES ============

export async function createToolConnection(connection: InsertToolConnection): Promise<ToolConnection | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(toolConnections).values(connection);
  const insertId = result[0].insertId;
  const created = await db.select().from(toolConnections).where(eq(toolConnections.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getUserToolConnections(userId: number): Promise<ToolConnection[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(toolConnections)
    .where(and(eq(toolConnections.userId, userId), eq(toolConnections.isActive, true)))
    .orderBy(desc(toolConnections.updatedAt));
}

export async function getToolConnection(id: number): Promise<ToolConnection | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(toolConnections).where(eq(toolConnections.id, id)).limit(1);
  return result[0] || null;
}

export async function getToolConnectionByType(userId: number, toolType: string): Promise<ToolConnection | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(toolConnections)
    .where(and(
      eq(toolConnections.userId, userId),
      eq(toolConnections.toolType, toolType as any),
      eq(toolConnections.isActive, true)
    ))
    .limit(1);
  return result[0] || null;
}

export async function updateToolConnection(id: number, data: Partial<InsertToolConnection>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(toolConnections).set(data).where(eq(toolConnections.id, id));
}

export async function deleteToolConnection(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(toolConnections).set({ isActive: false }).where(eq(toolConnections.id, id));
}

// ============ USER SETTINGS QUERIES ============

export async function getUserSettings(userId: number): Promise<UserSetting | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return result[0] || null;
}

export async function upsertUserSettings(userId: number, settings: Partial<InsertUserSetting>): Promise<UserSetting | null> {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await getUserSettings(userId);
  
  if (existing) {
    await db.update(userSettings).set(settings).where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values({ userId, ...settings });
  }
  
  return getUserSettings(userId);
}

export async function updateUserSettings(userId: number, data: Partial<InsertUserSetting>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(userSettings).set(data).where(eq(userSettings.userId, userId));
}
