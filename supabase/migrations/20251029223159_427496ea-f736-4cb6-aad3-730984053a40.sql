-- Drop the function and its dependent policies using CASCADE
DROP FUNCTION IF EXISTS public.user_has_investment_access(uuid, uuid) CASCADE;

-- Recreate the function ensuring only accepted members grant access
CREATE FUNCTION public.user_has_investment_access(investment_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.investment_members im
    WHERE im.investment_id = user_has_investment_access.investment_id
      AND im.user_id = _user_id
      AND im.status = 'accepted'
  );
$$;

-- Recreate the RLS policies that were dropped
CREATE POLICY "Users can view investments they own or have access to"
ON public.investment_assets
FOR SELECT
TO authenticated
USING ((owner_id = auth.uid()) OR user_has_investment_access(id, auth.uid()));

CREATE POLICY "Users can view returns of accessible investments"
ON public.investment_monthly_returns
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1
  FROM investment_assets ia
  WHERE ia.id = investment_monthly_returns.investment_id
    AND ((ia.owner_id = auth.uid()) OR user_has_investment_access(ia.id, auth.uid()))
));

-- Allow a member to update their membership to declined (leaving)
CREATE POLICY "Members can decline their own membership"
ON public.investment_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND status = 'declined');

-- Allow a member to delete their own membership  
CREATE POLICY "Members can delete their own membership"
ON public.investment_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());