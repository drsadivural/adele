import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import { 
  Plus, 
  Sparkles, 
  Search,
  Clock, 
  Code2,
  Loader2,
  LogOut,
  ArrowLeft,
  Trash2
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Projects() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: projects, isLoading, refetch } = trpc.project.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const deleteProject = trpc.project.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      refetch();
    },
    onError: () => {
      toast.error("Failed to delete project");
    }
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

  const filteredProjects = projects?.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <img src="/adele-logo.png" alt="ADELE" className="w-10 h-10 object-contain" />
              <span className="font-semibold text-lg">ADELE</span>
            </Link>
          </div>
          
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
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div>
              <h1 className="text-3xl font-bold mb-2">All Projects</h1>
              <p className="text-muted-foreground">{projects?.length || 0} total projects</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Link href="/dashboard">
                <Button className="gradient-bg text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Projects Grid */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
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
          ) : filteredProjects && filteredProjects.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="glass-card hover:shadow-apple-lg transition-apple h-full group">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <Link href={`/project/${project.id}`} className="flex-1">
                          <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center">
                            <Code2 className="w-5 h-5 text-white" />
                          </div>
                        </Link>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={project.status} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              if (confirm("Are you sure you want to delete this project?")) {
                                deleteProject.mutate({ id: project.id });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <Link href={`/project/${project.id}`}>
                        <CardTitle className="text-lg mt-3 hover:text-primary transition-colors">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {project.description || "No description"}
                        </CardDescription>
                      </Link>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="glass-card">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? "No matching projects" : "No projects yet"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? "Try a different search term" 
                    : "Create your first project to get started"}
                </p>
                {!searchQuery && (
                  <Link href="/dashboard">
                    <Button className="gradient-bg text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Project
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
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
