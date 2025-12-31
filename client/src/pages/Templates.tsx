import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import { 
  Search,
  ArrowLeft,
  LogOut,
  Loader2,
  ShoppingCart,
  LayoutDashboard,
  Users,
  FileText,
  Briefcase,
  Package,
  Calendar,
  MessageSquare,
  Store,
  Rocket,
  Eye,
  Star
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";

// Template categories with icons
const categories = [
  { id: "all", label: "All Templates", icon: Package },
  { id: "crm", label: "CRM", icon: Users },
  { id: "ecommerce", label: "E-Commerce", icon: ShoppingCart },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "social", label: "Social", icon: MessageSquare },
  { id: "blog", label: "Blog", icon: FileText },
  { id: "portfolio", label: "Portfolio", icon: Briefcase },
  { id: "saas", label: "SaaS", icon: Rocket },
  { id: "marketplace", label: "Marketplace", icon: Store },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "booking", label: "Booking", icon: Calendar },
];

// Pre-built templates data
const builtInTemplates = [
  {
    id: 1,
    name: "Customer Relationship Manager",
    slug: "crm-pro",
    description: "Full-featured CRM with contact management, deal tracking, pipeline visualization, and analytics dashboard.",
    category: "crm",
    thumbnail: "/templates/crm.png",
    features: ["Contact Management", "Deal Pipeline", "Task Automation", "Email Integration", "Analytics"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 1250,
    rating: 4.8,
  },
  {
    id: 2,
    name: "E-Commerce Storefront",
    slug: "ecommerce-store",
    description: "Complete online store with product catalog, shopping cart, checkout, and payment processing.",
    category: "ecommerce",
    thumbnail: "/templates/ecommerce.png",
    features: ["Product Catalog", "Shopping Cart", "Stripe Payments", "Order Management", "Inventory Tracking"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 2100,
    rating: 4.9,
  },
  {
    id: 3,
    name: "Analytics Dashboard",
    slug: "analytics-dashboard",
    description: "Real-time analytics dashboard with customizable widgets, charts, and data visualization.",
    category: "dashboard",
    thumbnail: "/templates/dashboard.png",
    features: ["Real-time Charts", "Custom Widgets", "Data Export", "User Roles", "API Integration"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 890,
    rating: 4.7,
  },
  {
    id: 4,
    name: "Social Network Platform",
    slug: "social-network",
    description: "Social platform with user profiles, posts, comments, likes, and real-time notifications.",
    category: "social",
    thumbnail: "/templates/social.png",
    features: ["User Profiles", "News Feed", "Messaging", "Notifications", "Media Upload"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 650,
    rating: 4.6,
  },
  {
    id: 5,
    name: "Blog Platform",
    slug: "blog-platform",
    description: "Modern blog platform with rich text editor, categories, tags, and SEO optimization.",
    category: "blog",
    thumbnail: "/templates/blog.png",
    features: ["Rich Text Editor", "Categories & Tags", "SEO Tools", "Comments", "RSS Feed"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 1800,
    rating: 4.8,
  },
  {
    id: 6,
    name: "Portfolio Showcase",
    slug: "portfolio",
    description: "Professional portfolio website with project showcase, about section, and contact form.",
    category: "portfolio",
    thumbnail: "/templates/portfolio.png",
    features: ["Project Gallery", "About Section", "Contact Form", "Testimonials", "Resume Download"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 3200,
    rating: 4.9,
  },
  {
    id: 7,
    name: "SaaS Starter Kit",
    slug: "saas-starter",
    description: "Complete SaaS boilerplate with authentication, subscription billing, and admin dashboard.",
    category: "saas",
    thumbnail: "/templates/saas.png",
    features: ["User Auth", "Stripe Billing", "Admin Panel", "Team Management", "API Keys"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 980,
    rating: 4.7,
  },
  {
    id: 8,
    name: "Marketplace Platform",
    slug: "marketplace",
    description: "Two-sided marketplace with buyer/seller accounts, listings, and transaction management.",
    category: "marketplace",
    thumbnail: "/templates/marketplace.png",
    features: ["Seller Accounts", "Product Listings", "Reviews", "Escrow Payments", "Messaging"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 420,
    rating: 4.5,
  },
  {
    id: 9,
    name: "Inventory Management",
    slug: "inventory-system",
    description: "Inventory tracking system with stock management, orders, suppliers, and reporting.",
    category: "inventory",
    thumbnail: "/templates/inventory.png",
    features: ["Stock Tracking", "Order Management", "Supplier Portal", "Barcode Scanning", "Reports"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 560,
    rating: 4.6,
  },
  {
    id: 10,
    name: "Booking System",
    slug: "booking-system",
    description: "Appointment and reservation system with calendar, availability, and payment integration.",
    category: "booking",
    thumbnail: "/templates/booking.png",
    features: ["Calendar View", "Availability Management", "Online Payments", "Reminders", "Staff Management"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 780,
    rating: 4.7,
  },
];

export default function Templates() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const createFromTemplate = trpc.project.createFromTemplate.useMutation({
    onSuccess: (project) => {
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

  const filteredTemplates = builtInTemplates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat?.icon || Package;
  };

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
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
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-bold mb-2">Template Library</h1>
            <p className="text-muted-foreground">Start with a pre-built template and customize it to your needs</p>
          </motion.div>

          {/* Search and Filter */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </motion.div>

          {/* Category Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 mb-8">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-full border border-border"
                  >
                    <category.icon className="w-4 h-4 mr-2" />
                    {category.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-0">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No templates found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or filter</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map((template, index) => {
                      const CategoryIcon = getCategoryIcon(template.category);
                      return (
                        <motion.div
                          key={template.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          <Card className="glass-card hover:shadow-apple-lg transition-apple h-full flex flex-col">
                            <CardHeader>
                              <div className="flex items-start justify-between mb-2">
                                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                                  <CategoryIcon className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  {template.rating}
                                </div>
                              </div>
                              <CardTitle className="text-lg">{template.name}</CardTitle>
                              <CardDescription className="line-clamp-2">
                                {template.description}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                              <div className="flex flex-wrap gap-1 mb-4">
                                {template.features.slice(0, 3).map((feature) => (
                                  <Badge key={feature} variant="secondary" className="text-xs">
                                    {feature}
                                  </Badge>
                                ))}
                                {template.features.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{template.features.length - 3} more
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="text-xs text-muted-foreground mb-4">
                                <span className="font-medium">Tech:</span> {template.techStack.frontend} + {template.techStack.backend}
                              </div>

                              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                                <span className="text-xs text-muted-foreground">
                                  {template.usageCount.toLocaleString()} uses
                                </span>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm">
                                    <Eye className="w-4 h-4 mr-1" />
                                    Preview
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    className="gradient-bg text-white"
                                    onClick={() => createFromTemplate.mutate({ templateSlug: template.slug })}
                                    disabled={createFromTemplate.isPending}
                                  >
                                    {createFromTemplate.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Rocket className="w-4 h-4 mr-1" />
                                        Use
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
