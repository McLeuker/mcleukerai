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

// Credit refill packs per plan (different prices)
const CREDIT_REFILLS = {
  free: {
    credits: 250,
    priceId: "price_1SwA68B0LQyHc0cSm4HD09xL",
    price: 5,
  },
  starter: {
    credits: 500,
    priceId: "price_1SwA68B0LQyHc0cSm4HD09xL", // TODO: Create separate Stripe price
    price: 9,
  },
  pro: {
    credits: 1500,
    priceId: "price_1St8RQB0LQyHc0cSaXgacgo8",
    price: 19,
  },
  enterprise: {
    credits: 5000,
    priceId: "price_1St8hdB0LQyHc0cSBbGILcsV",
    price: 49,
  },
};

// Max refills per month per plan
const MAX_REFILLS: Record<string, number> = {
  free: 999, // unlimited for free users
  starter: 2,
  pro: 3,
  enterprise: 999, // unlimited
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PURCHASE-CREDITS] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
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
    
    // All users can now purchase credits (removed free plan restriction)

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

    // Get the appropriate refill pack for the user's plan
    const refillPack = CREDIT_REFILLS[plan as keyof typeof CREDIT_REFILLS] || CREDIT_REFILLS.pro;
    logStep("Using refill pack", { plan, refillPack });

    // Create checkout session for credit refill
    const origin = req.headers.get("origin") || "https://mcleukerai.lovable.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: refillPack.priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/pricing?credits=success&amount=${refillPack.credits}`,
      cancel_url: `${origin}/pricing?credits=canceled`,
      metadata: {
        user_id: user.id,
        credits: refillPack.credits.toString(),
        type: "credit_refill",
        plan: plan,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, credits: refillPack.credits });

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
