import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import { 
  ArrowLeft,
  LogOut,
  Loader2,
  GitBranch,
  GitCommit,
  Clock,
  FileCode,
  Plus,
  Minus,
  RotateCcw,
  Save,
  User,
  ChevronRight,
  Check,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { toast } from "sonner";

interface VersionDiff {
  filePath: string;
  type: "added" | "modified" | "deleted";
  additions: number;
  deletions: number;
}

export default function VersionControl() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [commitMessage, setCommitMessage] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const { data: project, isLoading: projectLoading } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: projectId > 0 && isAuthenticated }
  );

  const { data: versions, isLoading: versionsLoading, refetch: refetchVersions } = trpc.version.list.useQuery(
    { projectId },
    { enabled: projectId > 0 && isAuthenticated }
  );

  const { data: selectedVersionData } = trpc.version.get.useQuery(
    { projectId, versionNumber: selectedVersion || 0 },
    { enabled: !!selectedVersion && isAuthenticated }
  );

  const createVersion = trpc.version.create.useMutation({
    onSuccess: () => {
      toast.success("Version created successfully");
      setIsCreateOpen(false);
      setCommitMessage("");
      refetchVersions();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create version");
    },
  });

  const rollbackVersion = trpc.version.rollback.useMutation({
    onSuccess: (data) => {
      toast.success(`Rolled back to version ${data.restoredVersion}`);
      refetchVersions();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to rollback");
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (versions && versions.length > 0 && !selectedVersion) {
      setSelectedVersion(versions[0].versionNumber);
    }
  }, [versions, selectedVersion]);

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

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href={`/project/${projectId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Project
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              <span className="font-semibold">{project.name} - Version Control</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-bg text-white">
                  <Save className="w-4 h-4 mr-2" />
                  Create Version
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Version</DialogTitle>
                  <DialogDescription>
                    Save the current state of your project as a new version.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="commit-message">Commit Message</Label>
                    <Input
                      id="commit-message"
                      placeholder="Describe your changes..."
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="gradient-bg text-white"
                    onClick={() => createVersion.mutate({ projectId, commitMessage })}
                    disabled={createVersion.isPending}
                  >
                    {createVersion.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <GitCommit className="w-4 h-4 mr-2" />
                    )}
                    Create Version
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.name || user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-12 px-4">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Version List */}
            <motion.div
              className="lg:col-span-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="glass-card h-[calc(100vh-12rem)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    Version History
                  </CardTitle>
                  <CardDescription>
                    {versions?.length || 0} versions saved
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-20rem)]">
                    {versionsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : versions && versions.length > 0 ? (
                      <div className="space-y-1 p-4">
                        {versions.map((version, index) => (
                          <motion.div
                            key={version.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                          >
                            <button
                              className={`w-full text-left p-3 rounded-lg transition-all ${
                                selectedVersion === version.versionNumber
                                  ? "bg-primary/10 border border-primary/20"
                                  : "hover:bg-muted/50"
                              }`}
                              onClick={() => setSelectedVersion(version.versionNumber)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    index === 0 ? "bg-green-500" : "bg-muted-foreground"
                                  }`} />
                                  <span className="font-medium">v{version.versionNumber}</span>
                                </div>
                                {index === 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    Latest
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {version.commitMessage || "No message"}
                              </p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {formatDate(version.createdAt)}
                              </div>
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <GitCommit className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="font-medium mb-2">No versions yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Create your first version to start tracking changes
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateOpen(true)}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Create First Version
                        </Button>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>

            {/* Version Details */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {selectedVersionData ? (
                <Card className="glass-card h-[calc(100vh-12rem)]">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <GitCommit className="w-5 h-5" />
                          Version {selectedVersionData.versionNumber}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {selectedVersionData.commitMessage || "No commit message"}
                        </CardDescription>
                      </div>
                      {selectedVersion !== versions?.[0]?.versionNumber && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Rollback
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Rollback to Version {selectedVersion}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will restore all files to their state in version {selectedVersion}. 
                                Current changes will be preserved as a new version before rollback.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-orange-600 hover:bg-orange-700"
                                onClick={() => rollbackVersion.mutate({ projectId, versionNumber: selectedVersion! })}
                              >
                                {rollbackVersion.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                )}
                                Rollback
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>User #{selectedVersionData.createdBy}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(selectedVersionData.createdAt)}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <Separator />
                  <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-26rem)]">
                      <div className="p-4 space-y-4">
                        {/* Changes Summary */}
                        {selectedVersionData.diff && (
                          <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <FileCode className="w-4 h-4" />
                              Changes ({(selectedVersionData.diff as VersionDiff[]).length} files)
                            </h4>
                            <div className="space-y-2">
                              {(selectedVersionData.diff as VersionDiff[]).map((change, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                                >
                                  <div className="flex items-center gap-3">
                                    <Badge
                                      variant={
                                        change.type === "added"
                                          ? "default"
                                          : change.type === "deleted"
                                          ? "destructive"
                                          : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {change.type}
                                    </Badge>
                                    <span className="text-sm font-mono">{change.filePath}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    {change.additions > 0 && (
                                      <span className="text-green-600 flex items-center gap-1">
                                        <Plus className="w-3 h-3" />
                                        {change.additions}
                                      </span>
                                    )}
                                    {change.deletions > 0 && (
                                      <span className="text-red-600 flex items-center gap-1">
                                        <Minus className="w-3 h-3" />
                                        {change.deletions}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Snapshot Files */}
                        {selectedVersionData.snapshot && (
                          <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <FileCode className="w-4 h-4" />
                              Snapshot ({(selectedVersionData.snapshot as any[]).length} files)
                            </h4>
                            <div className="space-y-1">
                              {(selectedVersionData.snapshot as any[]).map((file, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 cursor-pointer"
                                >
                                  <FileCode className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-mono">{file.filePath}</span>
                                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Card className="glass-card h-[calc(100vh-12rem)] flex items-center justify-center">
                  <div className="text-center">
                    <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">Select a version</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose a version from the list to view details
                    </p>
                  </div>
                </Card>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
