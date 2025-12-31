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
  Star,
  Heart,
  DollarSign,
  GraduationCap,
  Building2,
  UserCog,
  Truck,
  UtensilsCrossed,
  Dumbbell,
  Scale,
  HeartHandshake
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
  { id: "healthcare", label: "Healthcare", icon: Heart },
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "realestate", label: "Real Estate", icon: Building2 },
  { id: "hrm", label: "HR Management", icon: UserCog },
  { id: "logistics", label: "Logistics", icon: Truck },
  { id: "restaurant", label: "Restaurant", icon: UtensilsCrossed },
  { id: "fitness", label: "Fitness", icon: Dumbbell },
  { id: "legal", label: "Legal", icon: Scale },
  { id: "nonprofit", label: "Non-Profit", icon: HeartHandshake },
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
  // Healthcare Templates
  {
    id: 11,
    name: "Patient Management System",
    slug: "patient-management",
    description: "Complete healthcare management with patient records, appointments, prescriptions, and billing.",
    category: "healthcare",
    thumbnail: "/templates/healthcare.png",
    features: ["Patient Records", "Appointment Scheduling", "Prescription Management", "Medical History", "Insurance Billing"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 450,
    rating: 4.8,
  },
  {
    id: 12,
    name: "Telemedicine Platform",
    slug: "telemedicine",
    description: "Virtual healthcare platform with video consultations, chat, and remote patient monitoring.",
    category: "healthcare",
    thumbnail: "/templates/telemedicine.png",
    features: ["Video Consultations", "Secure Messaging", "E-Prescriptions", "Health Monitoring", "Payment Integration"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 320,
    rating: 4.7,
  },
  // Finance Templates
  {
    id: 13,
    name: "Personal Finance Tracker",
    slug: "finance-tracker",
    description: "Track expenses, budgets, investments, and financial goals with detailed analytics.",
    category: "finance",
    thumbnail: "/templates/finance.png",
    features: ["Expense Tracking", "Budget Planning", "Investment Portfolio", "Financial Reports", "Bank Sync"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 1100,
    rating: 4.8,
  },
  {
    id: 14,
    name: "Invoice & Billing System",
    slug: "invoice-billing",
    description: "Professional invoicing with recurring billing, payment tracking, and financial reporting.",
    category: "finance",
    thumbnail: "/templates/invoice.png",
    features: ["Invoice Generation", "Recurring Billing", "Payment Reminders", "Tax Calculations", "Multi-Currency"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 890,
    rating: 4.7,
  },
  {
    id: 15,
    name: "Loan Management System",
    slug: "loan-management",
    description: "Complete loan processing with applications, approvals, EMI calculations, and collections.",
    category: "finance",
    thumbnail: "/templates/loan.png",
    features: ["Loan Applications", "Credit Scoring", "EMI Calculator", "Payment Tracking", "Collection Management"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 340,
    rating: 4.6,
  },
  // Education Templates
  {
    id: 16,
    name: "Learning Management System",
    slug: "lms",
    description: "Complete LMS with courses, quizzes, progress tracking, and certificates.",
    category: "education",
    thumbnail: "/templates/lms.png",
    features: ["Course Builder", "Video Lessons", "Quizzes & Tests", "Progress Tracking", "Certificates"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 720,
    rating: 4.9,
  },
  {
    id: 17,
    name: "School Management System",
    slug: "school-management",
    description: "Comprehensive school administration with students, teachers, classes, and grades.",
    category: "education",
    thumbnail: "/templates/school.png",
    features: ["Student Portal", "Teacher Dashboard", "Attendance Tracking", "Grade Management", "Parent Communication"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 480,
    rating: 4.7,
  },
  {
    id: 18,
    name: "Online Exam Platform",
    slug: "exam-platform",
    description: "Secure online examination system with proctoring, auto-grading, and analytics.",
    category: "education",
    thumbnail: "/templates/exam.png",
    features: ["Question Bank", "Timed Exams", "Auto-Grading", "Proctoring", "Result Analytics"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 290,
    rating: 4.6,
  },
  // Real Estate Templates
  {
    id: 19,
    name: "Property Listing Platform",
    slug: "property-listing",
    description: "Real estate platform with property listings, search, virtual tours, and agent management.",
    category: "realestate",
    thumbnail: "/templates/realestate.png",
    features: ["Property Listings", "Advanced Search", "Virtual Tours", "Agent Profiles", "Lead Management"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 560,
    rating: 4.7,
  },
  {
    id: 20,
    name: "Property Management System",
    slug: "property-management",
    description: "Manage rental properties with tenants, leases, maintenance, and rent collection.",
    category: "realestate",
    thumbnail: "/templates/property-mgmt.png",
    features: ["Tenant Portal", "Lease Management", "Rent Collection", "Maintenance Requests", "Financial Reports"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 380,
    rating: 4.6,
  },
  // HR Management Templates
  {
    id: 21,
    name: "HR Management System",
    slug: "hrms",
    description: "Complete HRMS with employee management, payroll, leave tracking, and performance reviews.",
    category: "hrm",
    thumbnail: "/templates/hrms.png",
    features: ["Employee Directory", "Payroll Processing", "Leave Management", "Performance Reviews", "Recruitment"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 670,
    rating: 4.8,
  },
  {
    id: 22,
    name: "Recruitment Portal",
    slug: "recruitment",
    description: "Applicant tracking system with job postings, applications, interviews, and hiring workflow.",
    category: "hrm",
    thumbnail: "/templates/recruitment.png",
    features: ["Job Postings", "Resume Parsing", "Interview Scheduling", "Candidate Pipeline", "Offer Management"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 420,
    rating: 4.7,
  },
  // Logistics Templates
  {
    id: 23,
    name: "Fleet Management System",
    slug: "fleet-management",
    description: "Track vehicles, drivers, routes, and deliveries with real-time GPS monitoring.",
    category: "logistics",
    thumbnail: "/templates/fleet.png",
    features: ["Vehicle Tracking", "Route Optimization", "Driver Management", "Fuel Monitoring", "Maintenance Alerts"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 310,
    rating: 4.6,
  },
  {
    id: 24,
    name: "Delivery Management Platform",
    slug: "delivery-platform",
    description: "End-to-end delivery management with order tracking, driver app, and customer notifications.",
    category: "logistics",
    thumbnail: "/templates/delivery.png",
    features: ["Order Management", "Real-time Tracking", "Driver App", "Route Planning", "Customer Notifications"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 480,
    rating: 4.7,
  },
  // Restaurant Templates
  {
    id: 25,
    name: "Restaurant POS System",
    slug: "restaurant-pos",
    description: "Point of sale system for restaurants with menu management, orders, and kitchen display.",
    category: "restaurant",
    thumbnail: "/templates/restaurant-pos.png",
    features: ["Menu Management", "Table Ordering", "Kitchen Display", "Payment Processing", "Sales Reports"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 540,
    rating: 4.8,
  },
  {
    id: 26,
    name: "Food Ordering Platform",
    slug: "food-ordering",
    description: "Online food ordering with menu, cart, delivery tracking, and restaurant management.",
    category: "restaurant",
    thumbnail: "/templates/food-ordering.png",
    features: ["Online Menu", "Order Tracking", "Delivery Management", "Customer Reviews", "Promotions"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 890,
    rating: 4.8,
  },
  // Fitness Templates
  {
    id: 27,
    name: "Gym Management System",
    slug: "gym-management",
    description: "Complete gym management with memberships, classes, trainers, and equipment tracking.",
    category: "fitness",
    thumbnail: "/templates/gym.png",
    features: ["Member Management", "Class Scheduling", "Trainer Profiles", "Payment Plans", "Attendance Tracking"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 380,
    rating: 4.7,
  },
  {
    id: 28,
    name: "Fitness Tracking App",
    slug: "fitness-tracker",
    description: "Personal fitness app with workout plans, progress tracking, and nutrition logging.",
    category: "fitness",
    thumbnail: "/templates/fitness.png",
    features: ["Workout Plans", "Progress Charts", "Nutrition Tracking", "Goal Setting", "Social Sharing"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 620,
    rating: 4.8,
  },
  // Legal Templates
  {
    id: 29,
    name: "Law Firm Management",
    slug: "law-firm",
    description: "Legal practice management with case tracking, client portal, and document management.",
    category: "legal",
    thumbnail: "/templates/legal.png",
    features: ["Case Management", "Client Portal", "Document Storage", "Time Tracking", "Billing"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 240,
    rating: 4.6,
  },
  {
    id: 30,
    name: "Contract Management System",
    slug: "contract-management",
    description: "Manage contracts with templates, e-signatures, approvals, and compliance tracking.",
    category: "legal",
    thumbnail: "/templates/contract.png",
    features: ["Contract Templates", "E-Signatures", "Approval Workflow", "Expiry Alerts", "Audit Trail"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 310,
    rating: 4.7,
  },
  // Non-Profit Templates
  {
    id: 31,
    name: "Donation Management Platform",
    slug: "donation-platform",
    description: "Non-profit donation platform with campaigns, donor management, and impact reporting.",
    category: "nonprofit",
    thumbnail: "/templates/donation.png",
    features: ["Campaign Management", "Donor Portal", "Recurring Donations", "Impact Reports", "Tax Receipts"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 280,
    rating: 4.8,
  },
  {
    id: 32,
    name: "Volunteer Management System",
    slug: "volunteer-management",
    description: "Coordinate volunteers with scheduling, task assignment, and hour tracking.",
    category: "nonprofit",
    thumbnail: "/templates/volunteer.png",
    features: ["Volunteer Registration", "Event Scheduling", "Task Assignment", "Hour Tracking", "Recognition"],
    techStack: { frontend: "React", backend: "FastAPI", database: "PostgreSQL" },
    usageCount: 190,
    rating: 4.6,
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
