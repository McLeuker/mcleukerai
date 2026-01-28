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
  // Allow any lovableproject.com subdomain (for Lovable preview)
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/)) return true;
  // Allow any lovable.app subdomain
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

// Map Stripe price IDs to plan names and credits (NEW PRICING)
const PRICE_TO_PLAN: Record<string, { plan: string; credits: number; billingCycle: string }> = {
  // Pro plans
  "price_1St8PXB0LQyHc0cSUfR0Sz7u": { plan: "pro", credits: 700, billingCycle: "monthly" },
  "price_1St8PnB0LQyHc0cSxyKT7KkJ": { plan: "pro", credits: 700, billingCycle: "yearly" },
  // Studio plans
  "price_1St8QuB0LQyHc0cSHex3exfz": { plan: "studio", credits: 1800, billingCycle: "monthly" },
  "price_1St8R4B0LQyHc0cS3NOO4aXq": { plan: "studio", credits: 1800, billingCycle: "yearly" },
};

// Free plan config
const FREE_PLAN = {
  plan: "free",
  credits: 40,
  billingCycle: null,
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, returning free tier");
      
      // Ensure user exists in DB with free plan defaults
      const { data: existingUser } = await supabaseClient
        .from("users")
        .select("monthly_credits, extra_credits, credit_balance, subscription_plan, refills_this_month")
        .eq("user_id", user.id)
        .maybeSingle();

      // If user doesn't have monthly credits set, initialize them
      if (!existingUser || existingUser.monthly_credits === null || existingUser.monthly_credits === 0) {
        await supabaseClient
          .from("users")
          .update({
            monthly_credits: FREE_PLAN.credits,
            subscription_plan: "free",
            subscription_status: "free",
          })
          .eq("user_id", user.id);
      }

      const userDataResult = existingUser || { monthly_credits: FREE_PLAN.credits, extra_credits: 0, credit_balance: FREE_PLAN.credits };

      return new Response(JSON.stringify({
        subscribed: false,
        plan: "free",
        billingCycle: null,
        subscriptionEnd: null,
        monthlyCredits: userDataResult.monthly_credits || FREE_PLAN.credits,
        extraCredits: userDataResult.extra_credits || 0,
        creditBalance: userDataResult.credit_balance || FREE_PLAN.credits,
        refillsThisMonth: existingUser?.refills_this_month || 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    let subscriptionData = {
      subscribed: false,
      plan: "free",
      billingCycle: null as string | null,
      subscriptionEnd: null as string | null,
      monthlyCredits: FREE_PLAN.credits,
    };

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      const priceId = subscription.items.data[0]?.price?.id;
      const planInfo = priceId ? PRICE_TO_PLAN[priceId] : null;
      
      subscriptionData = {
        subscribed: true,
        plan: planInfo?.plan || "pro", // Default to pro if unknown
        billingCycle: planInfo?.billingCycle || null,
        subscriptionEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        monthlyCredits: planInfo?.credits || 700,
      };
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        plan: subscriptionData.plan,
        priceId 
      });

      // Update user record in database
      await supabaseClient
        .from("users")
        .update({
          subscription_plan: subscriptionData.plan,
          billing_cycle: subscriptionData.billingCycle,
          subscription_status: "active",
          stripe_customer_id: customerId,
          subscription_ends_at: subscriptionData.subscriptionEnd,
        })
        .eq("user_id", user.id);
    } else {
      logStep("No active subscription found, reverting to free tier");
      
      // Update user to free tier
      await supabaseClient
        .from("users")
        .update({
          subscription_plan: "free",
          billing_cycle: null,
          subscription_status: "free",
          stripe_customer_id: customerId,
          subscription_ends_at: null,
          monthly_credits: FREE_PLAN.credits,
        })
        .eq("user_id", user.id);
    }

    // Get updated user data
    const { data: finalUserData } = await supabaseClient
      .from("users")
      .select("monthly_credits, extra_credits, credit_balance, refills_this_month")
      .eq("user_id", user.id)
      .maybeSingle();

    return new Response(JSON.stringify({
      ...subscriptionData,
      monthlyCredits: finalUserData?.monthly_credits || subscriptionData.monthlyCredits,
      extraCredits: finalUserData?.extra_credits || 0,
      creditBalance: finalUserData?.credit_balance || 0,
      refillsThisMonth: finalUserData?.refills_this_month || 0,
    }), {
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
