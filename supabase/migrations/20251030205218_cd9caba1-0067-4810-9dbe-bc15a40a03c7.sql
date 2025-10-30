-- Add account sharing permission to plan limits
ALTER TABLE public.plan_limits 
ADD COLUMN can_share_accounts BOOLEAN NOT NULL DEFAULT false;

-- Set default values (free = false, pro = true)
UPDATE public.plan_limits 
SET can_share_accounts = CASE 
  WHEN plan = 'pro' THEN true 
  ELSE false 
END;