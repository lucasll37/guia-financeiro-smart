-- Create subscription plan enum
CREATE TYPE public.subscription_plan AS ENUM ('free', 'plus', 'pro');

-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'canceled', 'expired', 'incomplete');

-- Create billing cycle enum
CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'annual');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.subscription_plan NOT NULL DEFAULT 'free',
  billing_cycle public.billing_cycle,
  status public.subscription_status NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own subscription (for internal updates)
CREATE POLICY "Service role can manage subscriptions"
ON public.subscriptions
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to create default subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$;

-- Trigger to create subscription on user signup
CREATE TRIGGER on_auth_user_created_subscription
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_subscription();

-- Function to check if user has required plan
CREATE OR REPLACE FUNCTION public.user_has_plan(
  _user_id UUID,
  _required_plan public.subscription_plan
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan public.subscription_plan;
  user_status public.subscription_status;
BEGIN
  SELECT plan, status
  INTO user_plan, user_status
  FROM public.subscriptions
  WHERE user_id = _user_id;
  
  -- If no subscription found, treat as free
  IF NOT FOUND THEN
    RETURN _required_plan = 'free';
  END IF;
  
  -- Check if subscription is active or trialing
  IF user_status NOT IN ('active', 'trialing') THEN
    RETURN FALSE;
  END IF;
  
  -- Check plan hierarchy: pro > plus > free
  IF _required_plan = 'free' THEN
    RETURN TRUE;
  ELSIF _required_plan = 'plus' THEN
    RETURN user_plan IN ('plus', 'pro');
  ELSIF _required_plan = 'pro' THEN
    RETURN user_plan = 'pro';
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Add index for faster lookups
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);