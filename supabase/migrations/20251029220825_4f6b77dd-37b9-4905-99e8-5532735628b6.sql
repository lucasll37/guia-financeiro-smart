-- Update RLS policy for investment_monthly_returns to check member role
-- Drop ALL existing policies for investment_monthly_returns
DROP POLICY IF EXISTS "Users can manage returns of accessible investments" ON public.investment_monthly_returns;
DROP POLICY IF EXISTS "Users can view returns of accessible investments" ON public.investment_monthly_returns;
DROP POLICY IF EXISTS "Owners and editors can create returns" ON public.investment_monthly_returns;
DROP POLICY IF EXISTS "Owners and editors can update returns" ON public.investment_monthly_returns;
DROP POLICY IF EXISTS "Owners and editors can delete returns" ON public.investment_monthly_returns;

-- Create new function to check if user can edit investment returns
CREATE OR REPLACE FUNCTION public.user_can_edit_investment_returns(investment_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is the owner
  IF EXISTS (
    SELECT 1 FROM public.investment_assets 
    WHERE id = investment_uuid AND owner_id = user_uuid
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is an accepted editor
  IF EXISTS (
    SELECT 1 FROM public.investment_members 
    WHERE investment_id = investment_uuid 
      AND user_id = user_uuid 
      AND status = 'accepted'
      AND role = 'editor'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create new policies: viewers can SELECT, editors can manage
-- Policy for SELECT (owners, editors, and viewers can read)
CREATE POLICY "Users can view returns of accessible investments"
ON public.investment_monthly_returns
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.investment_assets ia
    WHERE ia.id = investment_monthly_returns.investment_id 
      AND (
        ia.owner_id = auth.uid() 
        OR user_has_investment_access(ia.id, auth.uid())
      )
  )
);

-- Policy for INSERT (only owners and editors)
CREATE POLICY "Owners and editors can create returns"
ON public.investment_monthly_returns
FOR INSERT
WITH CHECK (
  user_can_edit_investment_returns(investment_id, auth.uid())
);

-- Policy for UPDATE (only owners and editors)
CREATE POLICY "Owners and editors can update returns"
ON public.investment_monthly_returns
FOR UPDATE
USING (
  user_can_edit_investment_returns(investment_id, auth.uid())
);

-- Policy for DELETE (only owners and editors)
CREATE POLICY "Owners and editors can delete returns"
ON public.investment_monthly_returns
FOR DELETE
USING (
  user_can_edit_investment_returns(investment_id, auth.uid())
);