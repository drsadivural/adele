import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Send,
  Mic,
  MicOff,
  Loader2,
  LogOut,
  ArrowLeft,
  Code2,
  FileText,
  Download,
  Rocket,
  FolderTree,
  Eye,
  ChevronRight,
  File,
  Folder,
  Copy,
  Check,
  Bot,
  User,
  Settings
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link, useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

// Agent icons mapping
const agentIcons: Record<string, { icon: React.ElementType; color: string }> = {
  coordinator: { icon: Sparkles, color: "text-blue-500" },
  research: { icon: FileText, color: "text-green-500" },
  coder: { icon: Code2, color: "text-purple-500" },
  database: { icon: FolderTree, color: "text-orange-500" },
  security: { icon: Settings, color: "text-red-500" },
  reporter: { icon: FileText, color: "text-cyan-500" },
  browser: { icon: Eye, color: "text-yellow-500" },
};

export default function ProjectBuilder() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: project, isLoading: projectLoading } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: isAuthenticated && projectId > 0 }
  );

  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = trpc.chat.getMessages.useQuery(
    { projectId },
    { enabled: isAuthenticated && projectId > 0 }
  );

  const { data: files, refetch: refetchFiles } = trpc.files.list.useQuery(
    { projectId },
    { enabled: isAuthenticated && projectId > 0 }
  );

  const { data: selectedFileContent } = trpc.files.getContent.useQuery(
    { projectId, filePath: selectedFile || "" },
    { enabled: isAuthenticated && projectId > 0 && !!selectedFile }
  );

  // Mutations
  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      refetchMessages();
      refetchFiles();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send message");
    }
  });

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [authLoading, isAuthenticated]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle send message
  const handleSend = () => {
    if (!message.trim() || sendMessage.isPending) return;
    sendMessage.mutate({ projectId, content: message });
    setMessage("");
  };

  // Handle voice input
  const handleVoiceInput = () => {
    if (!isRecording) {
      // Start recording
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setMessage(prev => prev + transcript);
          setIsRecording(false);
        };

        recognition.onerror = () => {
          setIsRecording(false);
          toast.error("Voice recognition failed");
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        setIsRecording(true);
      } else {
        toast.error("Voice input not supported in this browser");
      }
    }
  };

  // Copy file content
  const handleCopyFile = (content: string, path: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(path);
    setTimeout(() => setCopiedFile(null), 2000);
    toast.success("Copied to clipboard");
  };

  // Download all files
  const handleDownloadAll = () => {
    if (!files || files.length === 0) {
      toast.error("No files to download");
      return;
    }

    // Create a simple text file with all code
    let content = `# ${project?.name} - Generated Code\n\n`;
    files.forEach(file => {
      content += `\n## ${file.filePath}\n\n\`\`\`${file.fileType}\n${file.content}\n\`\`\`\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name || 'project'}-code.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded project code");
  };

  if (authLoading || projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-subtle">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !project) {
    return null;
  }

  // Build file tree structure
  const fileTree = buildFileTree(files || []);

  return (
    <div className="h-screen flex flex-col gradient-subtle">
      {/* Navigation */}
      <nav className="flex-shrink-0 glass border-b border-border/50 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">{project.name}</span>
              <StatusBadge status={project.status} />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadAll}>
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            <Button size="sm" className="gradient-bg text-white">
              <Rocket className="w-4 h-4 mr-1" />
              Deploy
            </Button>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <div className="w-1/2 flex flex-col border-r border-border">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 pb-4">
              <AnimatePresence>
                {messages?.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                  >
                    <MessageBubble message={msg} />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {sendMessage.isPending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="chat-bubble-assistant px-4 py-3">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="flex-shrink-0 p-4 border-t border-border glass">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleVoiceInput}
                className={isRecording ? "voice-pulse bg-red-100 text-red-500 border-red-300" : ""}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Input
                ref={inputRef}
                placeholder="Describe what you want to build..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                disabled={sendMessage.isPending}
                className="flex-1"
              />
              <Button 
                onClick={handleSend} 
                disabled={!message.trim() || sendMessage.isPending}
                className="gradient-bg text-white"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press Enter to send or use the microphone for voice input
            </p>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-1/2 flex flex-col">
          <Tabs defaultValue="code" className="flex-1 flex flex-col">
            <div className="flex-shrink-0 border-b border-border px-4">
              <TabsList className="h-12 bg-transparent">
                <TabsTrigger value="code" className="data-[state=active]:bg-muted">
                  <Code2 className="w-4 h-4 mr-2" />
                  Code
                </TabsTrigger>
                <TabsTrigger value="preview" className="data-[state=active]:bg-muted">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="files" className="data-[state=active]:bg-muted">
                  <FolderTree className="w-4 h-4 mr-2" />
                  Files
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="code" className="flex-1 flex m-0 overflow-hidden">
              {/* File Tree */}
              <div className="w-64 border-r border-border overflow-auto">
                <div className="p-2">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">FILES</p>
                  <FileTreeView 
                    tree={fileTree} 
                    selectedFile={selectedFile}
                    onSelectFile={setSelectedFile}
                  />
                </div>
              </div>

              {/* Code View */}
              <div className="flex-1 overflow-auto">
                {selectedFileContent ? (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
                      <span className="text-sm font-medium">{selectedFile}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyFile(selectedFileContent.content, selectedFile || "")}
                      >
                        {copiedFile === selectedFile ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                        <code>{selectedFileContent.content}</code>
                      </pre>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Code2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select a file to view its content</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 m-0 p-4">
              <Card className="h-full preview-panel flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Live Preview</p>
                  <p className="text-sm">Preview will appear here once the app is generated</p>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="files" className="flex-1 m-0 p-4 overflow-auto">
              {files && files.length > 0 ? (
                <div className="space-y-2">
                  {files.map((file) => (
                    <Card 
                      key={file.id} 
                      className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedFile(file.filePath)}
                    >
                      <div className="flex items-center gap-3">
                        <File className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground truncate">{file.filePath}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-muted">{file.fileType}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FolderTree className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No files generated yet</p>
                    <p className="text-sm">Start chatting to generate your application</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === "user";
  const isAgent = message.role === "agent";
  const agentInfo = isAgent && message.agentName ? agentIcons[message.agentName.toLowerCase()] : null;

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? "bg-primary text-primary-foreground" 
          : isAgent && agentInfo
            ? "bg-muted"
            : "gradient-bg"
      }`}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : isAgent && agentInfo ? (
          <agentInfo.icon className={`w-4 h-4 ${agentInfo.color}`} />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>
      <div className={`max-w-[80%] ${
        isUser 
          ? "chat-bubble-user" 
          : isAgent 
            ? "chat-bubble-agent"
            : "chat-bubble-assistant"
      } px-4 py-3`}>
        {isAgent && message.agentName && (
          <p className="text-xs font-medium mb-1 opacity-70">{message.agentName} Agent</p>
        )}
        <div className="text-sm">
          <Streamdown>{message.content}</Streamdown>
        </div>
      </div>
    </div>
  );
}

// File Tree Types and Components
interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileTreeNode[];
}

