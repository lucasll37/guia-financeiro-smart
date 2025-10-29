-- Add user_id column to goals table
ALTER TABLE public.goals
ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Populate user_id for existing goals based on account ownership
UPDATE public.goals
SET user_id = accounts.owner_id
FROM public.accounts
WHERE goals.account_id = accounts.id;

-- Make user_id NOT NULL after population
ALTER TABLE public.goals
ALTER COLUMN user_id SET NOT NULL;

-- Make account_id nullable (optional association)
ALTER TABLE public.goals
ALTER COLUMN account_id DROP NOT NULL;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can manage goals in their accounts" ON public.goals;
DROP POLICY IF EXISTS "Users can view goals of their accounts" ON public.goals;

-- Create new RLS policies based on user_id
CREATE POLICY "Users can manage their own goals"
ON public.goals
FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Users can view their own goals"
ON public.goals
FOR SELECT
USING (user_id = auth.uid());

-- Update the trigger function for goal creation logging
CREATE OR REPLACE FUNCTION public.tr_log_goal_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.log_user_action(
    NEW.user_id,
    'create_goal',
    'goal',
    NEW.id
  );
  RETURN NEW;
END;
$function$;