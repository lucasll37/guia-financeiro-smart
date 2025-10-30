-- Auto-sync CASA revenue forecasts based on monthly expense forecasts
-- 1) Core recompute function
CREATE OR REPLACE FUNCTION public.recompute_casa_revenue_forecasts(p_account_id uuid, p_period_start date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acc_type public.account_type;
  v_total_expenses numeric := 0;
  v_revenue_cat_id uuid;
  v_split jsonb := '{}'::jsonb;
  v_total_weight numeric := 0;
  v_period_end date := (date_trunc('month', p_period_start) + interval '1 month' - interval '1 day')::date;
  r record;
  v_user_id uuid;
  v_weight numeric;
  v_name text;
  v_email text;
  v_subcat_id uuid;
BEGIN
  -- Validar conta tipo casa
  SELECT type, COALESCE(revenue_split, '{}'::jsonb) INTO v_acc_type, v_split
  FROM public.accounts
  WHERE id = p_account_id;

  IF v_acc_type IS DISTINCT FROM 'casa' THEN
    RETURN;
  END IF;

  -- Total de DESPESAS previstas do mês
  SELECT COALESCE(SUM(f.forecasted_amount), 0) INTO v_total_expenses
  FROM public.account_period_forecasts f
  JOIN public.categories c ON c.id = f.category_id
  WHERE f.account_id = p_account_id
    AND f.period_start = p_period_start
    AND c.type = 'despesa';

  -- Encontrar/criar categoria Receita raiz
  SELECT id INTO v_revenue_cat_id
  FROM public.categories
  WHERE account_id = p_account_id AND type = 'receita' AND parent_id IS NULL
  LIMIT 1;

  IF v_revenue_cat_id IS NULL THEN
    INSERT INTO public.categories(account_id, name, type, color)
    VALUES (p_account_id, 'Receita', 'receita', '#10b981')
    RETURNING id INTO v_revenue_cat_id;
  END IF;

  -- Limpar previsões de RECEITA anteriores do mês (apenas subcategorias de Receita)
  DELETE FROM public.account_period_forecasts f
  USING public.categories c
  WHERE f.account_id = p_account_id
    AND f.period_start = p_period_start
    AND c.id = f.category_id
    AND c.type = 'receita'
    AND c.parent_id = v_revenue_cat_id;

  -- Se não há despesas previstas, não criar previsões de receita
  IF v_total_expenses = 0 THEN
    RETURN;
  END IF;

  -- Somatório dos pesos
  SELECT COALESCE(SUM((e.value)::numeric), 0) INTO v_total_weight
  FROM jsonb_each_text(v_split) AS e(key, value);

  IF v_total_weight = 0 THEN
    RETURN;
  END IF;

  -- Para cada participante no revenue_split
  FOR r IN SELECT key, value FROM jsonb_each(v_split) LOOP
    v_user_id := r.key::uuid;
    v_weight := (r.value)::numeric;

    SELECT p.name, p.email INTO v_name, v_email
    FROM public.profiles p
    WHERE p.id = v_user_id;

    -- Encontrar subcategoria de receita correspondente ao usuário
    SELECT id INTO v_subcat_id
    FROM public.categories
    WHERE account_id = p_account_id
      AND type = 'receita'
      AND parent_id = v_revenue_cat_id
      AND (
        (v_email IS NOT NULL AND v_email <> '' AND name ILIKE '%' || v_email || '%')
        OR (v_name IS NOT NULL AND v_name <> '' AND name ILIKE v_name || '%')
      )
    LIMIT 1;

    -- Se não existir, criar com o mesmo padrão de nomenclatura
    IF v_subcat_id IS NULL THEN
      INSERT INTO public.categories(account_id, name, type, color, parent_id)
      VALUES (
        p_account_id,
        COALESCE(NULLIF(v_name, ''), 'Sem nome') || CASE WHEN v_email IS NOT NULL AND v_email <> '' THEN ' (' || v_email || ')' ELSE '' END,
        'receita',
        '#10b981',
        v_revenue_cat_id
      )
      RETURNING id INTO v_subcat_id;
    END IF;

    -- Inserir/atualizar previsão de RECEITA deste usuário para o mês
    INSERT INTO public.account_period_forecasts(
      account_id, category_id, period_start, period_end, forecasted_amount, notes
    ) VALUES (
      p_account_id,
      v_subcat_id,
      p_period_start,
      v_period_end,
      (v_total_expenses * v_weight / v_total_weight),
      format('Contribuição automática: %.1f%% (peso %s)', (v_weight / v_total_weight) * 100, v_weight::text)
    )
    ON CONFLICT (account_id, category_id, period_start)
    DO UPDATE SET
      forecasted_amount = EXCLUDED.forecasted_amount,
      notes = EXCLUDED.notes,
      updated_at = now();
  END LOOP;
END;
$$;

-- 2) Trigger function que dispara somente para DESPESAS, evitando recursão
CREATE OR REPLACE FUNCTION public.tr_sync_casa_revenue_forecasts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid := COALESCE(NEW.account_id, OLD.account_id);
  v_period_start date := COALESCE(NEW.period_start, OLD.period_start);
  v_cat_type public.category_type;
  v_category_id uuid := COALESCE(NEW.category_id, OLD.category_id);
BEGIN
  -- Verificar tipo da categoria do registro afetado
  SELECT type INTO v_cat_type FROM public.categories WHERE id = v_category_id;

  -- Evitar recursão e processar apenas mudanças em DESPESAS
  IF v_cat_type IS DISTINCT FROM 'despesa' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  PERFORM public.recompute_casa_revenue_forecasts(v_account_id, v_period_start);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3) Trigger em I/U/D de previsões
DROP TRIGGER IF EXISTS tr_sync_casa_revenue_on_forecast ON public.account_period_forecasts;
CREATE TRIGGER tr_sync_casa_revenue_on_forecast
AFTER INSERT OR UPDATE OR DELETE ON public.account_period_forecasts
FOR EACH ROW EXECUTE FUNCTION public.tr_sync_casa_revenue_forecasts();