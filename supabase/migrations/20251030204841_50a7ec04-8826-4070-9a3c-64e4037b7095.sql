-- Add AI tutor access permission to plan limits
ALTER TABLE public.plan_limits 
ADD COLUMN can_access_ai_tutor BOOLEAN NOT NULL DEFAULT false;

-- Set default values (free = false, pro = true)
UPDATE public.plan_limits 
SET can_access_ai_tutor = CASE 
  WHEN plan = 'pro' THEN true 
  ELSE false 
END;

-- Remove old global AI tutor setting
DELETE FROM public.admin_settings 
WHERE setting_key = 'ai_tutor_requires_pro';