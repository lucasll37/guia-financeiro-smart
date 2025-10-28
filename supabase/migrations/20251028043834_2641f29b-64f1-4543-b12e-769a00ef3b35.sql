-- Create plan_limits table to store limits for each subscription plan
CREATE TABLE IF NOT EXISTS public.plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan subscription_plan NOT NULL UNIQUE,
  max_accounts INTEGER NOT NULL DEFAULT 1,
  max_credit_cards INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view plan limits (needed for checking limits on frontend)
CREATE POLICY "Anyone can view plan limits"
ON public.plan_limits
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admins can manage plan limits
CREATE POLICY "Admins can manage plan limits"
ON public.plan_limits
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert default limits for each plan
INSERT INTO public.plan_limits (plan, max_accounts, max_credit_cards) VALUES
  ('free', 1, 1),
  ('plus', 3, 3),
  ('pro', 999, 999)
ON CONFLICT (plan) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_plan_limits_updated_at
  BEFORE UPDATE ON public.plan_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();