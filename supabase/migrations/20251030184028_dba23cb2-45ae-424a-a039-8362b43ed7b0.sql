-- Trigger para recalcular receitas quando membros editores mudarem (add/remove/status change)
CREATE OR REPLACE FUNCTION public.tr_recalc_casa_on_member_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid := COALESCE(NEW.account_id, OLD.account_id);
  v_acc_type public.account_type;
  v_period_start date;
BEGIN
  -- Verificar se a conta é tipo casa
  SELECT type INTO v_acc_type
  FROM public.accounts
  WHERE id = v_account_id;

  IF v_acc_type IS DISTINCT FROM 'casa' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Apenas processar membros com role 'editor' (pagantes)
  IF COALESCE(NEW.role, OLD.role) IS DISTINCT FROM 'editor' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Recalcular previsões de receita para todos os meses que têm despesas previstas
  FOR v_period_start IN 
    SELECT DISTINCT f.period_start
    FROM public.account_period_forecasts f
    JOIN public.categories c ON c.id = f.category_id
    WHERE f.account_id = v_account_id
      AND c.type = 'despesa'
  LOOP
    PERFORM public.recompute_casa_revenue_forecasts(v_account_id, v_period_start);
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_recalc_casa_on_member_change ON public.account_members;
CREATE TRIGGER tr_recalc_casa_on_member_change
AFTER INSERT OR UPDATE OR DELETE ON public.account_members
FOR EACH ROW EXECUTE FUNCTION public.tr_recalc_casa_on_member_change();

-- Trigger para recalcular receitas quando revenue_split for alterado
CREATE OR REPLACE FUNCTION public.tr_recalc_casa_on_split_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start date;
BEGIN
  -- Apenas processar contas tipo casa
  IF NEW.type IS DISTINCT FROM 'casa' THEN
    RETURN NEW;
  END IF;

  -- Apenas recalcular se revenue_split mudou
  IF OLD.revenue_split IS NOT DISTINCT FROM NEW.revenue_split THEN
    RETURN NEW;
  END IF;

  -- Recalcular previsões de receita para todos os meses que têm despesas previstas
  FOR v_period_start IN 
    SELECT DISTINCT f.period_start
    FROM public.account_period_forecasts f
    JOIN public.categories c ON c.id = f.category_id
    WHERE f.account_id = NEW.id
      AND c.type = 'despesa'
  LOOP
    PERFORM public.recompute_casa_revenue_forecasts(NEW.id, v_period_start);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_recalc_casa_on_split_change ON public.accounts;
CREATE TRIGGER tr_recalc_casa_on_split_change
AFTER UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.tr_recalc_casa_on_split_change();