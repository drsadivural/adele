import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { 
  CreditCard, 
  Key, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  Package
} from "lucide-react";
import { Link, useLocation, Redirect } from "wouter";
import { toast } from "sonner";

export default function StripeAdmin() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [newConfig, setNewConfig] = useState({ key: "", value: "", description: "", isEncrypted: false });
  
  const { data: configs, isLoading, refetch } = trpc.stripeAdmin.getConfig.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  
  const updateConfig = trpc.stripeAdmin.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuration saved");
      refetch();
      setNewConfig({ key: "", value: "", description: "", isEncrypted: false });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteConfig = trpc.stripeAdmin.deleteConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuration deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const testConnection = trpc.stripeAdmin.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const syncProducts = trpc.stripeAdmin.syncProducts.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.products.length} products to Stripe`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddConfig = () => {
    if (!newConfig.key || !newConfig.value) {
      toast.error("Key and value are required");
      return;
    }
    updateConfig.mutate(newConfig);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Stripe Administration</h1>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid gap-6 max-w-4xl">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Connection Status
              </CardTitle>
              <CardDescription>
                Test your Stripe API connection and sync products
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => testConnection.mutate()}
                  disabled={testConnection.isPending}
                >
                  {testConnection.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => syncProducts.mutate()}
                  disabled={syncProducts.isPending}
                >
                  {syncProducts.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Package className="h-4 w-4 mr-2" />
                  )}
                  Sync Products
                </Button>
              </div>
              
              {testConnection.data && (
                <div className={`p-4 rounded-lg ${testConnection.data.success ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {testConnection.data.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">{testConnection.data.message}</span>
                  </div>
                  {testConnection.data.balance && (
                    <div className="text-sm text-muted-foreground">
                      Available balance: {testConnection.data.balance.map(b => 
                        `${b.amount.toFixed(2)} ${b.currency.toUpperCase()}`
                      ).join(", ")}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Keys Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Manage your Stripe API keys and webhook secrets. These values are stored securely and used for payment processing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing Configs */}
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : configs && configs.length > 0 ? (
                <div className="space-y-4">
                  {configs.map((config) => (
                    <div
                      key={config.id}
                      className="flex items-center gap-4 p-4 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">{config.configKey}</span>
                          {config.isEncrypted && (
                            <Badge variant="secondary" className="text-xs">Encrypted</Badge>
                          )}
                        </div>
                        {config.description && (
                          <p className="text-sm text-muted-foreground">{config.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {showSecrets[config.configKey] 
                              ? config.configValue 
                              : config.configValue.substring(0, 8) + "••••••••"}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleSecretVisibility(config.configKey)}
                          >
                            {showSecrets[config.configKey] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteConfig.mutate({ key: config.configKey })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No custom configurations yet. The default environment variables are being used.
                </div>
              )}

              <Separator />

              {/* Add New Config */}
              <div className="space-y-4">
                <h4 className="font-medium">Add New Configuration</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="config-key">Configuration Key</Label>
                    <Input
                      id="config-key"
                      placeholder="e.g., STRIPE_WEBHOOK_SECRET"
                      value={newConfig.key}
                      onChange={(e) => setNewConfig(prev => ({ ...prev, key: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="config-value">Value</Label>
                    <Input
                      id="config-value"
                      type={newConfig.isEncrypted ? "password" : "text"}
                      placeholder="Enter value"
                      value={newConfig.value}
                      onChange={(e) => setNewConfig(prev => ({ ...prev, value: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="config-desc">Description (optional)</Label>
                  <Input
                    id="config-desc"
                    placeholder="What is this configuration for?"
                    value={newConfig.description}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="config-encrypted"
                      checked={newConfig.isEncrypted}
                      onCheckedChange={(checked) => setNewConfig(prev => ({ ...prev, isEncrypted: checked }))}
                    />
                    <Label htmlFor="config-encrypted">Mark as sensitive (encrypted)</Label>
                  </div>
                  <Button
                    onClick={handleAddConfig}
                    disabled={updateConfig.isPending || !newConfig.key || !newConfig.value}
                  >
                    {updateConfig.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add Configuration
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Reference */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Reference</CardTitle>
              <CardDescription>
                Common Stripe configuration keys
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <code className="font-mono text-xs bg-background px-2 py-1 rounded">STRIPE_SECRET_KEY</code>
                  <span className="text-muted-foreground">Your Stripe secret API key (starts with sk_)</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <code className="font-mono text-xs bg-background px-2 py-1 rounded">STRIPE_PUBLISHABLE_KEY</code>
                  <span className="text-muted-foreground">Your Stripe publishable key (starts with pk_)</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <code className="font-mono text-xs bg-background px-2 py-1 rounded">STRIPE_WEBHOOK_SECRET</code>
                  <span className="text-muted-foreground">Webhook signing secret (starts with whsec_)</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Note: Default keys are automatically loaded from environment variables. 
                Custom configurations here will override the defaults.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
