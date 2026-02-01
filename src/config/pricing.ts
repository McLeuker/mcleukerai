// McLeuker AI Pricing Configuration
// Updated based on competitive market research (Feb 2026)
// Comparable to: Manus AI, ChatGPT, Perplexity, Claude

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  credits: number; // Credits per MONTH
  features: string[];
  popular?: boolean;
  cta: string;
}

export const pricingPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Get started with basic fashion research",
    monthlyPrice: 0,
    yearlyPrice: 0,
    credits: 300, // 300 credits/month (~10/day)
    features: [
      "300 credits per month",
      "Basic fashion research",
      "Standard response time",
      "Community support",
      "1 concurrent task",
    ],
    cta: "Get Started",
  },
  {
    id: "starter",
    name: "Starter",
    description: "For individuals and small teams",
    monthlyPrice: 19,
    yearlyPrice: 190, // ~$15.83/month
    credits: 1500, // 1,500 credits/month (~50/day)
    features: [
      "1,500 credits per month",
      "Full AI-powered research",
      "Trend forecasting",
      "Market intelligence",
      "PDF & Excel exports",
      "Email support",
      "3 concurrent tasks",
    ],
    cta: "Subscribe Now",
  },
  {
    id: "pro",
    name: "Pro",
    description: "For professionals and growing businesses",
    monthlyPrice: 49,
    yearlyPrice: 490, // ~$40.83/month
    credits: 5000, // 5,000 credits/month (~167/day)
    popular: true,
    features: [
      "5,000 credits per month",
      "Everything in Starter",
      "Advanced analytics",
      "Supplier research",
      "Sustainability audits",
      "Priority support",
      "API access",
      "10 concurrent tasks",
    ],
    cta: "Subscribe Now",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations with custom needs",
    monthlyPrice: 199,
    yearlyPrice: 1990, // ~$165.83/month
    credits: 25000, // 25,000 credits/month (~833/day)
    features: [
      "25,000 credits per month",
      "Everything in Pro",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "Advanced security",
      "Team collaboration",
      "Unlimited concurrent tasks",
      "Custom training",
    ],
    cta: "Contact Sales",
  },
];

// Credit usage estimates for different task types (simple values)
export const creditUsage = {
  simpleQuery: 5,        // Basic question
  webSearch: 15,         // Search + analysis
  deepResearch: 50,      // Multi-source research
  trendAnalysis: 75,     // Trend forecasting
  marketIntel: 100,      // Full market intelligence
  supplierResearch: 80,  // Supplier analysis
  sustainabilityAudit: 120, // Sustainability check
  excelExport: 30,       // Generate Excel file
  pdfReport: 40,         // Generate PDF report
  imageGeneration: 50,   // AI image generation
};

// Credit costs with name and credits for UsageActivity component
export const CREDIT_COSTS: Record<string, { name: string; credits: number }> = {
  ai_research_query: { name: "AI Research Query", credits: 5 },
  market_analysis: { name: "Market Analysis", credits: 50 },
  trend_report: { name: "Trend Report", credits: 75 },
  supplier_search: { name: "Supplier Search", credits: 80 },
  pdf_export: { name: "PDF Export", credits: 40 },
  excel_export: { name: "Excel Export", credits: 30 },
  simpleQuery: { name: "Simple Query", credits: 5 },
  webSearch: { name: "Web Search", credits: 15 },
  deepResearch: { name: "Deep Research", credits: 50 },
  trendAnalysis: { name: "Trend Analysis", credits: 75 },
  marketIntel: { name: "Market Intelligence", credits: 100 },
  supplierResearch: { name: "Supplier Research", credits: 80 },
  sustainabilityAudit: { name: "Sustainability Audit", credits: 120 },
  excelExport: { name: "Excel Export", credits: 30 },
  pdfReport: { name: "PDF Report", credits: 40 },
  imageGeneration: { name: "Image Generation", credits: 50 },
};

// Credit usage as array for Pricing page display
export const CREDIT_USAGE = [
  { action: "Simple Query", credits: 5 },
  { action: "Web Search", credits: 15 },
  { action: "Deep Research", credits: 50 },
  { action: "Trend Analysis", credits: 75 },
  { action: "Market Intelligence", credits: 100 },
  { action: "Supplier Research", credits: 80 },
  { action: "Sustainability Audit", credits: 120 },
  { action: "Excel Export", credits: 30 },
  { action: "PDF Report", credits: 40 },
  { action: "Image Generation", credits: 50 },
];

// Subscription plans as object keyed by plan ID (for useSubscription hook)
export const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Free",
    description: "Get started with basic fashion research",
    monthlyPrice: 0,
    yearlyPrice: 0,
    credits: 300,
    dailyCredits: 10,
    maxRefillsPerMonth: 0,
    popular: false,
    features: pricingPlans[0].features,
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "For individuals and small teams",
    monthlyPrice: 19,
    yearlyPrice: 190,
    credits: 1500,
    dailyCredits: 50,
    maxRefillsPerMonth: 1,
    popular: false,
    features: pricingPlans[1].features,
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For professionals and growing businesses",
    monthlyPrice: 49,
    yearlyPrice: 490,
    credits: 5000,
    dailyCredits: 167,
    maxRefillsPerMonth: 2,
    popular: true,
    features: pricingPlans[2].features,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations with custom needs",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    credits: 25000,
    dailyCredits: 833,
    maxRefillsPerMonth: 5,
    popular: false,
    features: pricingPlans[3].features,
  },
} as const;

// Credit refill packs for paid plans
export const CREDIT_REFILLS = {
  starter: {
    credits: 500,
    price: 9,
    perCredit: 9 / 500,
  },
  pro: {
    credits: 1500,
    price: 19,
    perCredit: 19 / 1500,
  },
  enterprise: {
    credits: 5000,
    price: 49,
    perCredit: 49 / 5000,
  },
};
