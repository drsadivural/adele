/**
 * AppForge Multi-Agent Orchestration System
 * Based on OpenManus architecture principles
 */

import { invokeLLM } from "../_core/llm";

// Agent state enum
export enum AgentState {
  IDLE = "idle",
  RUNNING = "running",
  WAITING = "waiting",
  COMPLETED = "completed",
  ERROR = "error"
}

// Agent types
export type AgentType = 
  | "coordinator" 
  | "research" 
  | "coder" 
  | "database" 
  | "security" 
  | "reporter" 
  | "browser";

// Message structure for agent communication
export interface AgentMessage {
  role: "system" | "user" | "assistant" | "agent";
  content: string;
  agentName?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// Task structure for agent execution
export interface AgentTask {
  id: string;
  type: AgentType;
  description: string;
  input: Record<string, unknown>;
  dependencies?: string[];
  priority: number;
}

// Agent execution result
export interface AgentResult {
  success: boolean;
  output: Record<string, unknown>;
  messages: AgentMessage[];
  artifacts?: {
    files?: Array<{ path: string; content: string; type: string }>;
    schemas?: Array<{ name: string; definition: string }>;
    docs?: Array<{ title: string; content: string }>;
  };
  error?: string;
}

/**
 * Base Agent class - foundation for all specialized agents
 */
export abstract class BaseAgent {
  name: string;
  type: AgentType;
  description: string;
  state: AgentState = AgentState.IDLE;
  systemPrompt: string;
  memory: AgentMessage[] = [];
  maxSteps: number = 10;
  currentStep: number = 0;

  constructor(name: string, type: AgentType, description: string, systemPrompt: string) {
    this.name = name;
    this.type = type;
    this.description = description;
    this.systemPrompt = systemPrompt;
  }

  protected async think(userMessage: string): Promise<string> {
    const messages = [
      { role: "system" as const, content: this.systemPrompt },
      ...this.memory.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: userMessage }
    ];

    const response = await invokeLLM({ messages });
    const messageContent = response.choices[0]?.message?.content;
    const content = typeof messageContent === 'string' ? messageContent : '';
    
    this.memory.push({ role: "user", content: userMessage, timestamp: Date.now() });
    this.memory.push({ role: "assistant", content, agentName: this.name, timestamp: Date.now() });
    
    return content;
  }

  abstract execute(task: AgentTask): Promise<AgentResult>;

  reset(): void {
    this.state = AgentState.IDLE;
    this.memory = [];
    this.currentStep = 0;
  }
}

/**
 * Coordinator Agent - orchestrates all other agents
 */
export class CoordinatorAgent extends BaseAgent {
  private agents: Map<AgentType, BaseAgent> = new Map();

