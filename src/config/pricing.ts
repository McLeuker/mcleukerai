// Subscription plan configuration - CREDIT-BASED ACCESS MODEL
// All users have equal access to all features - credits are the only gate
export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free",
    description: "Discovery access with full AI capabilities",
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyCredits: 40,
    features: [
      "40 AI credits per month",
      "Full AI research access",
      "Market analysis & trends",
      "Supplier search",
      "PDF & Excel exports",
    ],
  },
  pro: {
    name: "Pro",
    description: "For professionals who need more credits",
    monthlyPrice: 39,
    yearlyPrice: 384,
    monthlyCredits: 700,
    popular: true,
    features: [
      "700 AI credits per month",
      "All features included",
      "Priority support",
      "Credit refills available",
    ],
    maxRefillsPerMonth: 1,
  },
  studio: {
    name: "Studio",
    description: "For teams and agencies",
    monthlyPrice: 89,
    yearlyPrice: 875,
    monthlyCredits: 1800,
    features: [
      "1,800 AI credits per month",
      "All features included",
      "Team collaboration (2–5 seats)",
      "Advanced analytics",
      "Dedicated support",
      "Credit refills available",
    ],
    maxRefillsPerMonth: 2,
  },
  enterprise: {
    name: "Enterprise",
    description: "Custom solutions for large organizations",
    monthlyPrice: null,
    yearlyPrice: null,
    monthlyCredits: null,
    hidden: true, // Not shown on pricing page
    features: [
      "Custom credit allocation",
      "Unlimited team seats",
      "White-label options",
      "Dedicated account manager",
      "SLA guarantees",
      "Custom API access",
    ],
  },
} as const;

// Stripe price IDs for plans
export const STRIPE_PRICES = {
  pro: {
    monthly: "price_1St8PXB0LQyHc0cSUfR0Sz7u",
    yearly: "price_1St8PnB0LQyHc0cSxyKT7KkJ",
  },
  studio: {
    monthly: "price_1St8QuB0LQyHc0cSHex3exfz",
    yearly: "price_1St8R4B0LQyHc0cS3NOO4aXq",
  },
} as const;

// Credit refill packs (available for paid plans)
export const CREDIT_REFILLS = {
  pro: {
    credits: 1000,
    price: 39,
    priceId: "price_1St8RQB0LQyHc0cSaXgacgo8",
    perCredit: 0.039,
  },
  studio: {
    credits: 1000,
    price: 45,
    priceId: "price_1St8hdB0LQyHc0cSBbGILcsV",
    perCredit: 0.045,
  },
} as const;

// Default refill for backward compatibility
export const CREDIT_REFILL = CREDIT_REFILLS.pro;

// Credit consumption per action - SAME FOR ALL USERS
// Credits are the only gate, not subscription tier
export const CREDIT_COSTS = {
  ai_research_query: { name: "AI Research Query", credits: 4 },
  market_analysis: { name: "Market Analysis", credits: 10 },
  trend_report: { name: "Trend Report", credits: 18 },
  supplier_search: { name: "Supplier Search", credits: 8 },
  pdf_export: { name: "PDF Export", credits: 3 },
  excel_export: { name: "Excel Export", credits: 4 },
} as const;

// For display in UI
export const CREDIT_USAGE = Object.values(CREDIT_COSTS).map(c => ({
  action: c.name,
  credits: c.credits,
}));

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;
export type ActionType = keyof typeof CREDIT_COSTS;
