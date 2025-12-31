import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { createAgentSystem, AgentTask } from "./agents";
import { invokeLLM } from "./_core/llm";
import * as collaboration from "./collaboration";
import * as voiceControl from "./voiceControl";

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

    createFromTemplate: protectedProcedure
      .input(z.object({
        templateSlug: z.string(),
        name: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get template by slug
        const template = await db.getAppTemplateBySlug(input.templateSlug);
        if (!template) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
        }

        // Create project from template
        const projectName = input.name || `${template.name} Project`;
        const project = await db.createProject({
          userId: ctx.user.id,
          name: projectName,
          description: template.description || null,
          appType: template.category,
          status: "draft",
          techStack: template.techStack ? { ...template.techStack, deployment: 'docker' } : null,
        });

        if (!project) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create project" });
        }

        // Copy template files to project
        if (template.files && Array.isArray(template.files)) {
          for (const file of template.files) {
            await db.createGeneratedFile({
              projectId: project.id,
              filePath: file.path,
              fileName: file.path.split('/').pop() || 'unknown',
              fileType: file.type,
              content: file.content,
              category: 'frontend',
            });
          }
        }

        // Update template usage count
        await db.incrementTemplateUsage(template.id);

        // Create initial system message
        await db.createMessage({
          projectId: project.id,
          role: "system",
          content: `Project "${projectName}" created from the "${template.name}" template. The template includes: ${template.features?.join(', ') || 'various features'}. You can customize it further by describing what changes you'd like to make.`,
        });

        return project;
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

  // ============ COLLABORATION ROUTES ============
  collaboration: router({
    join: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        return collaboration.joinCollaboration(
          input.projectId,
          ctx.user.id,
          ctx.user.name || ctx.user.email || "Anonymous"
        );
      }),

    leave: protectedProcedure
      .input(z.object({ projectId: z.number(), sessionId: z.string() }))
      .mutation(async ({ input }) => {
        await collaboration.leaveCollaboration(input.projectId, input.sessionId);
        return { success: true };
      }),

    updateCursor: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sessionId: z.string(),
        cursorPosition: z.object({
          file: z.string().optional(),
          line: z.number().optional(),
          column: z.number().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await collaboration.updateCursorPosition(
          input.projectId,
          input.sessionId,
          input.cursorPosition
        );
        return { success: true };
      }),

    getCollaborators: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return collaboration.getActiveCollaborators(input.projectId);
      }),

    broadcastChat: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sessionId: z.string(),
        message: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        collaboration.broadcastChatMessage(
          input.projectId,
          input.sessionId,
          ctx.user.id,
          ctx.user.name || "Anonymous",
          input.message
        );
        return { success: true };
      }),
  }),

  // ============ VERSION CONTROL ROUTES ============
  version: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        return db.getProjectVersions(input.projectId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        commitMessage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        // Get current files
        const files = await db.getGeneratedFilesByProjectId(input.projectId);
        
        // Get latest version number
        const latestVersion = await db.getLatestProjectVersion(input.projectId);
        const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;
        
        // Create snapshot
        const snapshot = files.map(f => ({
          filePath: f.filePath,
          content: f.content,
          fileType: f.fileType,
        }));
        
        // Calculate diff (simplified)
        const diff = files.map(f => ({
          filePath: f.filePath,
          type: "modified" as const,
          additions: f.content.split('\n').length,
          deletions: 0,
        }));
        
        const version = await db.createProjectVersion({
          projectId: input.projectId,
          versionNumber: newVersionNumber,
          commitMessage: input.commitMessage || `Version ${newVersionNumber}`,
          snapshot,
          diff,
          createdBy: ctx.user.id,
        });
        
        return version;
      }),

    get: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        versionNumber: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        return db.getProjectVersion(input.projectId, input.versionNumber);
      }),

    rollback: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        versionNumber: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        const version = await db.getProjectVersion(input.projectId, input.versionNumber);
        if (!version || !version.snapshot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
        }
        
        // Deactivate current files
        const currentFiles = await db.getGeneratedFilesByProjectId(input.projectId);
        for (const file of currentFiles) {
          await db.updateGeneratedFile(file.id, { isActive: false });
        }
        
        // Restore files from snapshot
        for (const file of version.snapshot) {
          await db.createGeneratedFile({
            projectId: input.projectId,
            filePath: file.filePath,
            fileName: file.filePath.split('/').pop() || 'unknown',
            fileType: file.fileType,
            content: file.content,
            category: 'frontend',
            isActive: true,
          });
        }
        
        return { success: true, restoredVersion: input.versionNumber };
      }),
  }),

  // ============ VOICE CONTROL ROUTES ============
  voice: router({
    transcribe: protectedProcedure
      .input(z.object({
        audioUrl: z.string(),
        language: z.enum(["en", "ja"]).default("en"),
      }))
      .mutation(async ({ input }) => {
        return voiceControl.transcribeVoice(input.audioUrl, input.language);
      }),

    processCommand: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        transcription: z.string(),
        language: z.enum(["en", "ja"]).default("en"),
        currentFile: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }

        const result = await voiceControl.processVoiceCommand(
          input.transcription,
          {
            projectId: input.projectId,
            projectName: project.name,
            currentFile: input.currentFile,
            language: input.language,
          }
        );

        // Execute the action
        const execution = await voiceControl.executeVoiceAction(
          input.projectId,
          ctx.user.id,
          result
        );

        return {
          ...result,
          execution,
        };
      }),

    getProactiveSuggestions: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        language: z.enum(["en", "ja"]).default("en"),
      }))
      .query(async ({ input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }

        return voiceControl.getProactiveSuggestions({
          projectId: input.projectId,
          projectName: project.name,
          language: input.language,
        });
      }),

    getProactiveSpeech: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        trigger: z.enum(["idle", "completion", "error", "greeting"]),
        language: z.enum(["en", "ja"]).default("en"),
      }))
      .query(async ({ input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }

        return voiceControl.generateProactiveSpeech(
          {
            projectId: input.projectId,
            projectName: project.name,
            language: input.language,
          },
          input.trigger
        );
      }),
  }),

  // ============ TTS PROVIDER ROUTES ============
  tts: router({
    listProviders: protectedProcedure.query(async ({ ctx }) => {
      return db.getTtsProviders(ctx.user.id);
    }),

    getDefault: protectedProcedure.query(async () => {
      return db.getDefaultTtsProvider();
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        provider: z.enum(["google", "elevenlabs", "azure", "amazon", "openai"]),
        apiKey: z.string().optional(),
        apiEndpoint: z.string().optional(),
        config: z.object({
          voiceId: z.string().optional(),
          languageCode: z.string().optional(),
          speakingRate: z.number().optional(),
          pitch: z.number().optional(),
          model: z.string().optional(),
        }).optional(),
        isDefault: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createTtsProvider({
          ...input,
          createdBy: ctx.user.id,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        apiKey: z.string().optional(),
        apiEndpoint: z.string().optional(),
        config: z.object({
          voiceId: z.string().optional(),
          languageCode: z.string().optional(),
          speakingRate: z.number().optional(),
          pitch: z.number().optional(),
          model: z.string().optional(),
        }).optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTtsProvider(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTtsProvider(input.id);
        return { success: true };
      }),

    synthesize: protectedProcedure
      .input(z.object({
        text: z.string().min(1).max(5000),
        providerId: z.number().optional(),
        voiceId: z.string().optional(),
        languageCode: z.string().optional(),
        speakingRate: z.number().optional(),
        pitch: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { TTSService } = await import("./ttsService");
        
        let provider;
        if (input.providerId) {
          const providers = await db.getTtsProviders();
          provider = providers.find(p => p.id === input.providerId);
        } else {
          provider = await db.getDefaultTtsProvider();
        }
        
        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No TTS provider configured" });
        }
        
        const ttsService = new TTSService(provider);
        return ttsService.synthesize({
          text: input.text,
          voiceId: input.voiceId,
          languageCode: input.languageCode,
          speakingRate: input.speakingRate,
          pitch: input.pitch,
        });
      }),

    listVoices: protectedProcedure
      .input(z.object({ providerId: z.number() }))
      .query(async ({ input }) => {
        const { TTSService } = await import("./ttsService");
        const providers = await db.getTtsProviders();
        const provider = providers.find(p => p.id === input.providerId);
        
        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
        }
        
        const ttsService = new TTSService(provider);
        return ttsService.listVoices();
      }),

    getAvailableProviders: publicProcedure.query(async () => {
      const { TTS_PROVIDERS } = await import("./ttsService");
      return TTS_PROVIDERS;
    }),
  }),

  // ============ BIOMETRIC ROUTES ============
  biometric: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserBiometrics(ctx.user.id);
    }),

    registerVoice: protectedProcedure
      .input(z.object({
        audioData: z.string(), // Base64 encoded
        format: z.string().default("webm"),
        duration: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { biometricService } = await import("./biometricService");
        
        const audioBuffer = Buffer.from(input.audioData, "base64");
        const result = await biometricService.registerVoice(ctx.user.id, {
          audioData: audioBuffer,
          format: input.format,
          duration: input.duration,
        });
        
        const biometric = await db.createUserBiometric({
          userId: ctx.user.id,
          biometricType: "voice",
          dataUrl: result.url,
          embedding: result.embedding,
          metadata: {
            duration: input.duration,
            quality: result.quality,
            format: input.format,
          },
        });
        
        return biometric;
      }),

    registerFace: protectedProcedure
      .input(z.object({
        imageData: z.string(), // Base64 encoded
        format: z.string().default("jpeg"),
        width: z.number(),
        height: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { biometricService } = await import("./biometricService");
        
        const imageBuffer = Buffer.from(input.imageData, "base64");
        const result = await biometricService.registerFace(ctx.user.id, {
          imageData: imageBuffer,
          format: input.format,
          dimensions: { width: input.width, height: input.height },
        });
        
        if (!result.faceDetected) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No face detected in the image" });
        }
        
        const biometric = await db.createUserBiometric({
          userId: ctx.user.id,
          biometricType: "face",
          dataUrl: result.url,
          embedding: result.embedding,
          metadata: {
            quality: result.quality,
            format: input.format,
            dimensions: { width: input.width, height: input.height },
          },
        });
        
        return biometric;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const biometrics = await db.getUserBiometrics(ctx.user.id);
        const biometric = biometrics.find(b => b.id === input.id);
        
        if (!biometric) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Biometric not found" });
        }
        
        await db.deleteUserBiometric(input.id);
        return { success: true };
      }),

    verify: protectedProcedure
      .input(z.object({
        type: z.enum(["voice", "face"]),
        data: z.string(), // Base64 encoded
        format: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { biometricService } = await import("./biometricService");
        const allBiometrics = await db.getAllActiveBiometrics(input.type);
        
        const dataBuffer = Buffer.from(input.data, "base64");
        
        let match;
        if (input.type === "voice") {
          match = await biometricService.matchVoice(
            { audioData: dataBuffer, format: input.format, duration: 0 },
            allBiometrics
          );
        } else {
          match = await biometricService.matchFace(
            { imageData: dataBuffer, format: input.format, dimensions: { width: 0, height: 0 } },
            allBiometrics
          );
        }
        
        return {
          matched: match !== null,
          confidence: match?.confidence || 0,
          isCurrentUser: match?.userId === ctx.user.id,
        };
      }),
  }),

  // ============ TOOL CONNECTIONS ROUTES ============
  tools: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserToolConnections(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const connection = await db.getToolConnection(input.id);
        if (!connection || connection.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
        }
        return connection;
      }),

    create: protectedProcedure
      .input(z.object({
        toolType: z.enum([
          "github", "gitlab", "bitbucket", "slack", "discord", "teams",
          "postgresql", "mysql", "mongodb", "redis",
          "aws_s3", "gcp_storage", "azure_blob",
          "vercel", "netlify", "railway", "heroku", "docker_hub",
          "openai", "anthropic", "google_ai",
          "stripe", "twilio", "sendgrid",
          "notion", "linear", "jira", "figma",
          "custom_api"
        ]),
        name: z.string().min(1),
        description: z.string().optional(),
        credentials: z.object({
          apiKey: z.string().optional(),
          accessToken: z.string().optional(),
          refreshToken: z.string().optional(),
          clientId: z.string().optional(),
          clientSecret: z.string().optional(),
          webhookUrl: z.string().optional(),
          connectionString: z.string().optional(),
          host: z.string().optional(),
          port: z.number().optional(),
          username: z.string().optional(),
          password: z.string().optional(),
        }).optional(),
        config: z.object({
          baseUrl: z.string().optional(),
          organization: z.string().optional(),
          repository: z.string().optional(),
          workspace: z.string().optional(),
          channel: z.string().optional(),
          database: z.string().optional(),
          bucket: z.string().optional(),
          region: z.string().optional(),
          headers: z.record(z.string(), z.string()).optional(),
        }).optional(),
        scopes: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createToolConnection({
          ...input,
          userId: ctx.user.id,
          status: "pending",
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        credentials: z.object({
          apiKey: z.string().optional(),
          accessToken: z.string().optional(),
          refreshToken: z.string().optional(),
          clientId: z.string().optional(),
          clientSecret: z.string().optional(),
          webhookUrl: z.string().optional(),
          connectionString: z.string().optional(),
          host: z.string().optional(),
          port: z.number().optional(),
          username: z.string().optional(),
          password: z.string().optional(),
        }).optional(),
        config: z.object({
          baseUrl: z.string().optional(),
          organization: z.string().optional(),
          repository: z.string().optional(),
          workspace: z.string().optional(),
          channel: z.string().optional(),
          database: z.string().optional(),
          bucket: z.string().optional(),
          region: z.string().optional(),
          headers: z.record(z.string(), z.string()).optional(),
        }).optional(),
        scopes: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const connection = await db.getToolConnection(input.id);
        if (!connection || connection.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
        }
        
        const { id, ...data } = input;
        await db.updateToolConnection(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const connection = await db.getToolConnection(input.id);
        if (!connection || connection.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
        }
        
        await db.deleteToolConnection(input.id);
        return { success: true };
      }),

    test: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const connection = await db.getToolConnection(input.id);
        if (!connection || connection.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
        }
        
        // Test connection based on type
        try {
          let testResult = { success: false, message: "" };
          
          switch (connection.toolType) {
            case "github":
              // Test GitHub API
              const ghResponse = await fetch("https://api.github.com/user", {
                headers: {
                  Authorization: `Bearer ${(connection.credentials as any)?.accessToken}`,
                },
              });
              testResult = {
                success: ghResponse.ok,
                message: ghResponse.ok ? "GitHub connection successful" : "GitHub authentication failed",
              };
              break;
              
            case "openai":
              // Test OpenAI API
              const oaiResponse = await fetch("https://api.openai.com/v1/models", {
                headers: {
                  Authorization: `Bearer ${(connection.credentials as any)?.apiKey}`,
                },
              });
              testResult = {
                success: oaiResponse.ok,
                message: oaiResponse.ok ? "OpenAI connection successful" : "OpenAI authentication failed",
              };
              break;
              
            default:
              testResult = {
                success: true,
                message: "Connection saved (test not implemented for this type)",
              };
          }
          
          await db.updateToolConnection(input.id, {
            status: testResult.success ? "connected" : "error",
            errorMessage: testResult.success ? null : testResult.message,
            lastSyncAt: new Date(),
          });
          
          return testResult;
        } catch (error) {
          await db.updateToolConnection(input.id, {
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Connection test failed",
          });
          
          return {
            success: false,
            message: error instanceof Error ? error.message : "Connection test failed",
          };
        }
      }),

    getAvailableTools: publicProcedure.query(() => {
      return [
        // Version Control
        { id: "github", name: "GitHub", category: "version_control", icon: "github", description: "Connect your GitHub repositories" },
        { id: "gitlab", name: "GitLab", category: "version_control", icon: "gitlab", description: "Connect your GitLab repositories" },
        { id: "bitbucket", name: "Bitbucket", category: "version_control", icon: "bitbucket", description: "Connect your Bitbucket repositories" },
        
        // Communication
        { id: "slack", name: "Slack", category: "communication", icon: "slack", description: "Send notifications to Slack channels" },
        { id: "discord", name: "Discord", category: "communication", icon: "discord", description: "Send notifications to Discord servers" },
        { id: "teams", name: "Microsoft Teams", category: "communication", icon: "teams", description: "Integrate with Microsoft Teams" },
        
        // Databases
        { id: "postgresql", name: "PostgreSQL", category: "database", icon: "database", description: "Connect to PostgreSQL databases" },
        { id: "mysql", name: "MySQL", category: "database", icon: "database", description: "Connect to MySQL databases" },
        { id: "mongodb", name: "MongoDB", category: "database", icon: "database", description: "Connect to MongoDB databases" },
        { id: "redis", name: "Redis", category: "database", icon: "database", description: "Connect to Redis cache" },
        
        // Cloud Storage
        { id: "aws_s3", name: "AWS S3", category: "storage", icon: "cloud", description: "Store files in Amazon S3" },
        { id: "gcp_storage", name: "Google Cloud Storage", category: "storage", icon: "cloud", description: "Store files in Google Cloud" },
        { id: "azure_blob", name: "Azure Blob Storage", category: "storage", icon: "cloud", description: "Store files in Azure Blob" },
        
        // Deployment
        { id: "vercel", name: "Vercel", category: "deployment", icon: "rocket", description: "Deploy to Vercel" },
        { id: "netlify", name: "Netlify", category: "deployment", icon: "rocket", description: "Deploy to Netlify" },
        { id: "railway", name: "Railway", category: "deployment", icon: "rocket", description: "Deploy to Railway" },
        { id: "heroku", name: "Heroku", category: "deployment", icon: "rocket", description: "Deploy to Heroku" },
        { id: "docker_hub", name: "Docker Hub", category: "deployment", icon: "docker", description: "Push images to Docker Hub" },
        
        // AI Services
        { id: "openai", name: "OpenAI", category: "ai", icon: "sparkles", description: "Use OpenAI models" },
        { id: "anthropic", name: "Anthropic", category: "ai", icon: "sparkles", description: "Use Claude models" },
        { id: "google_ai", name: "Google AI", category: "ai", icon: "sparkles", description: "Use Google AI models" },
        
        // Business Tools
        { id: "stripe", name: "Stripe", category: "business", icon: "credit-card", description: "Process payments with Stripe" },
        { id: "twilio", name: "Twilio", category: "business", icon: "phone", description: "Send SMS and make calls" },
        { id: "sendgrid", name: "SendGrid", category: "business", icon: "mail", description: "Send transactional emails" },
        
        // Productivity
        { id: "notion", name: "Notion", category: "productivity", icon: "file-text", description: "Sync with Notion workspaces" },
        { id: "linear", name: "Linear", category: "productivity", icon: "check-square", description: "Manage issues in Linear" },
        { id: "jira", name: "Jira", category: "productivity", icon: "check-square", description: "Manage issues in Jira" },
        { id: "figma", name: "Figma", category: "design", icon: "figma", description: "Import designs from Figma" },
        
        // Custom
        { id: "custom_api", name: "Custom API", category: "custom", icon: "code", description: "Connect to any REST API" },
      ];
    }),
  }),

  // ============ MCP SERVER ROUTES ============
  mcp: router({
    listServers: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserMcpServers(ctx.user.id);
    }),

    getServer: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const server = await db.getMcpServer(input.id);
        if (!server || server.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Server not found" });
        }
        return server;
      }),

    createServer: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        serverType: z.enum(["github", "gitlab", "slack", "discord", "postgresql", "mysql", "mongodb", "redis", "s3", "gcs", "filesystem", "browser", "custom"]),
        transportType: z.enum(["stdio", "sse", "websocket"]).default("stdio"),
        command: z.string().optional(),
        args: z.array(z.string()).optional(),
        url: z.string().optional(),
        env: z.record(z.string(), z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createMcpServer({
          ...input,
          userId: ctx.user.id,
          status: "disconnected",
        });
      }),

    connectServer: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const server = await db.getMcpServer(input.id);
        if (!server || server.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Server not found" });
        }
        
        const { mcpManager } = await import("./mcpIntegration");
        
        try {
          await db.updateMcpServer(input.id, { status: "initializing" });
          
          const connection = await mcpManager.connect({
            id: server.id,
            name: server.name,
            serverType: server.serverType,
            transportType: server.transportType,
            command: server.command || undefined,
            args: server.args || undefined,
            url: server.url || undefined,
            env: server.env || undefined,
          });
          
          const tools = connection.getTools();
          
          // Save discovered tools
          for (const tool of tools) {
            await db.createMcpTool({
              serverId: server.id,
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema,
            });
          }
          
          await db.updateMcpServer(input.id, {
            status: "connected",
            lastConnectedAt: new Date(),
            capabilities: { tools: true, resources: false, prompts: false },
          });
          
          return { success: true, toolCount: tools.length };
        } catch (error) {
          await db.updateMcpServer(input.id, {
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Connection failed",
          });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to connect to MCP server" });
        }
      }),

    disconnectServer: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const server = await db.getMcpServer(input.id);
        if (!server || server.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Server not found" });
        }
        
        const { mcpManager } = await import("./mcpIntegration");
        await mcpManager.disconnect(input.id);
        
        await db.updateMcpServer(input.id, { status: "disconnected" });
        return { success: true };
      }),

    deleteServer: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const server = await db.getMcpServer(input.id);
        if (!server || server.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Server not found" });
        }
        
        await db.deleteMcpServer(input.id);
        return { success: true };
      }),

    listTools: protectedProcedure
      .input(z.object({ serverId: z.number() }))
      .query(async ({ ctx, input }) => {
        const server = await db.getMcpServer(input.serverId);
        if (!server || server.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Server not found" });
        }
        
        return db.getMcpToolsByServerId(input.serverId);
      }),

    invokeTool: protectedProcedure
      .input(z.object({
        toolId: z.number(),
        projectId: z.number().optional(),
        input: z.record(z.string(), z.unknown()),
      }))
      .mutation(async ({ ctx, input }) => {
        const tool = await db.getMcpTool(input.toolId);
        if (!tool) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tool not found" });
        }
        
        const server = await db.getMcpServer(tool.serverId);
        if (!server || server.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Server not found" });
        }
        
        const { mcpManager } = await import("./mcpIntegration");
        const connection = mcpManager.getConnection(server.id);
        
        if (!connection) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Server not connected" });
        }
        
        const startTime = Date.now();
        
        try {
          const result = await connection.callTool(tool.name, input.input);
          const durationMs = Date.now() - startTime;
          
          // Log the invocation
          await db.createMcpToolInvocation({
            toolId: tool.id,
            userId: ctx.user.id,
            projectId: input.projectId,
            input: input.input,
            output: result,
            status: result.isError ? "error" : "success",
            durationMs,
          });
          
          // Update tool usage count
          await db.incrementMcpToolUsage(tool.id);
          
          return result;
        } catch (error) {
          const durationMs = Date.now() - startTime;
          
          await db.createMcpToolInvocation({
            toolId: tool.id,
            userId: ctx.user.id,
            projectId: input.projectId,
            input: input.input,
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            durationMs,
          });
          
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Tool invocation failed" });
        }
      }),

    getAvailableServerTypes: publicProcedure.query(() => {
      return [
        { id: "github", name: "GitHub", description: "GitHub repository operations", icon: "github" },
        { id: "gitlab", name: "GitLab", description: "GitLab repository operations", icon: "gitlab" },
        { id: "slack", name: "Slack", description: "Slack messaging and channels", icon: "slack" },
        { id: "discord", name: "Discord", description: "Discord server operations", icon: "discord" },
        { id: "postgresql", name: "PostgreSQL", description: "PostgreSQL database operations", icon: "database" },
        { id: "mysql", name: "MySQL", description: "MySQL database operations", icon: "database" },
        { id: "mongodb", name: "MongoDB", description: "MongoDB database operations", icon: "database" },
        { id: "redis", name: "Redis", description: "Redis cache operations", icon: "database" },
        { id: "s3", name: "AWS S3", description: "S3 bucket operations", icon: "cloud" },
        { id: "gcs", name: "Google Cloud Storage", description: "GCS bucket operations", icon: "cloud" },
        { id: "filesystem", name: "Filesystem", description: "Local file operations", icon: "folder" },
        { id: "browser", name: "Browser", description: "Web browser automation", icon: "globe" },
        { id: "custom", name: "Custom", description: "Custom MCP server", icon: "code" },
      ];
    }),
  }),

  // ============ ANALYTICS ROUTES ============
  analytics: router({
    trackEvent: protectedProcedure
      .input(z.object({
        eventType: z.enum([
          "page_view", "project_created", "project_deployed", "template_used",
          "agent_task_started", "agent_task_completed", "code_generated",
          "voice_command", "collaboration_started", "file_downloaded",
          "tool_connected", "error_occurred", "feedback_submitted"
        ]),
        eventData: z.object({
          projectId: z.number().optional(),
          templateId: z.number().optional(),
          agentType: z.string().optional(),
          duration: z.number().optional(),
          success: z.boolean().optional(),
          errorType: z.string().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }).optional(),
        pageUrl: z.string().optional(),
        referrer: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createAnalyticsEvent({
          userId: ctx.user.id,
          eventType: input.eventType,
          eventData: input.eventData,
          pageUrl: input.pageUrl,
          referrer: input.referrer,
        });
      }),

    getDashboard: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        // Check if user is admin
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const startDate = input.startDate ? new Date(input.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = input.endDate ? new Date(input.endDate) : new Date();
        
        const [events, metrics, agentPerf, templateStats] = await Promise.all([
          db.getAnalyticsEvents(startDate, endDate),
          db.getAnalyticsMetrics(startDate, endDate),
          db.getAgentPerformanceMetrics(startDate, endDate),
          db.getTemplateAnalytics(startDate, endDate),
        ]);
        
        // Calculate summary stats
        const totalUsers = new Set(events.map(e => e.userId)).size;
        const totalProjects = events.filter(e => e.eventType === "project_created").length;
        const totalDeployments = events.filter(e => e.eventType === "project_deployed").length;
        const totalTemplateUses = events.filter(e => e.eventType === "template_used").length;
        
        return {
          summary: {
            totalUsers,
            totalProjects,
            totalDeployments,
            totalTemplateUses,
            dateRange: { start: startDate, end: endDate },
          },
          events,
          metrics,
          agentPerformance: agentPerf,
          templateStats,
        };
      }),

    getAgentPerformance: protectedProcedure
      .input(z.object({
        agentType: z.enum(["coordinator", "research", "coder", "database", "security", "reporter", "browser"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const startDate = input.startDate ? new Date(input.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = input.endDate ? new Date(input.endDate) : new Date();
        
        return db.getAgentPerformanceMetrics(startDate, endDate, input.agentType);
      }),

    getTemplateStats: protectedProcedure
      .input(z.object({
        templateId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const startDate = input.startDate ? new Date(input.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = input.endDate ? new Date(input.endDate) : new Date();
        
        return db.getTemplateAnalytics(startDate, endDate, input.templateId);
      }),

    exportReport: protectedProcedure
      .input(z.object({
        reportType: z.enum(["summary", "events", "agents", "templates"]),
        format: z.enum(["json", "csv"]),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const startDate = input.startDate ? new Date(input.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = input.endDate ? new Date(input.endDate) : new Date();
        
        let data;
        switch (input.reportType) {
          case "events":
            data = await db.getAnalyticsEvents(startDate, endDate);
            break;
          case "agents":
            data = await db.getAgentPerformanceMetrics(startDate, endDate);
            break;
          case "templates":
            data = await db.getTemplateAnalytics(startDate, endDate);
            break;
          default:
            data = await db.getAnalyticsMetrics(startDate, endDate);
        }
        
        if (input.format === "csv") {
          // Convert to CSV
          if (Array.isArray(data) && data.length > 0) {
            const headers = Object.keys(data[0]).join(",");
            const rows = data.map(row => Object.values(row).map(v => JSON.stringify(v)).join(","));
            return { content: [headers, ...rows].join("\n"), format: "csv" };
          }
          return { content: "", format: "csv" };
        }
        
        return { content: JSON.stringify(data, null, 2), format: "json" };
      }),
  }),

  // ============ USER SETTINGS ROUTES ============
  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const settings = await db.getUserSettings(ctx.user.id);
      if (!settings) {
        // Return default settings
        return {
          userId: ctx.user.id,
          theme: "system",
          language: "en",
          timezone: "UTC",
          voiceEnabled: true,
          voiceLanguage: "en",
          ttsEnabled: true,
          ttsProviderId: null,
          biometricLoginEnabled: false,
          notifications: {
            email: true,
            push: true,
            slack: false,
            projectUpdates: true,
            deploymentAlerts: true,
            collaborationInvites: true,
          },
          editorSettings: {
            fontSize: 14,
            tabSize: 2,
            wordWrap: true,
            minimap: true,
            lineNumbers: true,
            autoSave: true,
          },
        };
      }
      return settings;
    }),

    update: protectedProcedure
      .input(z.object({
        theme: z.enum(["light", "dark", "system"]).optional(),
        language: z.string().optional(),
        timezone: z.string().optional(),
        voiceEnabled: z.boolean().optional(),
        voiceLanguage: z.string().optional(),
        ttsEnabled: z.boolean().optional(),
        ttsProviderId: z.number().nullable().optional(),
        biometricLoginEnabled: z.boolean().optional(),
        notifications: z.object({
          email: z.boolean().optional(),
          push: z.boolean().optional(),
          slack: z.boolean().optional(),
          projectUpdates: z.boolean().optional(),
          deploymentAlerts: z.boolean().optional(),
          collaborationInvites: z.boolean().optional(),
        }).optional(),
        editorSettings: z.object({
          fontSize: z.number().optional(),
          tabSize: z.number().optional(),
          wordWrap: z.boolean().optional(),
          minimap: z.boolean().optional(),
          lineNumbers: z.boolean().optional(),
          autoSave: z.boolean().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.upsertUserSettings(ctx.user.id, input as any);
      }),
  }),
});

export type AppRouter = typeof appRouter;
