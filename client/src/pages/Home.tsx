import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Sparkles, 
  Code2, 
  Database, 
  Shield, 
  FileText, 
  Globe,
  Zap,
  Layers,
  Download,
  Play
} from "lucide-react";
import { Link } from "wouter";

const agents = [
  { name: "Coordinator", icon: Sparkles, color: "agent-coordinator", description: "Orchestrates the entire build process" },
  { name: "Research", icon: Globe, color: "agent-research", description: "Gathers best practices and documentation" },
  { name: "Coder", icon: Code2, color: "agent-coder", description: "Generates frontend and backend code" },
  { name: "Database", icon: Database, color: "agent-database", description: "Designs schemas and migrations" },
  { name: "Security", icon: Shield, color: "agent-security", description: "Implements auth and security" },
  { name: "Reporter", icon: FileText, color: "agent-reporter", description: "Creates documentation" },
  { name: "Browser", icon: Play, color: "agent-browser", description: "Tests UI and automation" },
];

const features = [
  {
    icon: Zap,
    title: "Natural Language Input",
    description: "Describe your app in plain English or use voice commands. Our AI understands complex requirements."
  },
  {
    icon: Layers,
    title: "Full-Stack Generation",
    description: "Complete React frontend, FastAPI backend, database schemas, and deployment configs generated automatically."
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Built-in authentication, authorization, input validation, and security best practices."
  },
  {
    icon: Download,
    title: "Download & Deploy",
    description: "Get complete source code, Docker configs, and one-click deployment to cloud infrastructure."
  }
];

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">AppForge</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : isAuthenticated ? (
              <Link href="/dashboard">
                <Button className="gradient-bg text-white hover:opacity-90 transition-opacity">
                  Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button className="gradient-bg text-white hover:opacity-90 transition-opacity">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container">
          <motion.div 
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Application Builder
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Build complete apps with
              <span className="gradient-text block mt-2">natural language</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Describe your application in plain English. Our multi-agent AI system generates 
              production-ready code, databases, security, and deployment configs.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="lg" className="gradient-bg text-white hover:opacity-90 transition-opacity h-14 px-8 text-lg">
                    Open Dashboard
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" className="gradient-bg text-white hover:opacity-90 transition-opacity h-14 px-8 text-lg">
                    Start Building Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </a>
              )}
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Agent System Section */}
      <section className="py-20 px-4">
        <div className="container">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powered by Specialized AI Agents
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Seven specialized agents work together to build your application, 
              each an expert in their domain.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.name}
                className="glass-card p-4 rounded-2xl text-center hover:shadow-apple-lg transition-apple"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <div className={`w-12 h-12 rounded-xl bg-current/10 flex items-center justify-center mx-auto mb-3 ${agent.color}`}>
                  <agent.icon className={`w-6 h-6 ${agent.color}`} />
                </div>
                <h3 className="font-semibold text-sm mb-1">{agent.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From idea to deployment, AppForge handles every aspect of application development.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="glass-card p-6 rounded-2xl hover:shadow-apple-lg transition-apple"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container">
          <motion.div 
            className="max-w-3xl mx-auto text-center glass-card p-12 rounded-3xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to build your next app?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of developers using AppForge to build applications faster than ever.
            </p>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="lg" className="gradient-bg text-white hover:opacity-90 transition-opacity h-14 px-8 text-lg">
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="lg" className="gradient-bg text-white hover:opacity-90 transition-opacity h-14 px-8 text-lg">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md gradient-bg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium">AppForge</span>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-Powered No-Code Application Builder
          </p>
        </div>
      </footer>
    </div>
  );
}
