-- Add max_investments column to plan_limits table
ALTER TABLE public.plan_limits 
ADD COLUMN max_investments integer NOT NULL DEFAULT 1;

-- Update default values for existing plans
UPDATE public.plan_limits 
SET max_investments = CASE 
  WHEN plan = 'free' THEN 1
  WHEN plan = 'plus' THEN 5
  WHEN plan = 'pro' THEN 999
  ELSE 1
END;