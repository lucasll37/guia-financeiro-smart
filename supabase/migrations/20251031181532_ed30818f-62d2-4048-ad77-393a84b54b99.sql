-- Criar função para validar deleção de cartão de crédito
CREATE OR REPLACE FUNCTION public.validate_credit_card_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se há transações com payment_month >= mês atual
  IF EXISTS (
    SELECT 1 
    FROM public.transactions
    WHERE credit_card_id = OLD.id
      AND payment_month >= date_trunc('month', CURRENT_DATE)::date
  ) THEN
    RAISE EXCEPTION 'Não é possível excluir o cartão pois existem faturas pendentes do mês atual ou futuras';
  END IF;
  
  RETURN OLD;
END;
$$;

-- Criar trigger para validar antes de deletar
DROP TRIGGER IF EXISTS tr_validate_credit_card_deletion ON public.credit_cards;
CREATE TRIGGER tr_validate_credit_card_deletion
  BEFORE DELETE ON public.credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_credit_card_deletion();