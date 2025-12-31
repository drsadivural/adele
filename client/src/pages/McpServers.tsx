import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  Server, 
  Plus, 
  Plug, 
  PlugZap, 
  Trash2, 
  Wrench,
  Github,
  Database,
  Cloud,
  MessageSquare,
  Globe,
  Folder,
  Code,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const serverTypeIcons: Record<string, React.ReactNode> = {
  github: <Github className="h-5 w-5" />,
  gitlab: <Github className="h-5 w-5" />,
  slack: <MessageSquare className="h-5 w-5" />,
  discord: <MessageSquare className="h-5 w-5" />,
  postgresql: <Database className="h-5 w-5" />,
  mysql: <Database className="h-5 w-5" />,
  mongodb: <Database className="h-5 w-5" />,
  redis: <Database className="h-5 w-5" />,
  s3: <Cloud className="h-5 w-5" />,
  gcs: <Cloud className="h-5 w-5" />,
  filesystem: <Folder className="h-5 w-5" />,
  browser: <Globe className="h-5 w-5" />,
  custom: <Code className="h-5 w-5" />,
};

const statusColors: Record<string, string> = {
  connected: "text-green-600",
  disconnected: "text-gray-400",
  error: "text-red-600",
  initializing: "text-yellow-600",
};

const statusIcons: Record<string, React.ReactNode> = {
  connected: <CheckCircle className="h-4 w-4 text-green-600" />,
  disconnected: <XCircle className="h-4 w-4 text-gray-400" />,
  error: <AlertCircle className="h-4 w-4 text-red-600" />,
  initializing: <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />,
};

