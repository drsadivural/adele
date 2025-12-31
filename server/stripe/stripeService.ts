import Stripe from "stripe";
import { ENV } from "../_core/env";
import { SUBSCRIPTION_PLANS, ONE_TIME_PRODUCTS, PlanId, getPlanByPriceId } from "./products";

// Initialize Stripe with the secret key
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = ENV.stripeSecretKey;
    if (!secretKey) {
      throw new Error("Stripe secret key not configured");
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2025-12-15.clover",
    });
  }
  return stripeInstance;
}

// Create or get Stripe customer
export async function getOrCreateCustomer(
  userId: number,
  email: string,
  name?: string
): Promise<string> {
  const stripe = getStripe();
  
  // Search for existing customer by metadata
  const existingCustomers = await stripe.customers.search({
    query: `metadata['user_id']:'${userId}'`,
  });
  
  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }
  
  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      user_id: userId.toString(),
    },
  });
  
  return customer.id;
}

// Create checkout session for subscription
export async function createSubscriptionCheckout(
  userId: number,
  email: string,
  name: string | null,
  planId: PlanId,
  origin: string
): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe();
  const plan = SUBSCRIPTION_PLANS[planId];
  
  if (!plan.priceId) {
    throw new Error("Cannot create checkout for free plan");
  }
  
  const customerId = await getOrCreateCustomer(userId, email, name || undefined);
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    client_reference_id: userId.toString(),
    mode: "subscription",
    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ],
    success_url: `${origin}/dashboard?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?subscription=canceled`,
    allow_promotion_codes: true,
    metadata: {
      user_id: userId.toString(),
      customer_email: email,
      customer_name: name || "",
      plan_id: planId,
    },
    subscription_data: {
      metadata: {
        user_id: userId.toString(),
        plan_id: planId,
      },
    },
  });
  
  return {
    url: session.url!,
    sessionId: session.id,
  };
}

// Create checkout session for one-time purchase
export async function createOneTimeCheckout(
  userId: number,
  email: string,
  name: string | null,
  productId: keyof typeof ONE_TIME_PRODUCTS,
  origin: string
): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe();
  const product = ONE_TIME_PRODUCTS[productId];
  
  const customerId = await getOrCreateCustomer(userId, email, name || undefined);
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    client_reference_id: userId.toString(),
    mode: "payment",
    line_items: [
      {
        price: product.priceId,
        quantity: 1,
      },
    ],
    success_url: `${origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?payment=canceled`,
    allow_promotion_codes: true,
    metadata: {
      user_id: userId.toString(),
      customer_email: email,
      customer_name: name || "",
      product_id: productId,
    },
  });
  
  return {
    url: session.url!,
    sessionId: session.id,
  };
}

// Create customer portal session
export async function createPortalSession(
  customerId: string,
  origin: string
): Promise<string> {
  const stripe = getStripe();
  
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/dashboard`,
  });
  
  return session.url;
}

// Get subscription details
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId);
}

// Cancel subscription
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  
  if (cancelAtPeriodEnd) {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } else {
    return stripe.subscriptions.cancel(subscriptionId);
  }
}

// Resume subscription
export async function resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

// Update subscription plan
export async function updateSubscriptionPlan(
  subscriptionId: string,
  newPlanId: PlanId
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  const newPlan = SUBSCRIPTION_PLANS[newPlanId];
  
  if (!newPlan.priceId) {
    throw new Error("Cannot update to free plan via this method");
  }
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPlan.priceId,
      },
    ],
    proration_behavior: "create_prorations",
    metadata: {
      plan_id: newPlanId,
    },
  });
}

// Get payment history for a customer
export async function getPaymentHistory(
  customerId: string,
  limit: number = 10
): Promise<Stripe.PaymentIntent[]> {
  const stripe = getStripe();
  
  const paymentIntents = await stripe.paymentIntents.list({
    customer: customerId,
    limit,
  });
  
  return paymentIntents.data;
}

// Get invoices for a customer
export async function getInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  const stripe = getStripe();
  
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });
  
  return invoices.data;
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = ENV.stripeWebhookSecret;
  
  if (!webhookSecret) {
    throw new Error("Stripe webhook secret not configured");
  }
  
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

// Process webhook events
export async function processWebhookEvent(event: Stripe.Event): Promise<{
  type: string;
  userId?: number;
  planId?: PlanId;
  subscriptionId?: string;
  customerId?: string;
}> {
  const result: {
    type: string;
    userId?: number;
    planId?: PlanId;
    subscriptionId?: string;
    customerId?: string;
  } = { type: event.type };
  
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      result.userId = parseInt(session.client_reference_id || session.metadata?.user_id || "0");
      result.customerId = session.customer as string;
      
      if (session.mode === "subscription") {
        result.subscriptionId = session.subscription as string;
        result.planId = session.metadata?.plan_id as PlanId;
      }
      break;
    }
    
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      result.userId = parseInt(subscription.metadata?.user_id || "0");
      result.subscriptionId = subscription.id;
      result.customerId = subscription.customer as string;
      result.planId = subscription.metadata?.plan_id as PlanId;
      break;
    }
    
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      result.userId = parseInt(subscription.metadata?.user_id || "0");
      result.subscriptionId = subscription.id;
      result.customerId = subscription.customer as string;
      break;
    }
    
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      result.customerId = invoice.customer as string;
      const sub = (invoice as any).subscription;
      result.subscriptionId = typeof sub === 'string' ? sub : sub?.id;
      break;
    }
    
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      result.customerId = invoice.customer as string;
      const sub2 = (invoice as any).subscription;
      result.subscriptionId = typeof sub2 === 'string' ? sub2 : sub2?.id;
      break;
    }
  }
  
  return result;
}
