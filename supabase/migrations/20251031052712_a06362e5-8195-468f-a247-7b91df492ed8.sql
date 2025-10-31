-- Corrigir trigger de log de deleção de investimento para prevenir null user_id
DROP TRIGGER IF EXISTS log_investment_deletion ON public.investment_assets;

CREATE OR REPLACE FUNCTION public.tr_log_investment_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Só registra o log se o owner_id existir (não for null)
  IF OLD.owner_id IS NOT NULL THEN
    PERFORM public.log_user_action(
      OLD.owner_id,
      'delete_investment',
      'investment',
      OLD.id
    );
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_investment_deletion
AFTER DELETE ON public.investment_assets
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_investment_deletion();