// ADELE Subscription Plans and Products

export const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Free",
    description: "Perfect for trying out ADELE",
    price: 0,
    priceId: null, // No Stripe price for free tier
    features: [
      "3 projects",
      "Basic AI agents",
      "Community templates",
      "Email support",
      "1GB storage",
    ],
    limits: {
      projects: 3,
      agentsPerProject: 3,
      deploymentsPerMonth: 5,
      storageGB: 1,
      collaborators: 1,
      voiceMinutesPerMonth: 30,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For professionals and small teams",
    price: 29,
    priceId: "price_pro_monthly", // Will be created in Stripe
    features: [
      "Unlimited projects",
      "All AI agents",
      "Premium templates",
      "Priority support",
      "10GB storage",
      "Custom domains",
      "Team collaboration (5 members)",
      "Advanced analytics",
    ],
    limits: {
      projects: -1, // unlimited
      agentsPerProject: 7,
      deploymentsPerMonth: -1,
      storageGB: 10,
      collaborators: 5,
      voiceMinutesPerMonth: 300,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations with custom needs",
    price: 99,
    priceId: "price_enterprise_monthly", // Will be created in Stripe
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "SSO/SAML authentication",
      "Dedicated support",
      "100GB storage",
      "Custom integrations",
      "SLA guarantee",
      "On-premise deployment option",
      "White-label option",
    ],
    limits: {
      projects: -1,
      agentsPerProject: -1,
      deploymentsPerMonth: -1,
      storageGB: 100,
      collaborators: -1,
      voiceMinutesPerMonth: -1,
    },
  },
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;
export type Plan = (typeof SUBSCRIPTION_PLANS)[PlanId];

// One-time purchase products
export const ONE_TIME_PRODUCTS = {
  extraStorage: {
    id: "extra_storage",
    name: "Extra Storage (10GB)",
    description: "Add 10GB of additional storage to your account",
    price: 9.99,
    priceId: "price_extra_storage",
  },
  premiumTemplate: {
    id: "premium_template",
    name: "Premium Template Pack",
    description: "Access to 50+ premium enterprise templates",
    price: 49.99,
    priceId: "price_premium_templates",
  },
  prioritySupport: {
    id: "priority_support",
    name: "Priority Support (1 month)",
    description: "Get priority response within 4 hours",
    price: 19.99,
    priceId: "price_priority_support",
  },
} as const;

// Helper function to check if user has access to a feature
export function hasFeatureAccess(
  plan: PlanId,
  feature: keyof Plan["limits"],
  currentUsage: number
): boolean {
  const planLimits = SUBSCRIPTION_PLANS[plan].limits;
  const limit = planLimits[feature];
  
  // -1 means unlimited
  if (limit === -1) return true;
  
  return currentUsage < limit;
}

// Get plan by price ID
export function getPlanByPriceId(priceId: string): PlanId | null {
  for (const [planId, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (plan.priceId === priceId) {
      return planId as PlanId;
    }
  }
  return null;
}
