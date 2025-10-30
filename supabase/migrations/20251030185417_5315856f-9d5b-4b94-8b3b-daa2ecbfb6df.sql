-- Corrigir policies da tabela casa_revenue_splits
DROP POLICY IF EXISTS "Users can view splits of accessible accounts" ON public.casa_revenue_splits;
DROP POLICY IF EXISTS "Owners can manage splits" ON public.casa_revenue_splits;

-- Policy para visualização
CREATE POLICY "Users can view splits of their accessible accounts"
  ON public.casa_revenue_splits
  FOR SELECT
  USING (user_has_account_access(account_id, auth.uid()));

-- Policy para inserção (apenas donos)
CREATE POLICY "Account owners can insert splits"
  ON public.casa_revenue_splits
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = casa_revenue_splits.account_id 
        AND owner_id = auth.uid()
    )
  );

-- Policy para atualização (apenas donos)
CREATE POLICY "Account owners can update splits"
  ON public.casa_revenue_splits
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = casa_revenue_splits.account_id 
        AND owner_id = auth.uid()
    )
  );

-- Policy para deleção (apenas donos)
CREATE POLICY "Account owners can delete splits"
  ON public.casa_revenue_splits
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = casa_revenue_splits.account_id 
        AND owner_id = auth.uid()
    )
  );