-- Remover trigger obsoleto de split change na tabela accounts
-- Este trigger foi substituído pelo trigger na tabela casa_revenue_splits
DROP TRIGGER IF EXISTS tr_recalc_casa_on_split_change ON public.accounts;
DROP FUNCTION IF EXISTS public.tr_recalc_casa_on_split_change();