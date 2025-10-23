import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.5.0";

const handler = async (req: Request): Promise<Response> => {
  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!stripeSecretKey || !webhookSecret) {
      throw new Error("Stripe not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No signature provided");
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`Received webhook event: ${event.type}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.subscription_data?.metadata?.supabase_user_id;
        const plan = session.subscription_data?.metadata?.plan;
        const billingCycle = session.subscription_data?.metadata?.billing_cycle;

        if (!userId || !plan || !billingCycle) {
          console.error("Missing metadata in checkout session");
          break;
        }

        console.log(`Checkout completed for user ${userId}, plan: ${plan}`);

        // Update subscription
        await supabase
          .from("subscriptions")
          .update({
            plan: plan as "plus" | "pro",
            billing_cycle: billingCycle as "monthly" | "annual",
            status: "trialing",
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("user_id", userId);

        // Log audit
        await supabase.from("audit_logs").insert({
          user_id: userId,
          entity: "subscription",
          entity_id: userId,
          action: "create",
          diff: {
            plan,
            billing_cycle: billingCycle,
            status: "trialing",
          },
        });

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        // Get subscription to find user
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = stripeSubscription.metadata?.supabase_user_id;

        if (!userId) {
          console.error("No user ID in subscription metadata");
          break;
        }

        console.log(`Payment succeeded for subscription ${subscriptionId}`);

        // Update subscription status and period
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_end: new Date(
              stripeSubscription.current_period_end * 1000
            ).toISOString(),
            trial_end: null,
          })
          .eq("stripe_subscription_id", subscriptionId);

        break;
      }

      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          console.error("No user ID in subscription metadata");
          break;
        }

        console.log(`Subscription ${event.type} for user ${userId}`);

        const status =
          subscription.status === "canceled" || subscription.cancel_at_period_end
            ? "canceled"
            : subscription.status === "active"
            ? "active"
            : subscription.status === "trialing"
            ? "trialing"
            : "incomplete";

        await supabase
          .from("subscriptions")
          .update({
            status,
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        // Log audit
        await supabase.from("audit_logs").insert({
          user_id: userId,
          entity: "subscription",
          entity_id: userId,
          action: "update",
          diff: { status, event_type: event.type },
        });

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
