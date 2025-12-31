import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  createProject: vi.fn(),
  getProjectById: vi.fn(),
  getProjectsByUserId: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  createMessage: vi.fn(),
  getMessagesByProjectId: vi.fn(),
  getGeneratedFilesByProjectId: vi.fn(),
  getGeneratedFileByPath: vi.fn(),
  getAgentTasksByProjectId: vi.fn(),
  createFeedback: vi.fn(),
  getFeedbackByProjectId: vi.fn(),
  getDeploymentsByProjectId: vi.fn(),
  getLatestDeployment: vi.fn(),
  createDeployment: vi.fn(),
  updateDeployment: vi.fn(),
  getPublicTemplates: vi.fn(),
  getTemplatesByCategory: vi.fn(),
}));

// Mock the agent system
vi.mock("./agents", () => ({
  createAgentSystem: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue({
      success: true,
      output: { plan: { tasks: [], summary: "Test completed" }, results: {} },
      messages: [{ role: "agent", content: "Task completed", agentName: "Coordinator", timestamp: Date.now() }],
      artifacts: { files: [], schemas: [], docs: [] }
    })
  }))
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Summary of work completed" } }]
  })
}));

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user-openid",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("project router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("project.create", () => {
    it("creates a new project for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const mockProject = {
        id: 1,
        userId: 1,
        name: "Test Project",
        description: "A test project",
        appType: "saas",
        status: "draft" as const,
        techStack: null,
        deploymentUrl: null,
        previewUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.createProject).mockResolvedValue(mockProject);
      vi.mocked(db.createMessage).mockResolvedValue({
        id: 1,
        projectId: 1,
        role: "system",
        content: "Welcome message",
        agentName: null,
        metadata: null,
        createdAt: new Date(),
      });

      const result = await caller.project.create({
        name: "Test Project",
        description: "A test project",
        appType: "saas",
      });

      expect(result).toEqual(mockProject);
      expect(db.createProject).toHaveBeenCalledWith({
        userId: 1,
        name: "Test Project",
        description: "A test project",
        appType: "saas",
        status: "draft",
      });
    });

    it("throws error for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.project.create({ name: "Test" })
      ).rejects.toThrow();
    });
  });

  describe("project.list", () => {
    it("returns projects for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const mockProjects = [
        {
          id: 1,
          userId: 1,
          name: "Project 1",
          description: null,
          appType: null,
          status: "draft" as const,
          techStack: null,
          deploymentUrl: null,
          previewUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(db.getProjectsByUserId).mockResolvedValue(mockProjects);

      const result = await caller.project.list();

      expect(result).toEqual(mockProjects);
      expect(db.getProjectsByUserId).toHaveBeenCalledWith(1);
    });
  });

  describe("project.get", () => {
    it("returns project for owner", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const mockProject = {
        id: 1,
        userId: 1,
        name: "Test Project",
        description: null,
        appType: null,
        status: "draft" as const,
        techStack: null,
        deploymentUrl: null,
        previewUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getProjectById).mockResolvedValue(mockProject);

      const result = await caller.project.get({ id: 1 });

      expect(result).toEqual(mockProject);
    });

    it("throws NOT_FOUND for non-owner", async () => {
      const ctx = createAuthContext(2); // Different user
      const caller = appRouter.createCaller(ctx);

      const mockProject = {
        id: 1,
        userId: 1, // Owned by user 1
        name: "Test Project",
        description: null,
        appType: null,
        status: "draft" as const,
        techStack: null,
        deploymentUrl: null,
        previewUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getProjectById).mockResolvedValue(mockProject);

      await expect(
        caller.project.get({ id: 1 })
      ).rejects.toThrow("Project not found");
    });
  });

  describe("project.delete", () => {
    it("deletes project for owner", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const mockProject = {
        id: 1,
        userId: 1,
        name: "Test Project",
        description: null,
        appType: null,
        status: "draft" as const,
        techStack: null,
        deploymentUrl: null,
        previewUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getProjectById).mockResolvedValue(mockProject);
      vi.mocked(db.deleteProject).mockResolvedValue();

      const result = await caller.project.delete({ id: 1 });

      expect(result).toEqual({ success: true });
      expect(db.deleteProject).toHaveBeenCalledWith(1);
    });
  });
});

describe("templates router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("templates.list", () => {
    it("returns public templates without auth", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const mockTemplates = [
        {
          id: 1,
          name: "SaaS Starter",
          description: "A SaaS starter template",
          category: "fullstack" as const,
          techStack: "react-fastapi",
          content: "template content",
          variables: ["appName"],
          usageCount: 100,
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(db.getPublicTemplates).mockResolvedValue(mockTemplates);

      const result = await caller.templates.list();

      expect(result).toEqual(mockTemplates);
    });
  });
});
