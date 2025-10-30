-- Criar função para verificar se o usuário pode editar recursos da conta
CREATE OR REPLACE FUNCTION public.user_can_edit_account_resources(account_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se é o dono da conta, pode editar
  IF EXISTS (
    SELECT 1 FROM public.accounts 
    WHERE id = account_uuid AND owner_id = user_uuid
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Se é um membro com role 'editor', pode editar
  IF EXISTS (
    SELECT 1 FROM public.account_members 
    WHERE account_id = account_uuid 
      AND user_id = user_uuid 
      AND status = 'accepted'
      AND role = 'editor'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- =========================================
-- ATUALIZAR RLS POLICIES PARA FORECASTS
-- =========================================

-- Remover policy antiga de insert
DROP POLICY IF EXISTS "Users can create forecasts in their accounts" ON public.account_period_forecasts;

-- Nova policy: apenas donos e editores podem criar forecasts
CREATE POLICY "Owners and editors can create forecasts"
ON public.account_period_forecasts
FOR INSERT
WITH CHECK (user_can_edit_account_resources(account_id, auth.uid()));

-- Remover policy antiga de update
DROP POLICY IF EXISTS "Users can update forecasts in their accounts" ON public.account_period_forecasts;

-- Nova policy: apenas donos e editores podem atualizar forecasts
CREATE POLICY "Owners and editors can update forecasts"
ON public.account_period_forecasts
FOR UPDATE
USING (user_can_edit_account_resources(account_id, auth.uid()));

-- Remover policy antiga de delete
DROP POLICY IF EXISTS "Users can delete forecasts in their accounts" ON public.account_period_forecasts;

-- Nova policy: apenas donos e editores podem deletar forecasts
CREATE POLICY "Owners and editors can delete forecasts"
ON public.account_period_forecasts
FOR DELETE
USING (user_can_edit_account_resources(account_id, auth.uid()));

-- =========================================
-- ATUALIZAR RLS POLICIES PARA TRANSACTIONS
-- =========================================

-- Remover policy antiga de insert
DROP POLICY IF EXISTS "Users can create transactions in their accounts" ON public.transactions;

-- Nova policy: apenas donos e editores podem criar transactions
CREATE POLICY "Owners and editors can create transactions"
ON public.transactions
FOR INSERT
WITH CHECK (
  user_can_edit_account_resources(account_id, auth.uid()) 
  AND created_by = auth.uid()
);

-- Remover policy antiga de update
DROP POLICY IF EXISTS "Users can update transactions they created" ON public.transactions;

-- Nova policy: apenas donos e editores podem atualizar transactions
CREATE POLICY "Owners and editors can update transactions"
ON public.transactions
FOR UPDATE
USING (
  created_by = auth.uid() 
  AND user_can_edit_account_resources(account_id, auth.uid())
);

-- Remover policy antiga de delete
DROP POLICY IF EXISTS "Users can delete transactions they created" ON public.transactions;

-- Nova policy: apenas donos e editores podem deletar transactions
CREATE POLICY "Owners and editors can delete transactions"
ON public.transactions
FOR DELETE
USING (
  created_by = auth.uid()
  AND user_can_edit_account_resources(account_id, auth.uid())
);

-- =========================================
-- ATUALIZAR RLS POLICIES PARA CATEGORIES
-- =========================================

-- Remover policy antiga de insert
DROP POLICY IF EXISTS "Users can create categories in their accounts" ON public.categories;

-- Nova policy: apenas donos e editores podem criar categorias
CREATE POLICY "Owners and editors can create categories"
ON public.categories
FOR INSERT
WITH CHECK (user_can_edit_account_resources(account_id, auth.uid()));

-- Remover policy antiga de update
DROP POLICY IF EXISTS "Users can update categories in their accounts" ON public.categories;

-- Nova policy: apenas donos e editores podem atualizar categorias
CREATE POLICY "Owners and editors can update categories"
ON public.categories
FOR UPDATE
USING (user_can_edit_account_resources(account_id, auth.uid()));

-- Remover policy antiga de delete
DROP POLICY IF EXISTS "Users can delete categories in their accounts" ON public.categories;

-- Nova policy: apenas donos e editores podem deletar categorias
CREATE POLICY "Owners and editors can delete categories"
ON public.categories
FOR DELETE
USING (user_can_edit_account_resources(account_id, auth.uid()));

-- =========================================
-- ATUALIZAR RLS POLICIES PARA CREDIT CARDS
-- =========================================

-- Remover policy antiga de insert
DROP POLICY IF EXISTS "Users can create credit cards in their accounts" ON public.credit_cards;

-- Nova policy: apenas donos e editores podem criar cartões
CREATE POLICY "Owners and editors can create credit cards"
ON public.credit_cards
FOR INSERT
WITH CHECK (user_can_edit_account_resources(account_id, auth.uid()));

-- Remover policy antiga de update
DROP POLICY IF EXISTS "Users can update credit cards in their accounts" ON public.credit_cards;

-- Nova policy: apenas donos e editores podem atualizar cartões
CREATE POLICY "Owners and editors can update credit cards"
ON public.credit_cards
FOR UPDATE
USING (user_can_edit_account_resources(account_id, auth.uid()));

-- Remover policy antiga de delete
DROP POLICY IF EXISTS "Users can delete credit cards in their accounts" ON public.credit_cards;

-- Nova policy: apenas donos e editores podem deletar cartões
CREATE POLICY "Owners and editors can delete credit cards"
ON public.credit_cards
FOR DELETE
USING (user_can_edit_account_resources(account_id, auth.uid()));