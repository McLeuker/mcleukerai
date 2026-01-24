import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// NEW PRICING: Map Stripe price IDs to plan credits
const PRICE_TO_CREDITS: Record<string, number> = {
  // Pro plans (€39/mo, 700 credits)
  "price_1St8PXB0LQyHc0cSUfR0Sz7u": 700,   // Pro monthly
  "price_1St8PnB0LQyHc0cSxyKT7KkJ": 700,   // Pro yearly
  // Studio plans (€89/mo, 1800 credits)
  "price_1St8QuB0LQyHc0cSHex3exfz": 1800,  // Studio monthly
  "price_1St8R4B0LQyHc0cS3NOO4aXq": 1800,  // Studio yearly
};

// Credit refill prices per plan
const CREDIT_REFILL_PRICES: Record<string, number> = {
  "price_1St8RQB0LQyHc0cSaXgacgo8": 1000, // Pro refill (€39)
  "price_1St8hdB0LQyHc0cSBbGILcsV": 1000, // Studio refill (€45)
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

          // Reset refills counter for new subscription
          await supabase
            .from("users")
            .update({ refills_this_month: 0 })
            .eq("user_id", userId);

        } else if (session.mode === "payment") {
          // Handle credit refill purchase
          const metadata = session.metadata;
          
          if (metadata?.type === "credit_refill") {
            const credits = parseInt(metadata.credits || "0", 10);
            
            logStep("Processing credit refill", { credits });

            if (credits > 0) {
              // Add purchased credits to extra_credits
              await supabase.rpc("add_credits", {
                p_user_id: userId,
                p_amount: credits,
                p_type: "purchase",
                p_description: `Credit refill - ${credits} credits`,
              });

              // Increment refills counter
              const { data: userData } = await supabase
                .from("users")
                .select("refills_this_month")
                .eq("user_id", userId)
                .single();

              await supabase
                .from("users")
                .update({ refills_this_month: (userData?.refills_this_month || 0) + 1 })
                .eq("user_id", userId);
            }
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

          // Reset refills counter on renewal
          await supabase
            .from("users")
            .update({ refills_this_month: 0 })
            .eq("user_id", userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        // Handle subscription cancellation - revert to free plan
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

        // Revert to free tier (40 credits/month)
        await supabase
          .from("users")
          .update({
            subscription_plan: "free",
            billing_cycle: null,
            subscription_status: "free",
            monthly_credits: 40, // Free tier credits
            subscription_ends_at: null,
            refills_this_month: 0,
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
