// Subscription plan configuration - NEW PRICING (3 PUBLIC PLANS)
export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free",
    description: "Discovery access with AI research",
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyCredits: 40,
    features: [
      "40 AI credits per month",
      "AI research only (short queries)",
      "No exports",
      "Max 5 queries per day",
    ],
    limitations: {
      noExports: true,
      rateLimit: true,
      maxQueriesPerDay: 5,
      maxQueriesPerMinute: 1,
    },
  },
  pro: {
    name: "Pro",
    description: "For professionals who need full access",
    monthlyPrice: 39,
    yearlyPrice: 384,
    monthlyCredits: 700,
    popular: true,
    features: [
      "700 AI credits per month",
      "Full AI search",
      "Market & sustainability analysis",
      "Supplier database access",
      "Trend insights",
      "PDF & Excel export",
      "Priority support",
    ],
    maxRefillsPerMonth: 1,
    fairUseLimits: {
      maxHeavyQueriesPerDay: 20, // Market Analysis / Trend Report
    },
  },
  studio: {
    name: "Studio",
    description: "For teams and agencies",
    monthlyPrice: 89,
    yearlyPrice: 875,
    monthlyCredits: 1800,
    features: [
      "1,800 AI credits per month",
      "Everything in Pro",
      "Team collaboration (2–5 seats)",
      "Advanced analytics",
      "Limited custom integrations",
      "Dedicated support",
    ],
    maxRefillsPerMonth: 2,
    heavyUsageThreshold: 1500, // Beyond this, heavy actions cost 2x
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

// Stripe price IDs for new plans
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

// Credit refill packs (paid plans only) - different prices per plan
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

// Credit consumption per action
export const CREDIT_COSTS = {
  ai_research_query: { name: "AI Research Query", credits: 4 },
  market_analysis: { name: "Market Analysis", credits: 10 },
  trend_report: { name: "Trend Report", credits: 18 },
  supplier_search: { name: "Supplier Search", credits: 8 },
  pdf_export: { name: "PDF Export", credits: 3 },
  excel_export: { name: "Excel Export", credits: 4 },
  // Manus Agent costs
  manus_full: { name: "Manus Full Agent", credits: 15, maxCredits: 40 },
  manus_light: { name: "Manus Light Agent", credits: 8, maxCredits: 25 },
} as const;

// For display in UI
export const CREDIT_USAGE = Object.values(CREDIT_COSTS).map(c => ({
  action: c.name,
  credits: c.credits,
}));

// Fair-use limits per plan
export const FAIR_USE_LIMITS = {
  free: {
    maxQueriesPerDay: 5,
    maxQueriesPerMinute: 1,
    maxHeavyQueriesPerDay: 0, // No heavy queries for free
    allowedActions: ["ai_research_query"], // Only basic research
  },
  pro: {
    maxQueriesPerDay: 100,
    maxQueriesPerMinute: null, // No per-minute limit
    maxHeavyQueriesPerDay: 20, // Market Analysis / Trend Report
    allowedActions: null, // All actions allowed
  },
  studio: {
    maxQueriesPerDay: 500,
    maxQueriesPerMinute: null,
    maxHeavyQueriesPerDay: null, // No daily limit, but 2x cost beyond threshold
    allowedActions: null,
    heavyUsageThreshold: 1500, // Credits used this month before 2x kicks in
    heavyActionMultiplier: 2, // Cost multiplier beyond threshold
  },
  enterprise: {
    maxQueriesPerDay: null, // unlimited
    maxQueriesPerMinute: null,
    maxHeavyQueriesPerDay: null,
    allowedActions: null,
  },
} as const;

// Heavy actions that count toward daily limits
export const HEAVY_ACTIONS = ["market_analysis", "trend_report"] as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;
export type ActionType = keyof typeof CREDIT_COSTS;
