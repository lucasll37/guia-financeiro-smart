-- Criar trigger para recalcular receitas quando despesas mudarem
CREATE TRIGGER tr_sync_casa_revenue_forecasts
  AFTER INSERT OR UPDATE OR DELETE ON public.account_period_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_sync_casa_revenue_forecasts();