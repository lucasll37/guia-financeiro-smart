-- Create or replace trigger function to react to casa_revenue_splits changes
CREATE OR REPLACE FUNCTION public.tr_sync_casa_revenue_on_split_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid := COALESCE(NEW.account_id, OLD.account_id);
  v_period_start date := COALESCE(NEW.period_start, OLD.period_start);
BEGIN
  -- Recalcula apenas para o período afetado
  PERFORM public.recompute_casa_revenue_forecasts(v_account_id, v_period_start);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Ensure forecast change trigger is attached
DROP TRIGGER IF EXISTS tg_sync_casa_revenue_on_forecast_change ON public.account_period_forecasts;
CREATE TRIGGER tg_sync_casa_revenue_on_forecast_change
AFTER INSERT OR UPDATE OR DELETE ON public.account_period_forecasts
FOR EACH ROW
EXECUTE FUNCTION public.tr_sync_casa_revenue_forecasts();

-- Ensure split change trigger is attached
DROP TRIGGER IF EXISTS tg_sync_casa_revenue_on_split_change ON public.casa_revenue_splits;
CREATE TRIGGER tg_sync_casa_revenue_on_split_change
AFTER INSERT OR UPDATE OR DELETE ON public.casa_revenue_splits
FOR EACH ROW
EXECUTE FUNCTION public.tr_sync_casa_revenue_on_split_change();

-- Ensure member change triggers are attached (for casa accounts and role 'editor' handled inside function)
DROP TRIGGER IF EXISTS tg_manage_casa_categories_on_member_change ON public.account_members;
CREATE TRIGGER tg_manage_casa_categories_on_member_change
AFTER INSERT OR UPDATE ON public.account_members
FOR EACH ROW
EXECUTE FUNCTION public.manage_casa_revenue_categories();

DROP TRIGGER IF EXISTS tg_recalc_casa_on_member_change ON public.account_members;
CREATE TRIGGER tg_recalc_casa_on_member_change
AFTER INSERT OR UPDATE OR DELETE ON public.account_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_recalc_casa_on_member_change();