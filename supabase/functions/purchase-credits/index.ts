import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Single credit refill pack (€39 for 1000 credits)
const CREDIT_REFILL = {
  credits: 1000,
  priceId: "price_1St8RQB0LQyHc0cSaXgacgo8",
  price: 39,
};

// Max refills per month per plan
const MAX_REFILLS: Record<string, number> = {
  pro: 1,
  studio: 2,
  enterprise: 999, // unlimited
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PURCHASE-CREDITS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
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

    // Get user's current plan and refill count
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("subscription_plan, subscription_status, refills_this_month")
      .eq("user_id", user.id)
      .single();

    if (userError) throw new Error("Failed to fetch user data");
    
    const plan = userData?.subscription_plan || "free";
    const refillsThisMonth = userData?.refills_this_month || 0;
    
    // Check if user is on a paid plan
    if (plan === "free" || userData?.subscription_status === "free") {
      logStep("User on free plan, denying refill");
      return new Response(JSON.stringify({ 
        error: "Credit refills are only available for Pro and Studio subscribers" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Check refill limits
    const maxRefills = MAX_REFILLS[plan] || 0;
    if (refillsThisMonth >= maxRefills) {
      logStep("Refill limit reached", { plan, refillsThisMonth, maxRefills });
      return new Response(JSON.stringify({ 
        error: `You've reached your monthly refill limit (${maxRefills} per month for ${plan} plan)` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    logStep("Refill allowed", { plan, refillsThisMonth, maxRefills });

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

    // Create checkout session for credit refill
    const origin = req.headers.get("origin") || "https://mcleukerai.lovable.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: CREDIT_REFILL.priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/pricing?credits=success&amount=${CREDIT_REFILL.credits}`,
      cancel_url: `${origin}/pricing?credits=canceled`,
      metadata: {
        user_id: user.id,
        credits: CREDIT_REFILL.credits.toString(),
        type: "credit_refill",
      },
    });

    logStep("Checkout session created", { sessionId: session.id, credits: CREDIT_REFILL.credits });

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
