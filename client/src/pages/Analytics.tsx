import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  BarChart3, 
  Download, 
  Users, 
  FolderKanban, 
  Rocket, 
  Layout,
  Bot,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Analytics() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate date range
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString();

  // Fetch analytics data
  const { data: dashboard, isLoading } = trpc.analytics.getDashboard.useQuery(
    { startDate, endDate },
    { enabled: user?.role === "admin" }
  );

  const { data: agentPerformance } = trpc.analytics.getAgentPerformance.useQuery(
    { startDate, endDate },
    { enabled: user?.role === "admin" }
  );

  const { data: templateStats } = trpc.analytics.getTemplateStats.useQuery(
    { startDate, endDate },
    { enabled: user?.role === "admin" }
  );

  const exportReport = trpc.analytics.exportReport.useMutation({
    onSuccess: (data) => {
      // Download the file
      const blob = new Blob([data.content], { 
        type: data.format === "csv" ? "text/csv" : "application/json" 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-report.${data.format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported successfully");
    },
    onError: () => {
      toast.error("Failed to export report");
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

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You need admin privileges to access the analytics dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/dashboard")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExport = (reportType: "summary" | "events" | "agents" | "templates", format: "json" | "csv") => {
    exportReport.mutate({ reportType, format, startDate, endDate });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
              ← Back
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Analytics Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboard?.summary.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">Active in selected period</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Projects Created</CardTitle>
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboard?.summary.totalProjects || 0}</div>
                  <p className="text-xs text-muted-foreground">New projects</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Deployments</CardTitle>
                  <Rocket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboard?.summary.totalDeployments || 0}</div>
                  <p className="text-xs text-muted-foreground">Successful deployments</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Template Uses</CardTitle>
                  <Layout className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboard?.summary.totalTemplateUses || 0}</div>
                  <p className="text-xs text-muted-foreground">Templates used</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="agents">Agent Performance</TabsTrigger>
                <TabsTrigger value="templates">Template Analytics</TabsTrigger>
                <TabsTrigger value="events">Event Log</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Event Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Event Distribution
                      </CardTitle>
                      <CardDescription>Breakdown of events by type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {dashboard?.events && (() => {
                          const eventCounts: Record<string, number> = {};
                          dashboard.events.forEach(e => {
                            eventCounts[e.eventType] = (eventCounts[e.eventType] || 0) + 1;
                          });
                          const sorted = Object.entries(eventCounts)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 8);
                          const max = sorted[0]?.[1] || 1;
                          
                          return sorted.map(([type, count]) => (
                            <div key={type} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="capitalize">{type.replace(/_/g, " ")}</span>
                                <span className="text-muted-foreground">{count}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${(count / max) * 100}%` }}
                                />
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        Agent Summary
                      </CardTitle>
                      <CardDescription>Overall agent performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {agentPerformance && (() => {
                          const agentSummary: Record<string, { total: number; success: number; failed: number }> = {};
                          agentPerformance.forEach(p => {
                            if (!agentSummary[p.agentType]) {
                              agentSummary[p.agentType] = { total: 0, success: 0, failed: 0 };
                            }
                            agentSummary[p.agentType].total += p.totalTasks;
                            agentSummary[p.agentType].success += p.successfulTasks;
                            agentSummary[p.agentType].failed += p.failedTasks;
                          });
                          
                          return Object.entries(agentSummary).map(([agent, stats]) => {
                            const successRate = stats.total > 0 
                              ? Math.round((stats.success / stats.total) * 100) 
                              : 0;
                            
                            return (
                              <div key={agent} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Bot className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium capitalize">{agent} Agent</p>
                                    <p className="text-sm text-muted-foreground">
                                      {stats.total} tasks
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`font-semibold ${successRate >= 90 ? 'text-green-600' : successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {successRate}%
                                  </p>
                                  <p className="text-xs text-muted-foreground">success rate</p>
                                </div>
                              </div>
                            );
                          });
                        })()}
                        {(!agentPerformance || agentPerformance.length === 0) && (
                          <p className="text-center text-muted-foreground py-8">
                            No agent performance data available
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="agents">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Agent Performance Metrics</CardTitle>
                      <CardDescription>Detailed breakdown by agent type</CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExport("agents", "csv")}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium">Agent</th>
                            <th className="text-right py-3 px-4 font-medium">Total Tasks</th>
                            <th className="text-right py-3 px-4 font-medium">Successful</th>
                            <th className="text-right py-3 px-4 font-medium">Failed</th>
                            <th className="text-right py-3 px-4 font-medium">Avg Duration</th>
                            <th className="text-right py-3 px-4 font-medium">Success Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentPerformance?.map((perf, i) => {
                            const successRate = perf.totalTasks > 0 
                              ? Math.round((perf.successfulTasks / perf.totalTasks) * 100) 
                              : 0;
                            
                            return (
                              <tr key={i} className="border-b last:border-0">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <Bot className="h-4 w-4 text-muted-foreground" />
                                    <span className="capitalize">{perf.agentType}</span>
                                  </div>
                                </td>
                                <td className="text-right py-3 px-4">{perf.totalTasks}</td>
                                <td className="text-right py-3 px-4">
                                  <span className="text-green-600">{perf.successfulTasks}</span>
                                </td>
                                <td className="text-right py-3 px-4">
                                  <span className="text-red-600">{perf.failedTasks}</span>
                                </td>
                                <td className="text-right py-3 px-4">
                                  {perf.avgDurationMs ? `${(perf.avgDurationMs / 1000).toFixed(1)}s` : '-'}
                                </td>
                                <td className="text-right py-3 px-4">
                                  <span className={`inline-flex items-center gap-1 ${
                                    successRate >= 90 ? 'text-green-600' : 
                                    successRate >= 70 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {successRate >= 90 ? <CheckCircle className="h-4 w-4" /> : 
                                     successRate >= 70 ? <Clock className="h-4 w-4" /> : 
                                     <XCircle className="h-4 w-4" />}
                                    {successRate}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {(!agentPerformance || agentPerformance.length === 0) && (
                        <p className="text-center text-muted-foreground py-8">
                          No agent performance data available for this period
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="templates">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Template Usage Analytics</CardTitle>
                      <CardDescription>Track template popularity and engagement</CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExport("templates", "csv")}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium">Template ID</th>
                            <th className="text-right py-3 px-4 font-medium">Views</th>
                            <th className="text-right py-3 px-4 font-medium">Uses</th>
                            <th className="text-right py-3 px-4 font-medium">Completions</th>
                            <th className="text-right py-3 px-4 font-medium">Conversion</th>
                            <th className="text-right py-3 px-4 font-medium">Avg Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {templateStats?.map((stat, i) => {
                            const conversion = stat.views > 0 
                              ? Math.round((stat.uses / stat.views) * 100) 
                              : 0;
                            
                            return (
                              <tr key={i} className="border-b last:border-0">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <Layout className="h-4 w-4 text-muted-foreground" />
                                    Template #{stat.templateId}
                                  </div>
                                </td>
                                <td className="text-right py-3 px-4">{stat.views}</td>
                                <td className="text-right py-3 px-4">{stat.uses}</td>
                                <td className="text-right py-3 px-4">{stat.completions}</td>
                                <td className="text-right py-3 px-4">{conversion}%</td>
                                <td className="text-right py-3 px-4">
                                  {stat.avgRating ? `${(stat.avgRating / 10).toFixed(1)}/5` : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {(!templateStats || templateStats.length === 0) && (
                        <p className="text-center text-muted-foreground py-8">
                          No template analytics data available for this period
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="events">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Event Log</CardTitle>
                      <CardDescription>Recent events and activities</CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExport("events", "json")}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export JSON
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {dashboard?.events.slice(0, 100).map((event, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-2 w-2 rounded-full ${
                              event.eventType.includes('error') ? 'bg-red-500' :
                              event.eventType.includes('completed') || event.eventType.includes('deployed') ? 'bg-green-500' :
                              'bg-blue-500'
                            }`} />
                            <div>
                              <p className="font-medium capitalize text-sm">
                                {event.eventType.replace(/_/g, " ")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                User #{event.userId} • {event.pageUrl || 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {new Date(event.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {(!dashboard?.events || dashboard.events.length === 0) && (
                        <p className="text-center text-muted-foreground py-8">
                          No events recorded for this period
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
