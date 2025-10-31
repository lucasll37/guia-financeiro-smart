-- Função para recalcular forecasts de casa quando transações mudam de mês
CREATE OR REPLACE FUNCTION public.tr_sync_casa_on_transaction_month_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acc_type public.account_type;
  v_old_period date;
  v_new_period date;
  v_category_type public.category_type;
BEGIN
  -- Verificar se é conta tipo casa
  SELECT type INTO v_acc_type
  FROM public.accounts
  WHERE id = COALESCE(NEW.account_id, OLD.account_id);
  
  IF v_acc_type IS DISTINCT FROM 'casa' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Verificar tipo da categoria
  SELECT type INTO v_category_type
  FROM public.categories
  WHERE id = COALESCE(NEW.category_id, OLD.category_id);

  -- Processar apenas despesas
  IF v_category_type IS DISTINCT FROM 'despesa' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Para UPDATE: detectar mudança no payment_month ou date
  IF TG_OP = 'UPDATE' THEN
    v_old_period := date_trunc('month', COALESCE(OLD.payment_month, OLD.date))::date;
    v_new_period := date_trunc('month', COALESCE(NEW.payment_month, NEW.date))::date;
    
    -- Se mudou o mês, recalcular AMBOS os períodos
    IF v_old_period IS DISTINCT FROM v_new_period THEN
      -- Recalcular período original
      PERFORM public.recompute_casa_revenue_forecasts(OLD.account_id, v_old_period);
      
      -- Recalcular novo período
      PERFORM public.recompute_casa_revenue_forecasts(NEW.account_id, v_new_period);
    ELSE
      -- Se não mudou o mês, recalcular apenas o período atual
      PERFORM public.recompute_casa_revenue_forecasts(NEW.account_id, v_new_period);
    END IF;
  END IF;

  -- Para INSERT: recalcular o novo período
  IF TG_OP = 'INSERT' THEN
    v_new_period := date_trunc('month', COALESCE(NEW.payment_month, NEW.date))::date;
    PERFORM public.recompute_casa_revenue_forecasts(NEW.account_id, v_new_period);
  END IF;

  -- Para DELETE: recalcular o período original
  IF TG_OP = 'DELETE' THEN
    v_old_period := date_trunc('month', COALESCE(OLD.payment_month, OLD.date))::date;
    PERFORM public.recompute_casa_revenue_forecasts(OLD.account_id, v_old_period);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Criar trigger para transações
DROP TRIGGER IF EXISTS sync_casa_on_transaction_month_change ON public.transactions;
CREATE TRIGGER sync_casa_on_transaction_month_change
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_sync_casa_on_transaction_month_change();