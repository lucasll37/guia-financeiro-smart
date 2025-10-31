-- Recalcula rateio de contas 'casa' quando previsões mudam de mês (mês antigo e novo)
CREATE OR REPLACE FUNCTION public.tr_sync_casa_on_forecast_month_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_acc_type public.account_type;
  v_category_type public.category_type;
  v_old_period date;
  v_new_period date;
  v_account_id uuid := COALESCE(NEW.account_id, OLD.account_id);
BEGIN
  -- Verificar se é conta tipo casa
  SELECT type INTO v_acc_type
  FROM public.accounts
  WHERE id = v_account_id;

  IF v_acc_type IS DISTINCT FROM 'casa' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Verificar tipo da categoria (processar apenas DESPESAS)
  SELECT type INTO v_category_type
  FROM public.categories
  WHERE id = COALESCE(NEW.category_id, OLD.category_id);

  IF v_category_type IS DISTINCT FROM 'despesa' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- UPDATE: considerar mês antigo e novo
  IF TG_OP = 'UPDATE' THEN
    v_old_period := date_trunc('month', OLD.period_start)::date;
    v_new_period := date_trunc('month', NEW.period_start)::date;

    IF v_old_period IS DISTINCT FROM v_new_period THEN
      PERFORM public.recompute_casa_revenue_forecasts(v_account_id, v_old_period);
      PERFORM public.recompute_casa_revenue_forecasts(v_account_id, v_new_period);
    ELSE
      PERFORM public.recompute_casa_revenue_forecasts(v_account_id, v_new_period);
    END IF;
  END IF;

  -- INSERT: recalcular mês novo
  IF TG_OP = 'INSERT' THEN
    v_new_period := date_trunc('month', NEW.period_start)::date;
    PERFORM public.recompute_casa_revenue_forecasts(v_account_id, v_new_period);
  END IF;

  -- DELETE: recalcular mês antigo
  IF TG_OP = 'DELETE' THEN
    v_old_period := date_trunc('month', OLD.period_start)::date;
    PERFORM public.recompute_casa_revenue_forecasts(v_account_id, v_old_period);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Gatilho na tabela de previsões
DROP TRIGGER IF EXISTS tr_sync_casa_on_forecast_month_change ON public.account_period_forecasts;
CREATE TRIGGER tr_sync_casa_on_forecast_month_change
AFTER INSERT OR UPDATE OR DELETE ON public.account_period_forecasts
FOR EACH ROW
EXECUTE FUNCTION public.tr_sync_casa_on_forecast_month_change();