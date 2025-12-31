import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { createAgentSystem, AgentTask } from "./agents";
import { invokeLLM } from "./_core/llm";

// Initialize the agent system
const agentSystem = createAgentSystem();

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ PROJECT ROUTES ============
  project: router({
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        appType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.createProject({
          userId: ctx.user.id,
          name: input.name,
          description: input.description || null,
          appType: input.appType || null,
          status: "draft",
        });
        
        if (!project) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create project" });
        }
        
        // Create initial system message
        await db.createMessage({
          projectId: project.id,
          role: "system",
          content: `Project "${project.name}" created. I'm ready to help you build your application. Describe what you want to create, and I'll coordinate our team of AI agents to build it for you.`,
        });
        
        return project;
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getProjectsByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.id);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        return project;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "generating", "completed", "deployed", "failed"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.id);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        const { id, ...updates } = input;
        await db.updateProject(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.id);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        await db.deleteProject(input.id);
        return { success: true };
      }),
  }),

  // ============ CHAT/MESSAGE ROUTES ============
  chat: router({
    getMessages: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        return db.getMessagesByProjectId(input.projectId);
      }),

    sendMessage: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }

        // Save user message
        await db.createMessage({
          projectId: input.projectId,
          role: "user",
          content: input.content,
        });

        // Update project status
        await db.updateProject(input.projectId, { status: "generating" });

        // Get conversation history for context
        const history = await db.getMessagesByProjectId(input.projectId);
        const contextMessages = history.slice(-10).map(m => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content
        }));

        // Create agent task
        const task: AgentTask = {
          id: `task_${Date.now()}`,
          type: "coordinator",
          description: input.content,
          input: {
            projectId: input.projectId,
            projectName: project.name,
            projectDescription: project.description,
            appType: project.appType,
            conversationHistory: contextMessages,
          },
          priority: 1,
        };

        // Execute with the coordinator agent
        const result = await agentSystem.execute(task);

        // Save agent messages
        for (const msg of result.messages) {
          await db.createMessage({
            projectId: input.projectId,
            role: msg.role as any,
            content: msg.content,
            agentName: msg.agentName,
            metadata: msg.metadata,
          });
        }

        // Save generated files
        if (result.artifacts?.files) {
          for (const file of result.artifacts.files) {
            await db.createGeneratedFile({
              projectId: input.projectId,
              filePath: file.path,
              fileName: file.path.split('/').pop() || 'unknown',
              fileType: file.path.split('.').pop() || 'txt',
              content: file.content,
              category: file.type as any || 'frontend',
            });
          }
        }

        // Generate a summary response
        const summaryPrompt = `Based on the following agent execution results, provide a brief, friendly summary for the user about what was accomplished:

${JSON.stringify(result.output, null, 2)}

Keep the response concise and highlight the key actions taken.`;

        const summaryResponse = await invokeLLM({
          messages: [
            { role: "system", content: "You are a helpful assistant summarizing development progress." },
            { role: "user", content: summaryPrompt }
          ]
        });

        const summaryContent = summaryResponse.choices[0]?.message?.content;
        const summary = typeof summaryContent === 'string' ? summaryContent : "Task completed successfully.";

        // Save assistant response
        const assistantMessage = await db.createMessage({
          projectId: input.projectId,
          role: "assistant",
          content: summary,
        });

        // Update project status
        await db.updateProject(input.projectId, { 
          status: result.success ? "completed" : "failed" 
        });

        return {
          success: result.success,
          message: assistantMessage,
          artifacts: result.artifacts,
        };
      }),
  }),

  // ============ GENERATED FILES ROUTES ============
  files: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        return db.getGeneratedFilesByProjectId(input.projectId);
      }),

    getContent: protectedProcedure
      .input(z.object({ projectId: z.number(), filePath: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        const file = await db.getGeneratedFileByPath(input.projectId, input.filePath);
        if (!file) {
          throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
        }
        
        return file;
      }),
  }),

  // ============ AGENT TASKS ROUTES ============
  tasks: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        return db.getAgentTasksByProjectId(input.projectId);
      }),
  }),

  // ============ FEEDBACK ROUTES ============
  feedback: router({
    submit: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        rating: z.number().min(1).max(5).optional(),
        feedbackType: z.enum(["code_quality", "ui_design", "functionality", "performance", "general"]),
        comment: z.string().optional(),
        context: z.object({
          agentType: z.string().optional(),
          fileId: z.number().optional(),
          taskId: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        await db.createFeedback({
          projectId: input.projectId,
          userId: ctx.user.id,
          rating: input.rating,
          feedbackType: input.feedbackType,
          comment: input.comment,
          context: input.context,
        });
        
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        return db.getFeedbackByProjectId(input.projectId);
      }),
  }),

  // ============ DEPLOYMENT ROUTES ============
  deployment: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        return db.getDeploymentsByProjectId(input.projectId);
      }),

    latest: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        return db.getLatestDeployment(input.projectId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        version: z.string(),
        config: z.object({
          environment: z.string().optional(),
          envVars: z.record(z.string(), z.string()).optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        const deployment = await db.createDeployment({
          projectId: input.projectId,
          version: input.version,
          status: "pending",
          config: input.config as any,
        });
        
        // In a real implementation, this would trigger a deployment pipeline
        // For now, we'll simulate a deployment
        if (deployment) {
          setTimeout(async () => {
            await db.updateDeployment(deployment.id, {
              status: "live",
              deploymentUrl: `https://app-${input.projectId}-${input.version}.appforge.dev`,
              completedAt: new Date(),
            });
            
            await db.updateProject(input.projectId, {
              status: "deployed",
              deploymentUrl: `https://app-${input.projectId}-${input.version}.appforge.dev`,
            });
          }, 3000);
        }
        
        return deployment;
      }),
  }),

  // ============ TEMPLATES ROUTES ============
  templates: router({
    list: publicProcedure.query(async () => {
      return db.getPublicTemplates();
    }),

    byCategory: publicProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ input }) => {
        return db.getTemplatesByCategory(input.category);
      }),
  }),
});

export type AppRouter = typeof appRouter;
