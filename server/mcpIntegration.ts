/**
 * MCP (Model Context Protocol) Server Integration
 * Enables ADELE to connect to external tools and services via MCP protocol
 */

import { invokeLLM } from "./_core/llm";

// MCP Protocol Types
export interface McpServerConfig {
  id: number;
  name: string;
  serverType: string;
  transportType: "stdio" | "sse" | "websocket";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
    sampling?: boolean;
  };
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface McpToolResult {
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  }>;
  isError?: boolean;
}

// MCP Server Manager
export class McpServerManager {
  private servers: Map<number, McpServerConnection> = new Map();

  async connect(config: McpServerConfig): Promise<McpServerConnection> {
    const connection = new McpServerConnection(config);
    await connection.initialize();
    this.servers.set(config.id, connection);
    return connection;
  }

  async disconnect(serverId: number): Promise<void> {
    const connection = this.servers.get(serverId);
    if (connection) {
      await connection.close();
      this.servers.delete(serverId);
    }
  }

  getConnection(serverId: number): McpServerConnection | undefined {
    return this.servers.get(serverId);
  }

  getAllConnections(): McpServerConnection[] {
    return Array.from(this.servers.values());
  }
}

// MCP Server Connection
export class McpServerConnection {
  private config: McpServerConfig;
  private tools: McpTool[] = [];
  private resources: McpResource[] = [];
  private prompts: McpPrompt[] = [];
  private isConnected: boolean = false;

  constructor(config: McpServerConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Simulate MCP server initialization
    // In production, this would establish actual connection via stdio/sse/websocket
    
    // Discover available tools based on server type
    this.tools = await this.discoverTools();
    this.resources = await this.discoverResources();
    this.prompts = await this.discoverPrompts();
    this.isConnected = true;
  }

