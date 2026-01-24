import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NEW Plan configuration with Stripe price IDs
const SUBSCRIPTION_PLANS = {
  pro: {
    monthly: { priceId: "price_1St8PXB0LQyHc0cSUfR0Sz7u", credits: 700 },
    yearly: { priceId: "price_1St8PnB0LQyHc0cSxyKT7KkJ", credits: 700 },
  },
  studio: {
    monthly: { priceId: "price_1St8QuB0LQyHc0cSHex3exfz", credits: 1800 },
    yearly: { priceId: "price_1St8R4B0LQyHc0cS3NOO4aXq", credits: 1800 },
  },
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
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
    
    // Validate plan and billing cycle (only pro and studio are purchasable)
    if (!plan || !["pro", "studio"].includes(plan)) {
      throw new Error("Invalid plan selected. Choose Pro or Studio.");
    }
    if (!billingCycle || !["monthly", "yearly"].includes(billingCycle)) {
      throw new Error("Invalid billing cycle");
    }

    const planConfig = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS];
    const priceConfig = planConfig[billingCycle as "monthly" | "yearly"];
    logStep("Plan selected", { plan, billingCycle, priceId: priceConfig.priceId });

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
