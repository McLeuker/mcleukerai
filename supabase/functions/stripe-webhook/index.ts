import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Map Stripe price IDs to plan credits
const PRICE_TO_CREDITS: Record<string, number> = {
  // Monthly plans
  "price_1St7yJB0LQyHc0cS88qHoT3y": 300,   // Starter monthly
  "price_1St7yoB0LQyHc0cSI0bZvhFz": 1200,  // Professional monthly
  "price_1St7zBB0LQyHc0cSfgZO131o": 3000,  // Studio monthly
  // Yearly plans
  "price_1St7yeB0LQyHc0cSeo1wf7wx": 300,   // Starter yearly
  "price_1St7z1B0LQyHc0cS20F8A5PM": 1200,  // Professional yearly
  "price_1St7zMB0LQyHc0cSTBMBNej5": 3000,  // Studio yearly
};

// Credit pack amounts
const CREDIT_PACK_AMOUNTS: Record<string, number> = {
  "price_1St7zXB0LQyHc0cSNogSEPG3": 500,
  "price_1St7zhB0LQyHc0cS4RCWBxIm": 1500,
  "price_1St7zrB0LQyHc0cSFoAhNy4c": 5000,
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.text();
    
    // For now, we'll parse without signature verification (development mode)
    // In production, you should verify the webhook signature
    const event = JSON.parse(body) as Stripe.Event;
    
    logStep("Webhook received", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_email || session.customer_details?.email;
        
        if (!customerEmail) {
          logStep("No customer email found in session");
          break;
        }

        // Find user by email
        const { data: users } = await supabase
          .from("users")
          .select("user_id")
          .eq("email", customerEmail)
          .limit(1);

        if (!users || users.length === 0) {
          logStep("User not found for email", { email: customerEmail });
          break;
        }

        const userId = users[0].user_id;

        if (session.mode === "subscription") {
          // Handle subscription checkout
          const subscriptionId = session.subscription as string;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price?.id;
          const credits = priceId ? PRICE_TO_CREDITS[priceId] : 0;

          logStep("Processing subscription", { subscriptionId, priceId, credits });

          // Add monthly credits using the database function
          await supabase.rpc("add_credits", {
            p_user_id: userId,
            p_amount: credits,
            p_type: "subscription_reset",
            p_description: "Monthly subscription credits",
          });

        } else if (session.mode === "payment") {
          // Handle one-time credit purchase
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const priceId = lineItems.data[0]?.price?.id;
          const credits = priceId ? CREDIT_PACK_AMOUNTS[priceId] : 0;

          logStep("Processing credit purchase", { priceId, credits });

          if (credits > 0) {
            // Add purchased credits
            await supabase.rpc("add_credits", {
              p_user_id: userId,
              p_amount: credits,
              p_type: "purchase",
              p_description: `Purchased ${credits} credits`,
            });
          }
        }
        break;
      }

      case "invoice.paid": {
        // Handle subscription renewal
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason === "subscription_cycle") {
          const customerEmail = invoice.customer_email;
          if (!customerEmail) break;

          const { data: users } = await supabase
            .from("users")
            .select("user_id")
            .eq("email", customerEmail)
            .limit(1);

          if (!users || users.length === 0) break;

          const userId = users[0].user_id;
          const priceId = invoice.lines.data[0]?.price?.id;
          const credits = priceId ? PRICE_TO_CREDITS[priceId] : 0;

          logStep("Processing subscription renewal", { priceId, credits });

          // Reset monthly credits
          await supabase.rpc("add_credits", {
            p_user_id: userId,
            p_amount: credits,
            p_type: "subscription_reset",
            p_description: "Monthly subscription credits renewal",
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        // Handle subscription cancellation
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        
        if (customer.deleted || !("email" in customer) || !customer.email) break;

        const { data: users } = await supabase
          .from("users")
          .select("user_id")
          .eq("email", customer.email)
          .limit(1);

        if (!users || users.length === 0) break;

        logStep("Processing subscription cancellation", { customerId });

        await supabase
          .from("users")
          .update({
            subscription_plan: "free",
            billing_cycle: null,
            subscription_status: "free",
            monthly_credits: 0,
            subscription_ends_at: null,
          })
          .eq("user_id", users[0].user_id);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
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
