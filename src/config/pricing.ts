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

// Credit usage estimates for different task types
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
