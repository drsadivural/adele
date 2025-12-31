import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  Sparkles, 
  FolderPlus, 
  Bot, 
  MessageSquare, 
  Eye, 
  Rocket,
  X,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

interface OnboardingWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

const stepIcons = [Sparkles, FolderPlus, Bot, MessageSquare, Eye, Rocket];

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [, setLocation] = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  
  const { data: progress, refetch: refetchProgress } = trpc.onboarding.getProgress.useQuery();
  const { data: steps } = trpc.onboarding.getSteps.useQuery();
  
  const updateStep = trpc.onboarding.updateStep.useMutation({
    onSuccess: () => refetchProgress(),
  });
  
  const completeOnboarding = trpc.onboarding.complete.useMutation({
    onSuccess: () => {
      setIsVisible(false);
      onComplete?.();
    },
  });
  
  const skipOnboarding = trpc.onboarding.skip.useMutation({
    onSuccess: () => {
      setIsVisible(false);
      onSkip?.();
    },
  });

  const currentStep = progress?.currentStep || 0;
  const totalSteps = steps?.length || 6;
  const progressPercent = ((currentStep) / totalSteps) * 100;

  // Don't show if already completed or skipped
  if (progress?.completedAt || progress?.skipped || !isVisible) {
    return null;
  }

  const currentStepData = steps?.[currentStep];
  const StepIcon = stepIcons[currentStep] || Sparkles;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      updateStep.mutate({ step: currentStep });
    } else {
      completeOnboarding.mutate();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      updateStep.mutate({ step: currentStep - 2, completed: false });
    }
  };

  const handleAction = () => {
    switch (currentStepData?.action) {
      case "create_project":
        setLocation("/projects");
        handleNext();
        break;
      case "chat":
        // Focus chat input if available
        const chatInput = document.querySelector("[data-onboarding='chat-input']") as HTMLElement;
        if (chatInput) {
          chatInput.focus();
        }
        handleNext();
        break;
      default:
        handleNext();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <Card className="w-full max-w-lg mx-4 shadow-2xl">
              <CardHeader className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4"
                  onClick={() => skipOnboarding.mutate()}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <StepIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Step {currentStep + 1} of {totalSteps}
                    </p>
                    <CardTitle className="text-xl">
                      {currentStepData?.title || "Welcome"}
                    </CardTitle>
                  </div>
                </div>
                
                <Progress value={progressPercent} className="h-2" />
              </CardHeader>
              
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {currentStepData?.description || "Let's get started with ADELE"}
                </CardDescription>
                
                {/* Step-specific content */}
                {currentStep === 0 && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">What you'll learn:</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        How to create your first project
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Using AI agents to build applications
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Voice commands and hands-free coding
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Deploying your finished application
                      </li>
                    </ul>
                  </div>
                )}
                
                {currentStep === 2 && (
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {[
                      { name: "Coordinator", desc: "Orchestrates tasks" },
                      { name: "Research", desc: "Gathers information" },
                      { name: "Coder", desc: "Generates code" },
                      { name: "Database", desc: "Designs schemas" },
                      { name: "Security", desc: "Implements auth" },
                      { name: "Reporter", desc: "Creates docs" },
                      { name: "Browser", desc: "Tests UI" },
                    ].map((agent) => (
                      <div
                        key={agent.name}
                        className="p-3 bg-muted/50 rounded-lg text-sm"
                      >
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-muted-foreground text-xs">{agent.desc}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {currentStep === 3 && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm mb-3">Try saying or typing:</p>
                    <div className="space-y-2">
                      <p className="text-sm italic text-muted-foreground">
                        "Build me an e-commerce platform like Amazon"
                      </p>
                      <p className="text-sm italic text-muted-foreground">
                        "Create a project management tool with Kanban boards"
                      </p>
                      <p className="text-sm italic text-muted-foreground">
                        "I need a CRM system for my sales team"
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <Button
                  variant="ghost"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => skipOnboarding.mutate()}
                  >
                    Skip Tour
                  </Button>
                  <Button onClick={handleAction}>
                    {currentStep === totalSteps - 1 ? (
                      "Get Started"
                    ) : (
                      <>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
          
          {/* Spotlight effect for target elements */}
          {currentStepData?.targetElement && (
            <SpotlightOverlay selector={currentStepData.targetElement} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SpotlightOverlay({ selector }: { selector: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const element = document.querySelector(selector);
    if (element) {
      setRect(element.getBoundingClientRect());
    }
  }, [selector]);

  if (!rect) return null;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
        borderRadius: 8,
        border: "2px solid hsl(var(--primary))",
      }}
    />
  );
}
