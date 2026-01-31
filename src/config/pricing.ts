// Subscription plan configuration - CREDIT-BASED ACCESS MODEL
// All users have equal access to all features - credits are the only gate
export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free",
    description: "Get started with daily credits",
    monthlyPrice: 0,
    yearlyPrice: 0,
    dailyCredits: 100,
    features: [
      "100 credits per day",
      "Quick Chat (5 credits)",
      "Quick Search (10 credits)",
      "Full AI research access",
      "PDF & Excel exports",
    ],
  },
  starter: {
    name: "Starter",
    description: "For individuals who need more power",
    monthlyPrice: 19,
    yearlyPrice: 190,
    dailyCredits: 500,
    features: [
      "500 credits per day",
      "Quick & Deep Chat",
      "Quick & Deep Search",
      "Priority support",
      "All export formats",
    ],
  },
  pro: {
    name: "Pro",
    description: "For professionals and power users",
    monthlyPrice: 49,
    yearlyPrice: 490,
    dailyCredits: 1500,
    popular: true,
    features: [
      "1,500 credits per day",
      "All chat & search modes",
      "Priority processing",
      "Advanced analytics",
      "Team collaboration",
    ],
  },
  enterprise: {
    name: "Enterprise",
    description: "Custom solutions for large organizations",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    dailyCredits: 6000,
    features: [
      "6,000 credits per day",
      "Unlimited team seats",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantees",
      "White-label options",
    ],
  },
} as const;

// Stripe price IDs for plans
export const STRIPE_PRICES = {
  starter: {
    monthly: "price_starter_monthly",
    yearly: "price_starter_yearly",
  },
  pro: {
    monthly: "price_1St8PXB0LQyHc0cSUfR0Sz7u",
    yearly: "price_1St8PnB0LQyHc0cSxyKT7KkJ",
  },
  enterprise: {
    monthly: "price_enterprise_monthly",
    yearly: "price_enterprise_yearly",
  },
} as const;

// Credit refill packs (available for paid plans)
export const CREDIT_REFILLS = {
  starter: {
    credits: 500,
    price: 15,
    priceId: "price_refill_starter",
    perCredit: 0.03,
  },
  pro: {
    credits: 1000,
    price: 25,
    priceId: "price_1St8RQB0LQyHc0cSaXgacgo8",
    perCredit: 0.025,
  },
  enterprise: {
    credits: 2000,
    price: 40,
    priceId: "price_refill_enterprise",
    perCredit: 0.02,
  },
} as const;

// Default refill for backward compatibility
export const CREDIT_REFILL = CREDIT_REFILLS.pro;

// Credit consumption per action - SAME FOR ALL USERS
// Credits are the only gate, not subscription tier
export const CREDIT_COSTS = {
  quick_chat: { name: "Quick Chat", credits: 5 },
  deep_chat: { name: "Deep Chat", credits: 50 },
  quick_search: { name: "Quick Search", credits: 10 },
  deep_search: { name: "Deep Search", credits: 100 },
  pdf_export: { name: "PDF Export", credits: 5 },
  excel_export: { name: "Excel Export", credits: 5 },
  ppt_export: { name: "PowerPoint Export", credits: 10 },
} as const;

// For display in UI
export const CREDIT_USAGE = Object.values(CREDIT_COSTS).map(c => ({
  action: c.name,
  credits: c.credits,
}));

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;
export type ActionType = keyof typeof CREDIT_COSTS;
