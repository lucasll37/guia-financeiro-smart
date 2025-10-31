-- Modificar trigger para ajustar apenas períodos MAIORES que o mês atual (não >=)
CREATE OR REPLACE FUNCTION public.tr_recalc_casa_on_member_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_account_id uuid := COALESCE(NEW.account_id, OLD.account_id);
  v_acc_type public.account_type;
  v_period_start date;
  v_user_id uuid;
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

  -- Caso 1: Membro editor aceito foi adicionado/mudou para aceito
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.status = 'accepted' AND NEW.role = 'editor' THEN
    v_user_id := NEW.user_id;
    
    -- Adicionar ao split de TODOS os períodos que têm despesas (apenas futuros, > mês atual)
    INSERT INTO public.casa_revenue_splits (account_id, user_id, period_start, weight)
    SELECT DISTINCT 
      v_account_id,
      v_user_id,
      f.period_start,
      1
    FROM public.account_period_forecasts f
    JOIN public.categories c ON c.id = f.category_id
    WHERE f.account_id = v_account_id
      AND c.type = 'despesa'
      AND f.period_start > date_trunc('month', CURRENT_DATE)::date
    ON CONFLICT (account_id, user_id, period_start) DO NOTHING;

    -- Recalcular para todos os períodos afetados
    FOR v_period_start IN 
      SELECT DISTINCT period_start
      FROM public.casa_revenue_splits
      WHERE account_id = v_account_id
        AND user_id = v_user_id
    LOOP
      PERFORM public.recompute_casa_revenue_forecasts(v_account_id, v_period_start);
    END LOOP;
  END IF;

  -- Caso 2: Membro editor foi removido ou deixou de ser aceito
  -- IMPORTANTE: NÃO deletar subcategorias nem forecasts (preservar histórico)
  -- Apenas remover do split de períodos futuros (> mês atual)
  IF (TG_OP = 'DELETE') OR 
     (TG_OP = 'UPDATE' AND (OLD.status = 'accepted' AND NEW.status <> 'accepted')) THEN
    v_user_id := COALESCE(OLD.user_id, NEW.user_id);

    -- Remover do split apenas de períodos futuros (> mês atual)
    DELETE FROM public.casa_revenue_splits
    WHERE account_id = v_account_id
      AND user_id = v_user_id
      AND period_start > date_trunc('month', CURRENT_DATE)::date;

    -- Recalcular para períodos futuros
    FOR v_period_start IN 
      SELECT DISTINCT f.period_start
      FROM public.account_period_forecasts f
      JOIN public.categories c ON c.id = f.category_id
      WHERE f.account_id = v_account_id
        AND c.type = 'despesa'
        AND f.period_start > date_trunc('month', CURRENT_DATE)::date
    LOOP
      PERFORM public.recompute_casa_revenue_forecasts(v_account_id, v_period_start);
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;