import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const allowedOrigins = [
  "https://mcleukerai.lovable.app",
  "https://preview--mcleukerai.lovable.app",
  "https://www.mcleukerai.com",
  "https://mcleukerai.com",
  "http://localhost:5173",
  "http://localhost:8080",
];

// Allow Lovable preview domains dynamically
function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/)) return true;
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovable\.app$/)) return true;
  return false;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = isAllowedOrigin(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Credentials": "true",
  };
}

// UPDATED Plan configuration with competitive credit amounts
// Based on market research: Manus AI, ChatGPT, Perplexity, Claude pricing
const SUBSCRIPTION_PLANS = {
  starter: {
    monthly: { priceId: "price_1Sw8WgB0LQyHc0cSWfzoRjAV", credits: 1500 },
    yearly: { priceId: "price_1Sw8WpB0LQyHc0cSMOT9u005", credits: 1500 },
  },
  pro: {
    monthly: { priceId: "price_1St8PXB0LQyHc0cSUfR0Sz7u", credits: 5000 },
    yearly: { priceId: "price_1St8PnB0LQyHc0cSxyKT7KkJ", credits: 5000 },
  },
  enterprise: {
    monthly: { priceId: "price_1Sw8X6B0LQyHc0cS4GDSsnRI", credits: 25000 },
    yearly: { priceId: "price_1Sw8XEB0LQyHc0cSD8UBS1SY", credits: 25000 },
  },
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { plan, billingCycle } = await req.json();
    
    // Validate plan and billing cycle (starter, pro, and enterprise are purchasable)
    if (!plan || !["starter", "pro", "enterprise"].includes(plan)) {
      throw new Error("Invalid plan selected. Choose Starter, Pro, or Enterprise.");
    }
    if (!billingCycle || !["monthly", "yearly"].includes(billingCycle)) {
      throw new Error("Invalid billing cycle");
    }

    const planConfig = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS];
    const priceConfig = planConfig[billingCycle as "monthly" | "yearly"];
    logStep("Plan selected", { plan, billingCycle, priceId: priceConfig.priceId, credits: priceConfig.credits });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://mcleukerai.lovable.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceConfig.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/dashboard?checkout=success&plan=${plan}`,
      cancel_url: `${origin}/pricing?checkout=canceled`,
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: plan,
          billing_cycle: billingCycle,
          monthly_credits: priceConfig.credits.toString(),
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