function buildFileTree(files: any[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  
  files.forEach(file => {
    const parts = file.filePath.split('/').filter(Boolean);
    let current = root;
    
    parts.forEach((part: string, index: number) => {
      const isFile = index === parts.length - 1;
      const existing = current.find(n => n.name === part);
      
      if (existing) {
        if (!isFile && existing.children) {
          current = existing.children;
        }
      } else {
        const node: FileTreeNode = {
          name: part,
          path: parts.slice(0, index + 1).join('/'),
          type: isFile ? "file" : "folder",
          children: isFile ? undefined : []
        };
        current.push(node);
        if (!isFile && node.children) {
          current = node.children;
        }
      }
    });
  });
  
  return root;
}

function FileTreeView({ 
  tree, 
  selectedFile, 
  onSelectFile,
  depth = 0 
}: { 
  tree: FileTreeNode[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };

  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <div key={node.path}>
          <div
            className={`file-tree-item ${selectedFile === node.path ? "active" : ""}`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => {
              if (node.type === "folder") {
                toggleFolder(node.path);
              } else {
                onSelectFile(node.path);
              }
            }}
          >
            {node.type === "folder" ? (
              <>
                <ChevronRight 
                  className={`w-3 h-3 transition-transform ${expanded.has(node.path) ? "rotate-90" : ""}`} 
                />
                <Folder className="w-4 h-4 text-blue-500" />
              </>
            ) : (
              <>
                <span className="w-3" />
                <File className="w-4 h-4 text-muted-foreground" />
              </>
            )}
            <span className="text-sm truncate">{node.name}</span>
          </div>
          {node.type === "folder" && node.children && expanded.has(node.path) && (
            <FileTreeView 
              tree={node.children} 
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    generating: { label: "Generating", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    completed: { label: "Completed", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
    deployed: { label: "Deployed", className: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
    failed: { label: "Failed", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