  private async discoverTools(): Promise<McpTool[]> {
    // Return tools based on server type
    const toolsByType: Record<string, McpTool[]> = {
      github: [
        {
          name: "github_create_repository",
          description: "Create a new GitHub repository",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Repository name" },
              description: { type: "string", description: "Repository description" },
              private: { type: "boolean", description: "Whether the repository is private" },
              auto_init: { type: "boolean", description: "Initialize with README" }
            },
            required: ["name"]
          }
        },
        {
          name: "github_create_issue",
          description: "Create a new issue in a repository",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              title: { type: "string", description: "Issue title" },
              body: { type: "string", description: "Issue body" },
              labels: { type: "array", items: { type: "string" }, description: "Issue labels" }
            },
            required: ["owner", "repo", "title"]
          }
        },
        {
          name: "github_create_pull_request",
          description: "Create a pull request",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string" },
              repo: { type: "string" },
              title: { type: "string" },
              body: { type: "string" },
              head: { type: "string", description: "Branch to merge from" },
              base: { type: "string", description: "Branch to merge into" }
            },
            required: ["owner", "repo", "title", "head", "base"]
          }
        },
        {
          name: "github_push_files",
          description: "Push files to a repository",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string" },
              repo: { type: "string" },
              branch: { type: "string" },
              files: { type: "array", items: { type: "object" } },
              message: { type: "string", description: "Commit message" }
            },
            required: ["owner", "repo", "files", "message"]
          }
        },
        {
          name: "github_search_repositories",
          description: "Search for repositories",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              sort: { type: "string", enum: ["stars", "forks", "updated"] },
              order: { type: "string", enum: ["asc", "desc"] }
            },
            required: ["query"]
          }
        }
      ],
      slack: [
        {
          name: "slack_send_message",
          description: "Send a message to a Slack channel",
          inputSchema: {
            type: "object",
            properties: {
              channel: { type: "string", description: "Channel ID or name" },
              text: { type: "string", description: "Message text" },
              blocks: { type: "array", description: "Block Kit blocks" }
            },
            required: ["channel", "text"]
          }
        },
        {
          name: "slack_list_channels",
          description: "List all channels in workspace",
          inputSchema: {
            type: "object",
            properties: {
              types: { type: "string", description: "Channel types to include" },
              limit: { type: "number", description: "Maximum results" }
            }
          }
        },
        {
          name: "slack_create_channel",
          description: "Create a new Slack channel",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Channel name" },
              is_private: { type: "boolean", description: "Whether channel is private" }
            },
            required: ["name"]
          }
        },
        {
          name: "slack_upload_file",
          description: "Upload a file to Slack",
          inputSchema: {
            type: "object",
            properties: {
              channels: { type: "string", description: "Comma-separated channel IDs" },
              content: { type: "string", description: "File content" },
              filename: { type: "string", description: "Filename" },
              title: { type: "string", description: "File title" }
            },
            required: ["channels", "content", "filename"]
          }
        }
      ],
      postgresql: [
        {
          name: "postgres_query",
          description: "Execute a SQL query",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "SQL query to execute" },
              params: { type: "array", description: "Query parameters" }
            },
            required: ["query"]
          }
        },
        {
          name: "postgres_list_tables",
          description: "List all tables in the database",
          inputSchema: {
            type: "object",
            properties: {
              schema: { type: "string", description: "Schema name", default: "public" }
            }
          }
        },
        {
          name: "postgres_describe_table",
          description: "Get table schema information",
          inputSchema: {
            type: "object",
            properties: {
              table: { type: "string", description: "Table name" },
              schema: { type: "string", description: "Schema name" }
            },
            required: ["table"]
          }
        },
        {
          name: "postgres_create_table",
          description: "Create a new table",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Table name" },
              columns: { type: "array", description: "Column definitions" }
            },
            required: ["name", "columns"]
          }
        }
      ],
      mysql: [
        {
          name: "mysql_query",
          description: "Execute a MySQL query",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "SQL query to execute" },
              params: { type: "array", description: "Query parameters" }
            },
            required: ["query"]
          }
        },
        {
          name: "mysql_list_tables",
          description: "List all tables in the database",
          inputSchema: {
            type: "object",
            properties: {
              database: { type: "string", description: "Database name" }
            }
          }
        }
      ],
      mongodb: [
        {
          name: "mongodb_find",
          description: "Find documents in a collection",
          inputSchema: {
            type: "object",
            properties: {
              collection: { type: "string", description: "Collection name" },
              filter: { type: "object", description: "Query filter" },
              projection: { type: "object", description: "Fields to return" },
              limit: { type: "number", description: "Maximum documents" }
            },
            required: ["collection"]
          }
        },
        {
          name: "mongodb_insert",
          description: "Insert documents into a collection",
          inputSchema: {
            type: "object",
            properties: {
              collection: { type: "string", description: "Collection name" },
              documents: { type: "array", description: "Documents to insert" }
            },
            required: ["collection", "documents"]
          }
        },
        {
          name: "mongodb_update",
          description: "Update documents in a collection",
          inputSchema: {
            type: "object",
            properties: {
              collection: { type: "string", description: "Collection name" },
              filter: { type: "object", description: "Query filter" },
              update: { type: "object", description: "Update operations" }
            },
            required: ["collection", "filter", "update"]
          }
        },
        {
          name: "mongodb_aggregate",
          description: "Run an aggregation pipeline",
          inputSchema: {
            type: "object",
            properties: {
              collection: { type: "string", description: "Collection name" },
              pipeline: { type: "array", description: "Aggregation stages" }
            },
            required: ["collection", "pipeline"]
          }
        }
      ],
      s3: [
        {
          name: "s3_list_buckets",
          description: "List all S3 buckets",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "s3_list_objects",
          description: "List objects in a bucket",
          inputSchema: {
            type: "object",
            properties: {
              bucket: { type: "string", description: "Bucket name" },
              prefix: { type: "string", description: "Object prefix" },
              max_keys: { type: "number", description: "Maximum objects" }
            },
            required: ["bucket"]
          }
        },
        {
          name: "s3_get_object",
          description: "Get an object from S3",
          inputSchema: {
            type: "object",
            properties: {
              bucket: { type: "string", description: "Bucket name" },
              key: { type: "string", description: "Object key" }
            },
            required: ["bucket", "key"]
          }
        },
        {
          name: "s3_put_object",
          description: "Upload an object to S3",
          inputSchema: {
            type: "object",
            properties: {
              bucket: { type: "string", description: "Bucket name" },
              key: { type: "string", description: "Object key" },
              body: { type: "string", description: "Object content" },
              content_type: { type: "string", description: "Content type" }
            },
            required: ["bucket", "key", "body"]
          }
        }
      ],
      discord: [
        {
          name: "discord_send_message",
          description: "Send a message to a Discord channel",
          inputSchema: {
            type: "object",
            properties: {
              channel_id: { type: "string", description: "Channel ID" },
              content: { type: "string", description: "Message content" },
              embeds: { type: "array", description: "Message embeds" }
            },
            required: ["channel_id", "content"]
          }
        },
        {
          name: "discord_list_channels",
          description: "List channels in a guild",
          inputSchema: {
            type: "object",
            properties: {
              guild_id: { type: "string", description: "Guild ID" }
            },
            required: ["guild_id"]
          }
        }
      ],
      browser: [
        {
          name: "browser_navigate",
          description: "Navigate to a URL",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string", description: "URL to navigate to" }
            },
            required: ["url"]
          }
        },
        {
          name: "browser_screenshot",
          description: "Take a screenshot of the current page",
          inputSchema: {
            type: "object",
            properties: {
              selector: { type: "string", description: "CSS selector for element" },
              full_page: { type: "boolean", description: "Capture full page" }
            }
          }
        },
        {
          name: "browser_click",
          description: "Click an element on the page",
          inputSchema: {
            type: "object",
            properties: {
              selector: { type: "string", description: "CSS selector" }
            },
            required: ["selector"]
          }
        },
        {
          name: "browser_fill",
          description: "Fill an input field",
          inputSchema: {
            type: "object",
            properties: {
              selector: { type: "string", description: "CSS selector" },
              value: { type: "string", description: "Value to fill" }
            },
            required: ["selector", "value"]
          }
        }
      ],
      filesystem: [
        {
          name: "fs_read_file",
          description: "Read a file from the filesystem",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path" }
            },
            required: ["path"]
          }
        },
        {
          name: "fs_write_file",
          description: "Write content to a file",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path" },
              content: { type: "string", description: "File content" }
            },
            required: ["path", "content"]
          }
        },
        {
          name: "fs_list_directory",
          description: "List contents of a directory",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Directory path" }
            },
            required: ["path"]
          }
        }
      ],
      custom: []
    };

    return toolsByType[this.config.serverType] || [];
  }

  private async discoverResources(): Promise<McpResource[]> {
    // Resources are server-specific data sources
    return [];
  }

  private async discoverPrompts(): Promise<McpPrompt[]> {
    // Prompts are server-specific prompt templates
    return [];
  }

  async callTool(toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
    if (!this.isConnected) {
      throw new Error("Server not connected");
    }

    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // Simulate tool execution
    // In production, this would send the request to the actual MCP server
    
    try {
      // Use LLM to simulate tool response for demo purposes
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are simulating an MCP tool response. The tool "${toolName}" was called with the following arguments. Generate a realistic response that would come from this tool.`
          },
          {
            role: "user",
            content: `Tool: ${toolName}\nDescription: ${tool.description}\nArguments: ${JSON.stringify(args, null, 2)}\n\nGenerate a realistic JSON response for this tool call.`
          }
        ]
      });

      const messageContent = response.choices[0]?.message?.content;
      const content = typeof messageContent === 'string' ? messageContent : "Tool executed successfully";

      return {
        content: [
          {
            type: "text",
            text: content
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error executing tool: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ],
        isError: true
      };
    }
  }

  async readResource(uri: string): Promise<McpToolResult> {
    // Read a resource from the server
    return {
      content: [
        {
          type: "text",
          text: `Resource content for: ${uri}`
        }
      ]
    };
  }

  async getPrompt(name: string, args?: Record<string, string>): Promise<{ messages: Array<{ role: string; content: string }> }> {
    // Get a prompt template from the server
    return {
      messages: [
        {
          role: "user",
          content: `Prompt: ${name} with args: ${JSON.stringify(args)}`
        }
      ]
    };
  }

  getTools(): McpTool[] {
    return this.tools;
  }

  getResources(): McpResource[] {
    return this.resources;
  }

  getPrompts(): McpPrompt[] {
    return this.prompts;
  }

  getStatus(): { connected: boolean; serverType: string; toolCount: number } {
    return {
      connected: this.isConnected,
      serverType: this.config.serverType,
      toolCount: this.tools.length
    };
  }

  async close(): Promise<void> {
    this.isConnected = false;
    this.tools = [];
    this.resources = [];
    this.prompts = [];
  }
}

// Global MCP Manager instance
export const mcpManager = new McpServerManager();

// Helper function to get all available tools across all connected servers
export async function getAllMcpTools(): Promise<Array<McpTool & { serverId: number; serverName: string }>> {
  const allTools: Array<McpTool & { serverId: number; serverName: string }> = [];
  
  for (const connection of mcpManager.getAllConnections()) {
    const status = connection.getStatus();
    const tools = connection.getTools();
    
    for (const tool of tools) {
      allTools.push({
        ...tool,
        serverId: 0, // Would be set from actual connection
        serverName: status.serverType
      });
    }
  }
  
  return allTools;
}
