-- Criar função para deletar cartões ao sair de conta compartilhada
CREATE OR REPLACE FUNCTION public.delete_user_cards_on_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Tentar deletar cartões criados pelo usuário que está saindo
  -- A validação de faturas futuras já existe no trigger tr_validate_credit_card_deletion
  DELETE FROM public.credit_cards
  WHERE account_id = OLD.account_id
    AND created_by = OLD.user_id;
  
  -- Se houver erro (faturas futuras), o trigger de validação vai impedir
  -- e o cartão vai permanecer automaticamente
  
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Se houver erro ao deletar (ex: faturas futuras), simplesmente ignora
    -- e deixa o cartão permanecer
    RETURN OLD;
END;
$$;

-- Criar trigger para executar após member sair
DROP TRIGGER IF EXISTS tr_delete_user_cards_on_leave ON public.account_members;
CREATE TRIGGER tr_delete_user_cards_on_leave
  AFTER DELETE ON public.account_members
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_user_cards_on_leave();