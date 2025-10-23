import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SubscribeRequest {
  plan: "plus" | "pro";
  billing_cycle: "monthly" | "annual";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Mock mode if Stripe is not configured
    if (!stripeSecretKey) {
      console.log("Stripe not configured, returning mock response");
      return new Response(
        JSON.stringify({
          url: `${new URL(req.url).origin}/checkout/success?mock=true`,
          mock: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { plan, billing_cycle }: SubscribeRequest = await req.json();

    console.log(`Creating subscription for user ${user.id}: ${plan} ${billing_cycle}`);

    // Get price IDs from environment
    const priceIds = {
      plus_monthly: Deno.env.get("STRIPE_PRICE_PLUS_MONTHLY"),
      plus_annual: Deno.env.get("STRIPE_PRICE_PLUS_ANNUAL"),
      pro_monthly: Deno.env.get("STRIPE_PRICE_PRO_MONTHLY"),
      pro_annual: Deno.env.get("STRIPE_PRICE_PRO_ANNUAL"),
    };

    const priceKey = `${plan}_${billing_cycle}` as keyof typeof priceIds;
    const priceId = priceIds[priceKey];

    if (!priceId) {
      throw new Error(`Price ID not configured for ${plan} ${billing_cycle}`);
    }

    // Get or create Stripe customer
    let customerId: string;

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (subscription?.stripe_customer_id) {
      customerId = subscription.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Update subscription with customer ID
      await supabase
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    // Create Checkout Session
    const origin = new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          supabase_user_id: user.id,
          plan: plan,
          billing_cycle: billing_cycle,
        },
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      locale: "pt-BR",
      billing_address_collection: "required",
      currency: "brl",
    });

    console.log(`Checkout session created: ${session.id}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in stripe-subscribe function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
