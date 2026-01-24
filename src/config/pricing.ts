// Subscription plan configuration - NEW PRICING (3 PUBLIC PLANS)
export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free",
    description: "Get started with basic AI research",
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyCredits: 40,
    features: [
      "40 AI credits per month",
      "AI research only",
      "No exports",
      "Rate limited",
    ],
    limitations: {
      noExports: true,
      rateLimit: true,
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

// Credit refill pack (paid plans only)
export const CREDIT_REFILL = {
  credits: 1000,
  price: 39,
  priceId: "price_1St8RQB0LQyHc0cSaXgacgo8",
  perCredit: 0.039,
} as const;

// Credit consumption per action
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

// Fair-use limits
export const FAIR_USE_LIMITS = {
  free: {
    maxHeavyQueriesPerHour: 5,
    maxTrendReportsPerDay: 2,
    maxTotalQueriesPerDay: 20,
  },
  pro: {
    maxHeavyQueriesPerHour: 30,
    maxTrendReportsPerDay: 10,
    maxTotalQueriesPerDay: 100,
  },
  studio: {
    maxHeavyQueriesPerHour: 100,
    maxTrendReportsPerDay: 50,
    maxTotalQueriesPerDay: 500,
  },
  enterprise: {
    maxHeavyQueriesPerHour: null, // unlimited
    maxTrendReportsPerDay: null,
    maxTotalQueriesPerDay: null,
  },
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;
export type ActionType = keyof typeof CREDIT_COSTS;
