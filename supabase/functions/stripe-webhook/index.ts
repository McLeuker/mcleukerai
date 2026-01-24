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

// Map price IDs to plan names
const PRICE_TO_PLAN: Record<string, { plan: string; cycle: string }> = {
  "price_1St8PXB0LQyHc0cSUfR0Sz7u": { plan: "pro", cycle: "monthly" },
  "price_1St8PnB0LQyHc0cSxyKT7KkJ": { plan: "pro", cycle: "yearly" },
  "price_1St8QuB0LQyHc0cSHex3exfz": { plan: "studio", cycle: "monthly" },
  "price_1St8R4B0LQyHc0cS3NOO4aXq": { plan: "studio", cycle: "yearly" },
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// User type for webhook processing
interface WebhookUser {
  user_id: string;
  email: string;
  subscription_plan: string | null;
  subscription_status: string;
}

// Helper to find user by email
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findUserByEmail(
  supabase: any,
  email: string
): Promise<WebhookUser | null> {
  const { data: users } = await supabase
    .from("users")
    .select("user_id, email, subscription_plan, subscription_status")
    .eq("email", email)
    .limit(1);
  
  if (!users || users.length === 0) return null;
  return users[0] as WebhookUser;
}

// Helper to get customer email from Stripe customer ID
async function getCustomerEmail(stripe: Stripe, customerId: string): Promise<string | null> {
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !("email" in customer)) return null;
  return customer.email || null;
}

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

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.text();
    
    // Verify webhook signature to prevent forged events
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR", { message: "No stripe-signature header" });
      return new Response(JSON.stringify({ error: "No signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("ERROR", { message: "Signature verification failed", error: errorMessage });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    logStep("Webhook verified", { type: event.type, id: event.id });

    switch (event.type) {
      // ============================================
      // CHECKOUT EVENTS
      // ============================================
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_email || session.customer_details?.email;
        
        if (!customerEmail) {
          logStep("No customer email found in session");
          break;
        }

        const user = await findUserByEmail(supabase, customerEmail);
        if (!user) {
          logStep("User not found for email", { email: customerEmail });
          break;
        }

        if (session.mode === "subscription") {
          // Handle subscription checkout
          const subscriptionId = session.subscription as string;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price?.id;
          const credits = priceId ? PRICE_TO_CREDITS[priceId] : 0;
          const planInfo = priceId ? PRICE_TO_PLAN[priceId] : null;

          logStep("Processing subscription checkout", { subscriptionId, priceId, credits, plan: planInfo?.plan });

          // Update subscription info
          await supabase
            .from("users")
            .update({
              subscription_plan: planInfo?.plan || "pro",
              billing_cycle: planInfo?.cycle || "monthly",
              subscription_status: "active",
              stripe_customer_id: session.customer as string,
              subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
              refills_this_month: 0,
            })
            .eq("user_id", user.user_id);

          // Add monthly credits
          await supabase.rpc("add_credits", {
            p_user_id: user.user_id,
            p_amount: credits,
            p_type: "subscription_reset",
            p_description: `${planInfo?.plan || "Pro"} subscription activated`,
          });

        } else if (session.mode === "payment") {
          // Handle credit refill purchase
          const metadata = session.metadata;
          
          if (metadata?.type === "credit_refill") {
            const credits = parseInt(metadata.credits || "0", 10);
            
            logStep("Processing credit refill", { credits });

            if (credits > 0) {
              await supabase.rpc("add_credits", {
                p_user_id: user.user_id,
                p_amount: credits,
                p_type: "purchase",
                p_description: `Credit refill - ${credits} credits`,
              });

              // Increment refills counter
              const { data: userData } = await supabase
                .from("users")
                .select("refills_this_month")
                .eq("user_id", user.user_id)
                .single();

              await supabase
                .from("users")
                .update({ refills_this_month: (userData?.refills_this_month || 0) + 1 })
                .eq("user_id", user.user_id);
            }
          }
        }
        break;
      }

      // ============================================
      // CUSTOMER EVENTS
      // ============================================
      case "customer.created": {
        const customer = event.data.object as Stripe.Customer;
        logStep("Customer created in Stripe", { 
          customerId: customer.id, 
          email: customer.email 
        });
        
        // If user exists, link their Stripe customer ID
        if (customer.email) {
          const user = await findUserByEmail(supabase, customer.email);
          if (user) {
            await supabase
              .from("users")
              .update({ stripe_customer_id: customer.id })
              .eq("user_id", user.user_id);
            logStep("Linked Stripe customer to user", { userId: user.user_id });
          }
        }
        break;
      }

      case "customer.updated": {
        const customer = event.data.object as Stripe.Customer;
        logStep("Customer updated in Stripe", { 
          customerId: customer.id, 
          email: customer.email 
        });
        
        // Update user email if changed in Stripe
        if (customer.email) {
          const { data: existingUser } = await supabase
            .from("users")
            .select("user_id, email")
            .eq("stripe_customer_id", customer.id)
            .limit(1)
            .single();

          if (existingUser && existingUser.email !== customer.email) {
            logStep("Customer email changed", { 
              oldEmail: existingUser.email, 
              newEmail: customer.email 
            });
            // Note: We don't auto-update email as it should be controlled via auth
          }
        }
        break;
      }

      // ============================================
      // INVOICE EVENTS
      // ============================================
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerEmail = invoice.customer_email;
        
        if (!customerEmail) {
          logStep("No customer email in invoice");
          break;
        }

        const user = await findUserByEmail(supabase, customerEmail);
        if (!user) break;

        // Handle subscription renewal (not initial payment)
        if (invoice.billing_reason === "subscription_cycle") {
          const priceId = invoice.lines.data[0]?.price?.id;
          const credits = priceId ? PRICE_TO_CREDITS[priceId] : 0;
          const planInfo = priceId ? PRICE_TO_PLAN[priceId] : null;

          logStep("Processing subscription renewal", { priceId, credits });

          // Update subscription end date
          const subscriptionId = invoice.subscription as string;
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await supabase
              .from("users")
              .update({
                subscription_status: "active",
                subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
                refills_this_month: 0,
              })
              .eq("user_id", user.user_id);
          }

          // Reset monthly credits
          await supabase.rpc("add_credits", {
            p_user_id: user.user_id,
            p_amount: credits,
            p_type: "subscription_reset",
            p_description: `${planInfo?.plan || "Subscription"} renewal - monthly credits reset`,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerEmail = invoice.customer_email;
        
        logStep("Invoice payment failed", { 
          invoiceId: invoice.id,
          customerEmail,
          attemptCount: invoice.attempt_count,
          nextAttempt: invoice.next_payment_attempt 
        });

        if (!customerEmail) break;

        const user = await findUserByEmail(supabase, customerEmail);
        if (!user) break;

        // Update subscription status to past_due
        await supabase
          .from("users")
          .update({ subscription_status: "past_due" })
          .eq("user_id", user.user_id);

        logStep("User subscription marked as past_due", { userId: user.user_id });
        break;
      }

      // ============================================
      // SUBSCRIPTION EVENTS
      // ============================================
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const customerEmail = await getCustomerEmail(stripe, customerId);
        
        if (!customerEmail) {
          logStep("No customer email for subscription.created");
          break;
        }

        const user = await findUserByEmail(supabase, customerEmail);
        if (!user) {
          logStep("User not found for subscription.created", { email: customerEmail });
          break;
        }

        const priceId = subscription.items.data[0]?.price?.id;
        const credits = priceId ? PRICE_TO_CREDITS[priceId] : 0;
        const planInfo = priceId ? PRICE_TO_PLAN[priceId] : null;

        logStep("Subscription created", { 
          subscriptionId: subscription.id, 
          priceId, 
          plan: planInfo?.plan 
        });

        // Update user with subscription details
        await supabase
          .from("users")
          .update({
            subscription_plan: planInfo?.plan || "pro",
            billing_cycle: planInfo?.cycle || "monthly",
            subscription_status: subscription.status,
            stripe_customer_id: customerId,
            subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
            refills_this_month: 0,
          })
          .eq("user_id", user.user_id);

        // Add initial credits
        await supabase.rpc("add_credits", {
          p_user_id: user.user_id,
          p_amount: credits,
          p_type: "subscription_reset",
          p_description: `${planInfo?.plan || "Pro"} subscription started`,
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const customerEmail = await getCustomerEmail(stripe, customerId);
        
        if (!customerEmail) break;

        const user = await findUserByEmail(supabase, customerEmail);
        if (!user) break;

        const priceId = subscription.items.data[0]?.price?.id;
        const planInfo = priceId ? PRICE_TO_PLAN[priceId] : null;
        const previousPlan = user.subscription_plan;

        logStep("Subscription updated", { 
          subscriptionId: subscription.id,
          status: subscription.status,
          previousPlan,
          newPlan: planInfo?.plan,
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        });

        // Update subscription details
        const updateData: Record<string, unknown> = {
          subscription_status: subscription.status,
          subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
        };

        // If plan changed, update plan info
        if (planInfo && planInfo.plan !== previousPlan) {
          updateData.subscription_plan = planInfo.plan;
          updateData.billing_cycle = planInfo.cycle;

          // If upgrading, add the credit difference
          const newCredits = PRICE_TO_CREDITS[priceId!] || 0;
          const oldCredits = previousPlan === "pro" ? 700 : previousPlan === "studio" ? 1800 : 40;
          
          if (newCredits > oldCredits) {
            const creditDiff = newCredits - oldCredits;
            await supabase.rpc("add_credits", {
              p_user_id: user.user_id,
              p_amount: creditDiff,
              p_type: "subscription_reset",
              p_description: `Plan upgrade to ${planInfo.plan} - ${creditDiff} additional credits`,
            });
          }
        }

        // Handle cancellation scheduled
        if (subscription.cancel_at_period_end) {
          updateData.subscription_status = "canceling";
          logStep("Subscription will cancel at period end");
        }

        await supabase
          .from("users")
          .update(updateData)
          .eq("user_id", user.user_id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const customerEmail = await getCustomerEmail(stripe, customerId);
        
        if (!customerEmail) break;

        const user = await findUserByEmail(supabase, customerEmail);
        if (!user) break;

        logStep("Subscription deleted/canceled", { 
          subscriptionId: subscription.id,
          customerId 
        });

        // Revert to free tier
        await supabase
          .from("users")
          .update({
            subscription_plan: "free",
            billing_cycle: null,
            subscription_status: "free",
            monthly_credits: 40,
            subscription_ends_at: null,
            refills_this_month: 0,
          })
          .eq("user_id", user.user_id);

        logStep("User reverted to free plan", { userId: user.user_id });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
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
