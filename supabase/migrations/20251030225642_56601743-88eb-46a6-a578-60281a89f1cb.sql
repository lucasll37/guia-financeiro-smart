-- Ajustar RLS para permitir execução por funções SECURITY DEFINER (role postgres)
-- account_period_forecasts
DROP POLICY IF EXISTS "Owners and editors can create forecasts" ON public.account_period_forecasts;
CREATE POLICY "Owners and editors can create forecasts"
ON public.account_period_forecasts
FOR INSERT
WITH CHECK (
  user_can_edit_account_resources(account_id, auth.uid())
  OR current_setting('role') = 'postgres'
);

DROP POLICY IF EXISTS "Owners and editors can update forecasts" ON public.account_period_forecasts;
CREATE POLICY "Owners and editors can update forecasts"
ON public.account_period_forecasts
FOR UPDATE
USING (
  user_can_edit_account_resources(account_id, auth.uid())
  OR current_setting('role') = 'postgres'
);

DROP POLICY IF EXISTS "Owners and editors can delete forecasts" ON public.account_period_forecasts;
CREATE POLICY "Owners and editors can delete forecasts"
ON public.account_period_forecasts
FOR DELETE
USING (
  user_can_edit_account_resources(account_id, auth.uid())
  OR current_setting('role') = 'postgres'
);

-- Manter SELECT como está (sem mudanças)

-- casa_revenue_splits
DROP POLICY IF EXISTS "Account owners can insert splits" ON public.casa_revenue_splits;
CREATE POLICY "Account owners can insert splits"
ON public.casa_revenue_splits
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.accounts
    WHERE accounts.id = casa_revenue_splits.account_id
      AND accounts.owner_id = auth.uid()
  )
  OR current_setting('role') = 'postgres'
);

DROP POLICY IF EXISTS "Account owners can update splits" ON public.casa_revenue_splits;
CREATE POLICY "Account owners can update splits"
ON public.casa_revenue_splits
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.accounts
    WHERE accounts.id = casa_revenue_splits.account_id
      AND accounts.owner_id = auth.uid()
  )
  OR current_setting('role') = 'postgres'
);

DROP POLICY IF EXISTS "Account owners can delete splits" ON public.casa_revenue_splits;
CREATE POLICY "Account owners can delete splits"
ON public.casa_revenue_splits
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.accounts
    WHERE accounts.id = casa_revenue_splits.account_id
      AND accounts.owner_id = auth.uid()
  )
  OR current_setting('role') = 'postgres'
);

-- SELECT permanece inalterada