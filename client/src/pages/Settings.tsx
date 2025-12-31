import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Volume2,
  Mic,
  Camera,
  Link2,
  Settings as SettingsIcon,
  User,
  Bell,
  Code2,
  Plus,
  Trash2,
  Check,
  X,
  Play,
  RefreshCw,
  Github,
  Database,
  Cloud,
  Rocket,
  Sparkles,
  CreditCard,
  Mail,
  FileText,
  CheckSquare,
  Figma,
  MessageSquare,
  Server
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

// Tool category icons
const categoryIcons: Record<string, React.ElementType> = {
  version_control: Github,
  communication: MessageSquare,
  database: Database,
  storage: Cloud,
  deployment: Rocket,
  ai: Sparkles,
  business: CreditCard,
  productivity: CheckSquare,
  design: Figma,
  custom: Code2,
};

export default function Settings() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("general");

  // Queries
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = trpc.settings.get.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: ttsProviders, refetch: refetchTts } = trpc.tts.listProviders.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: availableTtsProviders } = trpc.tts.getAvailableProviders.useQuery();

  const { data: biometrics, refetch: refetchBiometrics } = trpc.biometric.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: toolConnections, refetch: refetchTools } = trpc.tools.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: availableTools } = trpc.tools.getAvailableTools.useQuery();

  // Mutations
  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Settings updated");
      refetchSettings();
    },
  });

  const createTtsProvider = trpc.tts.create.useMutation({
    onSuccess: () => {
      toast.success("TTS provider added");
      refetchTts();
    },
  });

  const deleteTtsProvider = trpc.tts.delete.useMutation({
    onSuccess: () => {
      toast.success("TTS provider removed");
      refetchTts();
    },
  });

  const synthesizeTts = trpc.tts.synthesize.useMutation();

  const registerVoice = trpc.biometric.registerVoice.useMutation({
    onSuccess: () => {
      toast.success("Voice sample registered");
      refetchBiometrics();
    },
  });

  const registerFace = trpc.biometric.registerFace.useMutation({
    onSuccess: () => {
      toast.success("Face photo registered");
      refetchBiometrics();
    },
  });

  const deleteBiometric = trpc.biometric.delete.useMutation({
    onSuccess: () => {
      toast.success("Biometric data removed");
      refetchBiometrics();
    },
  });

  const createToolConnection = trpc.tools.create.useMutation({
    onSuccess: () => {
      toast.success("Tool connected");
      refetchTools();
    },
  });

  const deleteToolConnection = trpc.tools.delete.useMutation({
    onSuccess: () => {
      toast.success("Tool disconnected");
      refetchTools();
    },
  });

  const testToolConnection = trpc.tools.test.useMutation();

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to access settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{user?.name || user?.email}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="general" className="gap-2">
              <SettingsIcon className="w-4 h-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="tts" className="gap-2">
              <Volume2 className="w-4 h-4" />
              <span className="hidden sm:inline">TTS</span>
            </TabsTrigger>
            <TabsTrigger value="biometrics" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Biometrics</span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-2">
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Tools</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="mcp" className="gap-2">
              <Server className="w-4 h-4" />
              <span className="hidden sm:inline">MCP</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <Select
                      value={settings?.theme || "system"}
                      onValueChange={(value) => updateSettings.mutate({ theme: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={settings?.language || "en"}
                      onValueChange={(value) => updateSettings.mutate({ language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ja">日本語</SelectItem>
                        <SelectItem value="zh">中文</SelectItem>
                        <SelectItem value="ko">한국어</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Voice Input</Label>
                      <p className="text-sm text-muted-foreground">Enable voice commands</p>
                    </div>
                    <Switch
                      checked={settings?.voiceEnabled ?? true}
                      onCheckedChange={(checked) => updateSettings.mutate({ voiceEnabled: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Text-to-Speech</Label>
                      <p className="text-sm text-muted-foreground">Enable voice responses</p>
                    </div>
                    <Switch
                      checked={settings?.ttsEnabled ?? true}
                      onCheckedChange={(checked) => updateSettings.mutate({ ttsEnabled: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Biometric Login</Label>
                      <p className="text-sm text-muted-foreground">Use voice or face to sign in</p>
                    </div>
                    <Switch
                      checked={settings?.biometricLoginEnabled ?? false}
                      onCheckedChange={(checked) => updateSettings.mutate({ biometricLoginEnabled: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Editor Settings</CardTitle>
                <CardDescription>Customize your code editor experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Font Size</Label>
                    <Select
                      value={String(settings?.editorSettings?.fontSize || 14)}
                      onValueChange={(value) => updateSettings.mutate({ 
                        editorSettings: { ...settings?.editorSettings, fontSize: parseInt(value) } 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[12, 13, 14, 15, 16, 18, 20].map((size) => (
                          <SelectItem key={size} value={String(size)}>{size}px</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tab Size</Label>
                    <Select
                      value={String(settings?.editorSettings?.tabSize || 2)}
                      onValueChange={(value) => updateSettings.mutate({ 
                        editorSettings: { ...settings?.editorSettings, tabSize: parseInt(value) } 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 spaces</SelectItem>
                        <SelectItem value="4">4 spaces</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Word Wrap</Label>
                    <p className="text-sm text-muted-foreground">Wrap long lines</p>
                  </div>
                  <Switch
                    checked={settings?.editorSettings?.wordWrap ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ 
                      editorSettings: { ...settings?.editorSettings, wordWrap: checked } 
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Save</Label>
                    <p className="text-sm text-muted-foreground">Automatically save changes</p>
                  </div>
                  <Switch
                    checked={settings?.editorSettings?.autoSave ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ 
                      editorSettings: { ...settings?.editorSettings, autoSave: checked } 
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TTS Settings */}
          <TabsContent value="tts" className="space-y-6">
            <TTSSettings
              providers={ttsProviders || []}
              availableProviders={availableTtsProviders || []}
              onCreateProvider={(data) => createTtsProvider.mutate(data)}
              onDeleteProvider={(id) => deleteTtsProvider.mutate({ id })}
              onTestSynthesize={(text, providerId) => synthesizeTts.mutate({ text, providerId })}
              isCreating={createTtsProvider.isPending}
              isSynthesizing={synthesizeTts.isPending}
            />
          </TabsContent>

          {/* Biometrics Settings */}
          <TabsContent value="biometrics" className="space-y-6">
            <BiometricSettings
              biometrics={biometrics || []}
              onRegisterVoice={(data) => registerVoice.mutate(data)}
              onRegisterFace={(data) => registerFace.mutate(data)}
              onDelete={(id) => deleteBiometric.mutate({ id })}
              isRegistering={registerVoice.isPending || registerFace.isPending}
            />
          </TabsContent>

          {/* Tool Connections */}
          <TabsContent value="tools" className="space-y-6">
            <ToolConnectionsSettings
              connections={toolConnections || []}
              availableTools={availableTools || []}
              onConnect={(data) => createToolConnection.mutate(data)}
              onDisconnect={(id) => deleteToolConnection.mutate({ id })}
              onTest={(id) => testToolConnection.mutate({ id })}
              isConnecting={createToolConnection.isPending}
              isTesting={testToolConnection.isPending}
            />
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch
                    checked={settings?.notifications?.email ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ 
                      notifications: { ...settings?.notifications, email: checked } 
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Browser push notifications</p>
                  </div>
                  <Switch
                    checked={settings?.notifications?.push ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ 
                      notifications: { ...settings?.notifications, push: checked } 
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Project Updates</Label>
                    <p className="text-sm text-muted-foreground">Notify on project changes</p>
                  </div>
                  <Switch
                    checked={settings?.notifications?.projectUpdates ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ 
                      notifications: { ...settings?.notifications, projectUpdates: checked } 
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Deployment Alerts</Label>
                    <p className="text-sm text-muted-foreground">Notify on deployment status</p>
                  </div>
                  <Switch
                    checked={settings?.notifications?.deploymentAlerts ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ 
                      notifications: { ...settings?.notifications, deploymentAlerts: checked } 
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Collaboration Invites</Label>
                    <p className="text-sm text-muted-foreground">Notify on team invitations</p>
                  </div>
                  <Switch
                    checked={settings?.notifications?.collaborationInvites ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ 
                      notifications: { ...settings?.notifications, collaborationInvites: checked } 
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MCP Servers */}
          <TabsContent value="mcp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>MCP Server Integration</CardTitle>
                <CardDescription>Connect to Model Context Protocol servers for external tool access</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <Server className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">Manage your MCP server connections</p>
                  <Link href="/mcp-servers">
                    <Button>
                      <Server className="w-4 h-4 mr-2" />
                      Open MCP Server Manager
                    </Button>
                  </Link>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">What is MCP?</h4>
                  <p className="text-sm text-muted-foreground">
                    Model Context Protocol (MCP) allows ADELE to connect to external services and tools.
                    Configure servers for GitHub, databases, file systems, and more to extend ADELE's capabilities.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// TTS Settings Component
function TTSSettings({
  providers,
  availableProviders,
  onCreateProvider,
  onDeleteProvider,
  onTestSynthesize,
  isCreating,
  isSynthesizing,
}: {
  providers: any[];
  availableProviders: any[];
  onCreateProvider: (data: any) => void;
  onDeleteProvider: (id: number) => void;
  onTestSynthesize: (text: string, providerId?: number) => void;
  isCreating: boolean;
  isSynthesizing: boolean;
}) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: "",
    provider: "openai" as const,
    apiKey: "",
    isDefault: false,
  });
  const [testText, setTestText] = useState("Hello, this is a test of the text-to-speech system.");

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Text-to-Speech Providers</CardTitle>
            <CardDescription>Configure TTS engines for voice responses</CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add TTS Provider</DialogTitle>
                <DialogDescription>Configure a new text-to-speech provider</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newProvider.name}
                    onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                    placeholder="My TTS Provider"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={newProvider.provider}
                    onValueChange={(value) => setNewProvider({ ...newProvider, provider: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProviders.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={newProvider.apiKey}
                    onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                    placeholder="Enter your API key"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newProvider.isDefault}
                    onCheckedChange={(checked) => setNewProvider({ ...newProvider, isDefault: checked })}
                  />
                  <Label>Set as default provider</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    onCreateProvider(newProvider);
                    setShowAddDialog(false);
                    setNewProvider({ name: "", provider: "openai", apiKey: "", isDefault: false });
                  }}
                  disabled={isCreating || !newProvider.name || !newProvider.apiKey}
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Add Provider
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Volume2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No TTS providers configured</p>
              <p className="text-sm">Add a provider to enable voice responses</p>
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((provider) => (
                <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Volume2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{provider.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{provider.provider}</p>
                    </div>
                    {provider.isDefault && (
                      <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">Default</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onTestSynthesize(testText, provider.id)}
                      disabled={isSynthesizing}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteProvider(provider.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test TTS</CardTitle>
          <CardDescription>Test your text-to-speech configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Test Text</Label>
            <Input
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter text to synthesize"
            />
          </div>
          <Button
            onClick={() => onTestSynthesize(testText)}
            disabled={isSynthesizing || !testText}
          >
            {isSynthesizing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Synthesize
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

// Biometric Settings Component
function BiometricSettings({
  biometrics,
  onRegisterVoice,
  onRegisterFace,
  onDelete,
  isRegistering,
}: {
  biometrics: any[];
  onRegisterVoice: (data: any) => void;
  onRegisterFace: (data: any) => void;
  onDelete: (id: number) => void;
  isRegistering: boolean;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const voiceBiometrics = biometrics.filter(b => b.biometricType === "voice");
  const faceBiometrics = biometrics.filter(b => b.biometricType === "face");

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64 = btoa(Array.from(new Uint8Array(arrayBuffer)).map(b => String.fromCharCode(b)).join(''));
        
        onRegisterVoice({
          audioData: base64,
          format: "webm",
          duration: 5,
        });

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingProgress(0);

      // Progress animation
      const interval = setInterval(() => {
        setRecordingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            mediaRecorder.stop();
            setIsRecording(false);
            return 100;
          }
          return prev + 2;
        });
      }, 100);

      // Auto stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          setIsRecording(false);
          clearInterval(interval);
        }
      }, 5000);
    } catch (error) {
      toast.error("Failed to access microphone");
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCameraDialog(true);
    } catch (error) {
      toast.error("Failed to access camera");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg");
        const base64 = dataUrl.split(",")[1];
        
        onRegisterFace({
          imageData: base64,
          format: "jpeg",
          width: canvas.width,
          height: canvas.height,
        });

        // Stop camera
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setShowCameraDialog(false);
      }
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Voice Registration</CardTitle>
          <CardDescription>Register your voice for personalized recognition</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {voiceBiometrics.length > 0 ? (
            <div className="space-y-2">
              {voiceBiometrics.map((bio) => (
                <div key={bio.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Mic className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Voice Sample</p>
                      <p className="text-sm text-muted-foreground">
                        Quality: {Math.round((bio.metadata?.quality || 0) * 100)}%
                      </p>
                    </div>
                    <Check className="w-5 h-5 text-green-500" />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(bio.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Mic className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No voice sample registered</p>
            </div>
          )}

          {isRecording && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm">Recording... Speak clearly for 5 seconds</span>
              </div>
              <Progress value={recordingProgress} />
            </div>
          )}

          <Button
            onClick={startVoiceRecording}
            disabled={isRecording || isRegistering}
            className="w-full"
          >
            {isRecording ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Recording...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                {voiceBiometrics.length > 0 ? "Re-register Voice" : "Register Voice"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Face Registration</CardTitle>
          <CardDescription>Register your face for visual recognition</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {faceBiometrics.length > 0 ? (
            <div className="space-y-2">
              {faceBiometrics.map((bio) => (
                <div key={bio.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center overflow-hidden">
                      {bio.dataUrl ? (
                        <img src={bio.dataUrl} alt="Face" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Face Photo</p>
                      <p className="text-sm text-muted-foreground">
                        Quality: {Math.round((bio.metadata?.quality || 0) * 100)}%
                      </p>
                    </div>
                    <Check className="w-5 h-5 text-green-500" />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(bio.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No face photo registered</p>
            </div>
          )}

          <Dialog open={showCameraDialog} onOpenChange={setShowCameraDialog}>
            <DialogTrigger asChild>
              <Button onClick={startCamera} disabled={isRegistering} className="w-full">
                <Camera className="w-4 h-4 mr-2" />
                {faceBiometrics.length > 0 ? "Re-register Face" : "Register Face"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Capture Face Photo</DialogTitle>
                <DialogDescription>Position your face in the center and click capture</DialogDescription>
              </DialogHeader>
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-white/50 rounded-full" />
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  const stream = videoRef.current?.srcObject as MediaStream;
                  stream?.getTracks().forEach(track => track.stop());
                  setShowCameraDialog(false);
                }}>
                  Cancel
                </Button>
                <Button onClick={capturePhoto}>
                  <Camera className="w-4 h-4 mr-2" />
                  Capture
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </>
  );
}

// Tool Connections Settings Component
function ToolConnectionsSettings({
  connections,
  availableTools,
  onConnect,
  onDisconnect,
  onTest,
  isConnecting,
  isTesting,
}: {
  connections: any[];
  availableTools: any[];
  onConnect: (data: any) => void;
  onDisconnect: (id: number) => void;
  onTest: (id: number) => void;
  isConnecting: boolean;
  isTesting: boolean;
}) {
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const categories = Array.from(new Set(availableTools.map(t => t.category)));

  const handleConnect = () => {
    if (!selectedTool) return;

    onConnect({
      toolType: selectedTool.id,
      name: selectedTool.name,
      description: selectedTool.description,
      credentials: credentials,
    });

    setShowConnectDialog(false);
    setSelectedTool(null);
    setCredentials({});
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Connected Tools</CardTitle>
            <CardDescription>Manage your external service integrations</CardDescription>
          </div>
          <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Connect Tool
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Connect a Tool</DialogTitle>
                <DialogDescription>Choose a service to integrate with ADELE</DialogDescription>
              </DialogHeader>
              
              {!selectedTool ? (
                <div className="max-h-96 overflow-y-auto space-y-4 py-4">
                  {categories.map((category) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                        {category.replace("_", " ")}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {availableTools
                          .filter(t => t.category === category)
                          .map((tool) => {
                            const isConnected = connections.some(c => c.toolType === tool.id);
                            const Icon = categoryIcons[tool.category] || Code2;
                            
                            return (
                              <button
                                key={tool.id}
                                onClick={() => setSelectedTool(tool)}
                                disabled={isConnected}
                                className={`p-3 border rounded-lg text-left hover:bg-muted/50 transition-colors ${
                                  isConnected ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  <span className="font-medium text-sm">{tool.name}</span>
                                </div>
                                {isConnected && (
                                  <span className="text-xs text-green-500">Connected</span>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    {(() => {
                      const Icon = categoryIcons[selectedTool.category] || Code2;
                      return <Icon className="w-6 h-6" />;
                    })()}
                    <div>
                      <p className="font-medium">{selectedTool.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedTool.description}</p>
                    </div>
                  </div>

                  {/* Credential inputs based on tool type */}
                  {["github", "gitlab", "bitbucket"].includes(selectedTool.id) && (
                    <div className="space-y-2">
                      <Label>Access Token</Label>
                      <Input
                        type="password"
                        value={credentials.accessToken || ""}
                        onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
                        placeholder="Enter your personal access token"
                      />
                    </div>
                  )}

                  {["openai", "anthropic", "google_ai", "stripe", "sendgrid"].includes(selectedTool.id) && (
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        value={credentials.apiKey || ""}
                        onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                        placeholder="Enter your API key"
                      />
                    </div>
                  )}

                  {["slack", "discord"].includes(selectedTool.id) && (
                    <div className="space-y-2">
                      <Label>Webhook URL</Label>
                      <Input
                        value={credentials.webhookUrl || ""}
                        onChange={(e) => setCredentials({ ...credentials, webhookUrl: e.target.value })}
                        placeholder="Enter your webhook URL"
                      />
                    </div>
                  )}

                  {["postgresql", "mysql", "mongodb"].includes(selectedTool.id) && (
                    <div className="space-y-2">
                      <Label>Connection String</Label>
                      <Input
                        type="password"
                        value={credentials.connectionString || ""}
                        onChange={(e) => setCredentials({ ...credentials, connectionString: e.target.value })}
                        placeholder="Enter your connection string"
                      />
                    </div>
                  )}

                  {selectedTool.id === "custom_api" && (
                    <>
                      <div className="space-y-2">
                        <Label>Base URL</Label>
                        <Input
                          value={credentials.baseUrl || ""}
                          onChange={(e) => setCredentials({ ...credentials, baseUrl: e.target.value })}
                          placeholder="https://api.example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>API Key (optional)</Label>
                        <Input
                          type="password"
                          value={credentials.apiKey || ""}
                          onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                          placeholder="Enter your API key"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              <DialogFooter>
                {selectedTool ? (
                  <>
                    <Button variant="outline" onClick={() => setSelectedTool(null)}>Back</Button>
                    <Button onClick={handleConnect} disabled={isConnecting}>
                      {isConnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Connect
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setShowConnectDialog(false)}>Cancel</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Link2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No tools connected</p>
              <p className="text-sm">Connect external services to enhance ADELE</p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => {
                const tool = availableTools.find(t => t.id === connection.toolType);
                const Icon = tool ? categoryIcons[tool.category] || Code2 : Code2;
                
                return (
                  <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{connection.name}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            connection.status === "connected" 
                              ? "bg-green-500/10 text-green-500"
                              : connection.status === "error"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-yellow-500/10 text-yellow-500"
                          }`}>
                            {connection.status}
                          </span>
                          {connection.lastSyncAt && (
                            <span className="text-xs text-muted-foreground">
                              Last sync: {new Date(connection.lastSyncAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onTest(connection.id)}
                        disabled={isTesting}
                      >
                        <RefreshCw className={`w-4 h-4 ${isTesting ? "animate-spin" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDisconnect(connection.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
