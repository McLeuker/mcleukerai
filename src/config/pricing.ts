// Subscription plan configuration
export const SUBSCRIPTION_PLANS = {
  starter: {
    name: "Starter",
    description: "Perfect for individuals getting started",
    monthlyPrice: 19,
    yearlyPrice: 187,
    monthlyCredits: 300,
    features: [
      "300 AI credits per month",
      "Basic fashion research",
      "Standard support",
      "Export to PDF",
    ],
  },
  professional: {
    name: "Professional",
    description: "For professionals and growing teams",
    monthlyPrice: 49,
    yearlyPrice: 482,
    monthlyCredits: 1200,
    popular: true,
    features: [
      "1,200 AI credits per month",
      "Advanced market analysis",
      "Priority support",
      "Export to PDF & Excel",
      "Supplier database access",
      "Trend forecasting",
    ],
  },
  studio: {
    name: "Studio",
    description: "For studios and agencies",
    monthlyPrice: 99,
    yearlyPrice: 974,
    monthlyCredits: 3000,
    features: [
      "3,000 AI credits per month",
      "Full platform access",
      "Dedicated support",
      "All export formats",
      "Custom integrations",
      "Team collaboration",
      "Advanced analytics",
    ],
  },
  enterprise: {
    name: "Enterprise",
    description: "Custom solutions for large organizations",
    monthlyPrice: null,
    yearlyPrice: null,
    monthlyCredits: null,
    features: [
      "Custom credit allocation",
      "White-label options",
      "Dedicated account manager",
      "SLA guarantees",
      "Custom API access",
      "On-premise deployment",
    ],
  },
} as const;

export const CREDIT_PACKS = {
  pack_500: {
    credits: 500,
    price: 10,
    perCredit: 0.02,
  },
  pack_1500: {
    credits: 1500,
    price: 25,
    perCredit: 0.0167,
    popular: true,
  },
  pack_5000: {
    credits: 5000,
    price: 75,
    perCredit: 0.015,
  },
} as const;

export const CREDIT_USAGE = [
  { action: "AI Research Query", credits: 5 },
  { action: "Market Analysis", credits: 10 },
  { action: "Trend Report", credits: 15 },
  { action: "Supplier Search", credits: 8 },
  { action: "PDF Export", credits: 2 },
  { action: "Excel Export", credits: 3 },
] as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;
export type CreditPackId = keyof typeof CREDIT_PACKS;
