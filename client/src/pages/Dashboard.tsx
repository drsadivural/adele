import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import { 
  Plus, 
  Sparkles, 
  FolderOpen, 
  Clock, 
  ArrowRight,
  Rocket,
  Code2,
  Loader2,
  LogOut
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";

const appTypes = [
  { value: "saas", label: "SaaS Application", description: "Multi-tenant software as a service" },
  { value: "enterprise", label: "Enterprise App", description: "Internal business application" },
  { value: "ecommerce", label: "E-Commerce", description: "Online store with payments" },
  { value: "social", label: "Social Platform", description: "Community and social features" },
  { value: "dashboard", label: "Analytics Dashboard", description: "Data visualization and reporting" },
  { value: "marketplace", label: "Marketplace", description: "Two-sided marketplace platform" },
  { value: "custom", label: "Custom Application", description: "Build something unique" },
];

export default function Dashboard() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "", appType: "" });

  const { data: projects, isLoading: projectsLoading, refetch } = trpc.project.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const createProject = trpc.project.create.useMutation({
    onSuccess: (project) => {
      setIsCreateOpen(false);
      setNewProject({ name: "", description: "", appType: "" });
      refetch();
      setLocation(`/project/${project.id}`);
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [authLoading, isAuthenticated]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-subtle">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/adele-logo.png" alt="ADELE" className="w-10 h-10 object-contain" />
            <span className="font-semibold text-lg">ADELE</span>
          </Link>
          
          <div className="flex items-center gap-4">
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
          {/* Header */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-bold mb-2">Welcome back{user?.name ? `, ${user.name}` : ""}</h1>
            <p className="text-muted-foreground">Create and manage your AI-generated applications</p>
          </motion.div>

          {/* Quick Actions */}
          <motion.div 
            className="grid md:grid-cols-3 gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Card className="glass-card hover:shadow-apple-lg transition-apple cursor-pointer group">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">New Project</h3>
                      <p className="text-sm text-muted-foreground">Start building a new app</p>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Describe your application and our AI agents will build it for you.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      placeholder="My Awesome App"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Application Type</Label>
                    <Select
                      value={newProject.appType}
                      onValueChange={(value) => setNewProject({ ...newProject, appType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select application type" />
                      </SelectTrigger>
                      <SelectContent>
                        {appTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what you want to build..."
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="gradient-bg text-white"
                    onClick={() => createProject.mutate(newProject)}
                    disabled={!newProject.name || createProject.isPending}
                  >
                    {createProject.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Rocket className="w-4 h-4 mr-2" />
                    )}
                    Create Project
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Card className="glass-card">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{projects?.length || 0} Projects</h3>
                  <p className="text-sm text-muted-foreground">Total applications</p>
                </div>
              </CardContent>
            </Card>

<Link href="/templates">
              <Card className="glass-card hover:shadow-apple-lg transition-apple cursor-pointer group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Rocket className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Templates</h3>
                    <p className="text-sm text-muted-foreground">Start from a template</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* Projects List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Your Projects</h2>
              <Link href="/projects">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            {projectsLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="glass-card">
                    <CardHeader>
                      <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-48 bg-muted animate-pulse rounded mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.slice(0, 6).map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Link href={`/project/${project.id}`}>
                      <Card className="glass-card hover:shadow-apple-lg transition-apple cursor-pointer h-full">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center">
                              <Code2 className="w-5 h-5 text-white" />
                            </div>
                            <StatusBadge status={project.status} />
                          </div>
                          <CardTitle className="text-lg mt-3">{project.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {project.description || "No description"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {new Date(project.createdAt).toLocaleDateString()}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="glass-card">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <FolderOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first project to get started
                  </p>
                  <Button 
                    className="gradient-bg text-white"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </main>
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
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
