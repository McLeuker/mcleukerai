import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Credit pack configuration
const CREDIT_PACKS = {
  pack_500: {
    priceId: "price_1St7zXB0LQyHc0cSNogSEPG3",
    credits: 500,
    price: 10,
  },
  pack_1500: {
    priceId: "price_1St7zhB0LQyHc0cS4RCWBxIm",
    credits: 1500,
    price: 25,
  },
  pack_5000: {
    priceId: "price_1St7zrB0LQyHc0cSFoAhNy4c",
    credits: 5000,
    price: 75,
  },
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

    const { packId } = await req.json();
    
    // Validate pack
    if (!packId || !CREDIT_PACKS[packId as keyof typeof CREDIT_PACKS]) {
      throw new Error("Invalid credit pack selected");
    }

    const pack = CREDIT_PACKS[packId as keyof typeof CREDIT_PACKS];
    logStep("Pack selected", { packId, credits: pack.credits, priceId: pack.priceId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create checkout session for one-time payment
    const origin = req.headers.get("origin") || "https://mcleukerai.lovable.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: pack.priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/dashboard?credits=success&amount=${pack.credits}`,
      cancel_url: `${origin}/pricing?credits=canceled`,
      metadata: {
        user_id: user.id,
        pack_id: packId,
        credits: pack.credits.toString(),
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