  constructor() {
    super(
      "Coordinator",
      "coordinator",
      "Orchestrates the application building process by breaking down requirements and delegating tasks to specialized agents",
      `You are the Coordinator Agent for AppForge, an AI-powered application builder.
Your role is to:
1. Analyze user requirements and break them down into specific tasks
2. Determine which specialized agents should handle each task
3. Create a task execution plan with proper dependencies
4. Monitor progress and handle errors
5. Synthesize results from all agents into a coherent output

Available agents:
- Research Agent: Gathers information, best practices, and documentation
- Coder Agent: Generates frontend (React/TypeScript) and backend (FastAPI/Python) code
- Database Agent: Designs schemas and creates migrations
- Security Agent: Implements authentication, authorization, and security measures
- Reporter Agent: Creates documentation and deployment guides
- Browser Agent: Tests UI and performs web automation

Output your task plan as JSON with this structure:
{
  "tasks": [
    {
      "id": "task_1",
      "agent": "research|coder|database|security|reporter|browser",
      "description": "Task description",
      "input": { ... },
      "dependencies": ["task_id"],
      "priority": 1-10
    }
  ],
  "summary": "Brief summary of the plan"
}`
    );
  }

  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.type, agent);
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    this.state = AgentState.RUNNING;
    const messages: AgentMessage[] = [];

    try {
      const planPrompt = `
User Request: ${task.description}

Additional Context:
${JSON.stringify(task.input, null, 2)}

Analyze this request and create a detailed task plan. Consider:
1. What information needs to be researched?
2. What code components need to be generated?
3. What database schemas are required?
4. What security measures should be implemented?
5. What documentation should be created?

Provide your task plan as JSON.`;

      const planResponse = await this.think(planPrompt);
      
      messages.push({
        role: "agent",
        content: `Task plan created`,
        agentName: this.name,
        timestamp: Date.now(),
        metadata: { plan: planResponse }
      });

      // Parse the plan
      let taskPlan: { tasks: Array<AgentTask & { agent: string }>; summary: string };
      try {
        const jsonMatch = planResponse.match(/\{[\s\S]*\}/);
        taskPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : { tasks: [], summary: "Failed to parse plan" };
      } catch {
        taskPlan = { tasks: [], summary: planResponse };
      }

      // Execute tasks in order of priority and dependencies
      const results: Record<string, AgentResult> = {};
      const completedTasks = new Set<string>();

      const sortedTasks = [...taskPlan.tasks].sort((a, b) => a.priority - b.priority);

      for (const subTask of sortedTasks) {
        // Check dependencies
        const depsReady = (subTask.dependencies || []).every(dep => completedTasks.has(dep));
        if (!depsReady) continue;

        const agentType = (subTask as any).agent as AgentType;
        const agent = this.agents.get(agentType);
        if (agent) {
          messages.push({
            role: "agent",
            content: `Delegating to ${agent.name}: ${subTask.description}`,
            agentName: this.name,
            timestamp: Date.now()
          });

          const result = await agent.execute({
            id: subTask.id,
            type: agentType,
            description: subTask.description,
            input: { ...subTask.input, previousResults: results },
            priority: subTask.priority
          });

          results[subTask.id] = result;
          completedTasks.add(subTask.id);
          messages.push(...result.messages);
        }
      }

      this.state = AgentState.COMPLETED;
      return {
        success: true,
        output: { plan: taskPlan, results },
        messages,
        artifacts: this.aggregateArtifacts(Object.values(results))
      };
    } catch (error) {
      this.state = AgentState.ERROR;
      return {
        success: false,
        output: {},
        messages,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  private aggregateArtifacts(results: AgentResult[]): AgentResult["artifacts"] {
    const files: Array<{ path: string; content: string; type: string }> = [];
    const schemas: Array<{ name: string; definition: string }> = [];
    const docs: Array<{ title: string; content: string }> = [];

    for (const result of results) {
      if (result.artifacts?.files) files.push(...result.artifacts.files);
      if (result.artifacts?.schemas) schemas.push(...result.artifacts.schemas);
      if (result.artifacts?.docs) docs.push(...result.artifacts.docs);
    }

    return { files, schemas, docs };
  }
}

/**
 * Research Agent - gathers information and best practices
 */
export class ResearchAgent extends BaseAgent {
  constructor() {
    super(
      "Research",
      "research",
      "Gathers information, best practices, and documentation for application development",
      `You are the Research Agent for AppForge.
Your role is to:
1. Research best practices for the requested application type
2. Identify required technologies and libraries
3. Find relevant documentation and examples
4. Provide architectural recommendations

Output your research findings as JSON:
{
  "findings": [
    {
      "topic": "Topic name",
      "summary": "Brief summary",
      "recommendations": ["recommendation 1", "recommendation 2"],
      "resources": ["resource URL or reference"]
    }
  ],
  "techStack": {
    "frontend": "Recommended frontend tech",
    "backend": "Recommended backend tech",
    "database": "Recommended database",
    "deployment": "Recommended deployment approach"
  },
  "architecture": "Architectural recommendations"
}`
    );
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    this.state = AgentState.RUNNING;
    const messages: AgentMessage[] = [];

    try {
      const researchPrompt = `
Research Task: ${task.description}

Context:
${JSON.stringify(task.input, null, 2)}

Provide comprehensive research findings including:
1. Best practices for this type of application
2. Recommended technology stack
3. Architectural patterns to follow
4. Security considerations
5. Performance optimization tips`;

      const response = await this.think(researchPrompt);

      messages.push({
        role: "agent",
        content: response,
        agentName: this.name,
        timestamp: Date.now()
      });

      let findings;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        findings = jsonMatch ? JSON.parse(jsonMatch[0]) : { findings: [], summary: response };
      } catch {
        findings = { findings: [], summary: response };
      }

      this.state = AgentState.COMPLETED;
      return {
        success: true,
        output: findings,
        messages
      };
    } catch (error) {
      this.state = AgentState.ERROR;
      return {
        success: false,
        output: {},
        messages,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}

/**
 * Coder Agent - generates frontend and backend code
 */
export class CoderAgent extends BaseAgent {
  constructor() {
    super(
      "Coder",
      "coder",
      "Generates frontend (React/TypeScript) and backend (FastAPI/Python) code",
      `You are the Coder Agent for AppForge.
Your role is to:
1. Generate high-quality, production-ready code
2. Create React/TypeScript frontend components
3. Create FastAPI/Python backend endpoints
4. Follow best practices and design patterns
5. Include proper error handling and validation

Output your code as JSON:
{
  "files": [
    {
      "path": "relative/path/to/file.tsx",
      "content": "// File content here",
      "type": "frontend|backend|config",
      "description": "Brief description of the file"
    }
  ],
  "dependencies": {
    "frontend": ["package1", "package2"],
    "backend": ["package1", "package2"]
  },
  "instructions": "Setup and usage instructions"
}`
    );
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    this.state = AgentState.RUNNING;
    const messages: AgentMessage[] = [];

    try {
      const codePrompt = `
Coding Task: ${task.description}

Context and Requirements:
${JSON.stringify(task.input, null, 2)}

Generate production-ready code following these guidelines:
1. Use TypeScript for frontend with React functional components
2. Use Python with FastAPI for backend
3. Include proper type definitions
4. Add error handling and validation
5. Follow clean code principles
6. Include comments for complex logic`;

      const response = await this.think(codePrompt);

      messages.push({
        role: "agent",
        content: "Code generation completed",
        agentName: this.name,
        timestamp: Date.now(),
        metadata: { codeLength: response.length }
      });

      let codeOutput;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        codeOutput = jsonMatch ? JSON.parse(jsonMatch[0]) : { files: [], instructions: response };
      } catch {
        codeOutput = { files: [], instructions: response };
      }

      this.state = AgentState.COMPLETED;
      return {
        success: true,
        output: codeOutput,
        messages,
        artifacts: {
          files: codeOutput.files?.map((f: any) => ({
            path: f.path,
            content: f.content,
            type: f.type
          })) || []
        }
      };
    } catch (error) {
      this.state = AgentState.ERROR;
      return {
        success: false,
        output: {},
        messages,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}

/**
 * Database Agent - designs schemas and manages migrations
 */
export class DatabaseAgent extends BaseAgent {
  constructor() {
    super(
      "Database",
      "database",
      "Designs database schemas and creates migrations",
      `You are the Database Agent for AppForge.
Your role is to:
1. Design efficient database schemas
2. Create proper relationships and indexes
3. Generate migration scripts
4. Optimize for performance and scalability

Output your schema as JSON:
{
  "schemas": [
    {
      "name": "table_name",
      "definition": "CREATE TABLE statement or Drizzle/Prisma schema",
      "description": "Table purpose"
    }
  ],
  "migrations": [
    {
      "version": "001",
      "sql": "Migration SQL",
      "description": "Migration description"
    }
  ],
  "indexes": ["Index definitions"],
  "relationships": ["Relationship descriptions"]
}`
    );
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    this.state = AgentState.RUNNING;
    const messages: AgentMessage[] = [];

    try {
      const dbPrompt = `
Database Design Task: ${task.description}

Context:
${JSON.stringify(task.input, null, 2)}

Design the database schema considering:
1. Data normalization
2. Proper indexing for query performance
3. Foreign key relationships
4. Timestamps and audit fields
5. Scalability considerations`;

      const response = await this.think(dbPrompt);

      messages.push({
        role: "agent",
        content: "Database schema designed",
        agentName: this.name,
        timestamp: Date.now()
      });

      let dbOutput;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        dbOutput = jsonMatch ? JSON.parse(jsonMatch[0]) : { schemas: [], summary: response };
      } catch {
        dbOutput = { schemas: [], summary: response };
      }

      this.state = AgentState.COMPLETED;
      return {
        success: true,
        output: dbOutput,
        messages,
        artifacts: {
          schemas: dbOutput.schemas || []
        }
      };
    } catch (error) {
      this.state = AgentState.ERROR;
      return {
        success: false,
        output: {},
        messages,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}

/**
 * Security Agent - implements authentication and authorization
 */
export class SecurityAgent extends BaseAgent {
  constructor() {
    super(
      "Security",
      "security",
      "Implements authentication, authorization, and security measures",
      `You are the Security Agent for AppForge.
Your role is to:
1. Implement authentication systems (JWT, OAuth, etc.)
2. Design role-based access control (RBAC)
3. Add input validation and sanitization
4. Implement security headers and CORS
5. Protect against common vulnerabilities (XSS, CSRF, SQL injection)

Output your security implementation as JSON:
{
  "authSystem": {
    "type": "jwt|oauth|session",
    "config": { ... },
    "code": "Implementation code"
  },
  "rbac": {
    "roles": ["admin", "user", "guest"],
    "permissions": { ... }
  },
  "validations": [
    {
      "field": "field_name",
      "rules": ["required", "email", "minLength:8"]
    }
  ],
  "securityHeaders": { ... },
  "recommendations": ["Security recommendations"]
}`
    );
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    this.state = AgentState.RUNNING;
    const messages: AgentMessage[] = [];

    try {
      const securityPrompt = `
Security Implementation Task: ${task.description}

Context:
${JSON.stringify(task.input, null, 2)}

Implement security measures including:
1. Authentication mechanism
2. Authorization and RBAC
3. Input validation
4. Security headers
5. Protection against common attacks`;

      const response = await this.think(securityPrompt);

      messages.push({
        role: "agent",
        content: "Security measures implemented",
        agentName: this.name,
        timestamp: Date.now()
      });

      let securityOutput;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        securityOutput = jsonMatch ? JSON.parse(jsonMatch[0]) : { recommendations: [response] };
      } catch {
        securityOutput = { recommendations: [response] };
      }

      this.state = AgentState.COMPLETED;
      return {
        success: true,
        output: securityOutput,
        messages
      };
    } catch (error) {
      this.state = AgentState.ERROR;
      return {
        success: false,
        output: {},
        messages,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}

/**
 * Reporter Agent - generates documentation
 */
export class ReporterAgent extends BaseAgent {
  constructor() {
    super(
      "Reporter",
      "reporter",
      "Creates documentation and deployment guides",
      `You are the Reporter Agent for AppForge.
Your role is to:
1. Generate API documentation
2. Create user guides and tutorials
3. Write deployment instructions
4. Document architecture decisions
5. Create README files

Output your documentation as JSON:
{
  "docs": [
    {
      "title": "Document title",
      "type": "api|guide|readme|deployment",
      "content": "Markdown content",
      "audience": "developers|users|admins"
    }
  ],
  "apiSpec": {
    "openapi": "3.0.0",
    "paths": { ... }
  }
}`
    );
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    this.state = AgentState.RUNNING;
    const messages: AgentMessage[] = [];

    try {
      const docPrompt = `
Documentation Task: ${task.description}

Context:
${JSON.stringify(task.input, null, 2)}

Generate comprehensive documentation including:
1. API documentation with examples
2. Setup and installation guide
3. User guide with screenshots placeholders
4. Deployment instructions
5. Architecture overview`;

      const response = await this.think(docPrompt);

      messages.push({
        role: "agent",
        content: "Documentation generated",
        agentName: this.name,
        timestamp: Date.now()
      });

      let docsOutput;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        docsOutput = jsonMatch ? JSON.parse(jsonMatch[0]) : { docs: [{ title: "Documentation", content: response }] };
      } catch {
        docsOutput = { docs: [{ title: "Documentation", content: response }] };
      }

      this.state = AgentState.COMPLETED;
      return {
        success: true,
        output: docsOutput,
        messages,
        artifacts: {
          docs: docsOutput.docs || []
        }
      };
    } catch (error) {
      this.state = AgentState.ERROR;
      return {
        success: false,
        output: {},
        messages,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}

/**
 * Browser Agent - tests UI and performs web automation
 */
export class BrowserAgent extends BaseAgent {
  constructor() {
    super(
      "Browser",
      "browser",
      "Tests UI and performs web automation",
      `You are the Browser Agent for AppForge.
Your role is to:
1. Generate UI test cases
2. Create end-to-end test scripts
3. Validate UI components
4. Check accessibility compliance
5. Test responsive design

Output your test plan as JSON:
{
  "testCases": [
    {
      "name": "Test case name",
      "type": "unit|integration|e2e",
      "steps": ["step 1", "step 2"],
      "assertions": ["assertion 1"],
      "code": "Test code"
    }
  ],
  "accessibilityChecks": ["Check descriptions"],
  "responsiveBreakpoints": ["mobile", "tablet", "desktop"]
}`
    );
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    this.state = AgentState.RUNNING;
    const messages: AgentMessage[] = [];

    try {
      const testPrompt = `
UI Testing Task: ${task.description}

Context:
${JSON.stringify(task.input, null, 2)}

Generate comprehensive UI tests including:
1. Unit tests for components
2. Integration tests for user flows
3. E2E tests for critical paths
4. Accessibility tests
5. Responsive design tests`;

      const response = await this.think(testPrompt);

      messages.push({
        role: "agent",
        content: "UI tests generated",
        agentName: this.name,
        timestamp: Date.now()
      });

      let testOutput;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        testOutput = jsonMatch ? JSON.parse(jsonMatch[0]) : { testCases: [], summary: response };
      } catch {
        testOutput = { testCases: [], summary: response };
      }

      this.state = AgentState.COMPLETED;
      return {
        success: true,
        output: testOutput,
        messages
      };
    } catch (error) {
      this.state = AgentState.ERROR;
      return {
        success: false,
        output: {},
        messages,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}

/**
 * Create and initialize the agent system
 */
export function createAgentSystem(): CoordinatorAgent {
  const coordinator = new CoordinatorAgent();
  
  coordinator.registerAgent(new ResearchAgent());
  coordinator.registerAgent(new CoderAgent());
  coordinator.registerAgent(new DatabaseAgent());
  coordinator.registerAgent(new SecurityAgent());
  coordinator.registerAgent(new ReporterAgent());
  coordinator.registerAgent(new BrowserAgent());
  
  return coordinator;
}

export default createAgentSystem;