export default function McpServers() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<number | null>(null);
  const [newServer, setNewServer] = useState({
    name: "",
    serverType: "github" as string,
    transportType: "stdio" as "stdio" | "sse" | "websocket",
    command: "",
    url: "",
    env: {} as Record<string, string>,
  });

  // Fetch data
  const { data: servers, isLoading, refetch } = trpc.mcp.listServers.useQuery();
  const { data: serverTypes } = trpc.mcp.getAvailableServerTypes.useQuery();
  const { data: tools } = trpc.mcp.listTools.useQuery(
    { serverId: selectedServer! },
    { enabled: !!selectedServer }
  );

  // Mutations
  const createServer = trpc.mcp.createServer.useMutation({
    onSuccess: () => {
      toast.success("MCP server added successfully");
      setIsAddDialogOpen(false);
      setNewServer({
        name: "",
        serverType: "github",
        transportType: "stdio",
        command: "",
        url: "",
        env: {},
      });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add server");
    }
  });

  const connectServer = trpc.mcp.connectServer.useMutation({
    onSuccess: (data) => {
      toast.success(`Connected! Discovered ${data.toolCount} tools`);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to connect");
    }
  });

  const disconnectServer = trpc.mcp.disconnectServer.useMutation({
    onSuccess: () => {
      toast.success("Server disconnected");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to disconnect");
    }
  });

  const deleteServer = trpc.mcp.deleteServer.useMutation({
    onSuccess: () => {
      toast.success("Server deleted");
      setSelectedServer(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete server");
    }
  });

  const invokeTool = trpc.mcp.invokeTool.useMutation({
    onSuccess: (result) => {
      toast.success("Tool executed successfully");
      console.log("Tool result:", result);
    },
    onError: (error) => {
      toast.error(error.message || "Tool execution failed");
    }
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  const handleAddServer = () => {
    createServer.mutate({
      name: newServer.name,
      serverType: newServer.serverType as any,
      transportType: newServer.transportType,
      command: newServer.command || undefined,
      url: newServer.url || undefined,
      env: Object.keys(newServer.env).length > 0 ? newServer.env : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/settings")}>
              ← Back
            </Button>
            <div className="flex items-center gap-2">
              <Server className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">MCP Servers</h1>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Server
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add MCP Server</DialogTitle>
                <DialogDescription>
                  Connect to a Model Context Protocol server to access external tools and services.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Server Name</Label>
                  <Input
                    placeholder="My GitHub Server"
                    value={newServer.name}
                    onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Server Type</Label>
                  <Select
                    value={newServer.serverType}
                    onValueChange={(value) => setNewServer({ ...newServer, serverType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {serverTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            {serverTypeIcons[type.id]}
                            {type.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Transport Type</Label>
                  <Select
                    value={newServer.transportType}
                    onValueChange={(value: "stdio" | "sse" | "websocket") => 
                      setNewServer({ ...newServer, transportType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stdio">Standard I/O</SelectItem>
                      <SelectItem value="sse">Server-Sent Events</SelectItem>
                      <SelectItem value="websocket">WebSocket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newServer.transportType === "stdio" && (
                  <div className="space-y-2">
                    <Label>Command</Label>
                    <Input
                      placeholder="npx @modelcontextprotocol/server-github"
                      value={newServer.command}
                      onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      The command to start the MCP server process
                    </p>
                  </div>
                )}
                {(newServer.transportType === "sse" || newServer.transportType === "websocket") && (
                  <div className="space-y-2">
                    <Label>Server URL</Label>
                    <Input
                      placeholder="http://localhost:3001/sse"
                      value={newServer.url}
                      onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddServer} disabled={!newServer.name || createServer.isPending}>
                  {createServer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Server
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Server List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Connected Servers</CardTitle>
                <CardDescription>
                  {servers?.length || 0} server{servers?.length !== 1 ? 's' : ''} configured
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : servers && servers.length > 0 ? (
                  <div className="space-y-2">
                    {servers.map((server) => (
                      <div
                        key={server.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedServer === server.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedServer(server.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                              {serverTypeIcons[server.serverType] || <Server className="h-5 w-5" />}
                            </div>
                            <div>
                              <p className="font-medium">{server.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {server.serverType} • {server.transportType}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {statusIcons[server.status]}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Server className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No servers configured</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setIsAddDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Server
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Server Details */}
          <div className="lg:col-span-2">
            {selectedServer ? (
              (() => {
                const server = servers?.find(s => s.id === selectedServer);
                if (!server) return null;

                return (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            {serverTypeIcons[server.serverType] || <Server className="h-6 w-6 text-primary" />}
                          </div>
                          <div>
                            <CardTitle>{server.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <span className={statusColors[server.status]}>
                                {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
                              </span>
                              {server.lastConnectedAt && (
                                <span>• Last connected: {new Date(server.lastConnectedAt).toLocaleString()}</span>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {server.status === "connected" ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => disconnectServer.mutate({ id: server.id })}
                              disabled={disconnectServer.isPending}
                            >
                              {disconnectServer.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <PlugZap className="h-4 w-4" />
                              )}
                              <span className="ml-2">Disconnect</span>
                            </Button>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => connectServer.mutate({ id: server.id })}
                              disabled={connectServer.isPending}
                            >
                              {connectServer.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plug className="h-4 w-4" />
                              )}
                              <span className="ml-2">Connect</span>
                            </Button>
                          )}
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteServer.mutate({ id: server.id })}
                            disabled={deleteServer.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="tools">
                        <TabsList>
                          <TabsTrigger value="tools">Available Tools</TabsTrigger>
                          <TabsTrigger value="config">Configuration</TabsTrigger>
                        </TabsList>
                        <TabsContent value="tools" className="mt-4">
                          {server.status === "connected" ? (
                            tools && tools.length > 0 ? (
                              <div className="space-y-3">
                                {tools.map((tool) => (
                                  <div 
                                    key={tool.id}
                                    className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-start gap-3">
                                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center mt-0.5">
                                          <Wrench className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                          <p className="font-medium font-mono text-sm">{tool.name}</p>
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {tool.description || "No description available"}
                                          </p>
                                          {tool.inputSchema?.properties && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                              {Object.keys(tool.inputSchema.properties).map((param) => (
                                                <span 
                                                  key={param}
                                                  className="text-xs px-2 py-0.5 bg-muted rounded"
                                                >
                                                  {param}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => {
                                          invokeTool.mutate({
                                            toolId: tool.id,
                                            input: {}
                                          });
                                        }}
                                        disabled={invokeTool.isPending}
                                      >
                                        <Play className="h-3 w-3 mr-1" />
                                        Test
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <Wrench className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                <p className="text-muted-foreground">No tools discovered</p>
                              </div>
                            )
                          ) : (
                            <div className="text-center py-8">
                              <Plug className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                              <p className="text-muted-foreground">Connect to the server to discover available tools</p>
                            </div>
                          )}
                        </TabsContent>
                        <TabsContent value="config" className="mt-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-muted-foreground">Server Type</Label>
                                <p className="font-medium capitalize">{server.serverType}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Transport</Label>
                                <p className="font-medium uppercase">{server.transportType}</p>
                              </div>
                              {server.command && (
                                <div className="col-span-2">
                                  <Label className="text-muted-foreground">Command</Label>
                                  <p className="font-mono text-sm bg-muted p-2 rounded mt-1">
                                    {server.command}
                                  </p>
                                </div>
                              )}
                              {server.url && (
                                <div className="col-span-2">
                                  <Label className="text-muted-foreground">URL</Label>
                                  <p className="font-mono text-sm bg-muted p-2 rounded mt-1">
                                    {server.url}
                                  </p>
                                </div>
                              )}
                              {server.errorMessage && (
                                <div className="col-span-2">
                                  <Label className="text-destructive">Error</Label>
                                  <p className="text-sm text-destructive bg-destructive/10 p-2 rounded mt-1">
                                    {server.errorMessage}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                );
              })()
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Server className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Select a server</p>
                  <p className="text-sm text-muted-foreground">
                    Choose a server from the list to view details and available tools
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
