-- Simplificar trigger: apenas atualizar revenue_split e deixar recompute criar tudo
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
  v_split jsonb;
  v_user_id uuid;
  v_revenue_cat_id uuid;
BEGIN
  -- Verificar se a conta é tipo casa
  SELECT type, COALESCE(revenue_split, '{}'::jsonb) INTO v_acc_type, v_split
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
    
    -- Adicionar ao revenue_split se ainda não estiver (peso padrão = 1)
    IF NOT (v_split ? v_user_id::text) THEN
      v_split := v_split || jsonb_build_object(v_user_id::text, 1);
      
      UPDATE public.accounts
      SET revenue_split = v_split
      WHERE id = v_account_id;
    END IF;
  END IF;

  -- Caso 2: Membro editor foi removido ou deixou de ser aceito
  IF (TG_OP = 'DELETE') OR 
     (TG_OP = 'UPDATE' AND (OLD.status = 'accepted' AND NEW.status <> 'accepted')) THEN
    v_user_id := COALESCE(OLD.user_id, NEW.user_id);

    -- Remover do revenue_split
    v_split := v_split - v_user_id::text;
    
    UPDATE public.accounts
    SET revenue_split = v_split
    WHERE id = v_account_id;

    -- Encontrar categoria Receita raiz e deletar previsões/subcategoria
    SELECT id INTO v_revenue_cat_id
    FROM public.categories
    WHERE account_id = v_account_id AND type = 'receita' AND parent_id IS NULL
    LIMIT 1;

    IF v_revenue_cat_id IS NOT NULL THEN
      -- Deletar previsões de receita deste usuário
      DELETE FROM public.account_period_forecasts f
      USING public.categories c, public.profiles p
      WHERE f.category_id = c.id
        AND c.account_id = v_account_id
        AND c.type = 'receita'
        AND c.parent_id = v_revenue_cat_id
        AND p.id = v_user_id
        AND (
          (p.email IS NOT NULL AND p.email <> '' AND c.name ILIKE '%' || p.email || '%')
          OR (p.name IS NOT NULL AND p.name <> '' AND c.name ILIKE p.name || '%')
        );

      -- Deletar subcategoria de receita deste usuário
      DELETE FROM public.categories c
      USING public.profiles p
      WHERE c.account_id = v_account_id
        AND c.type = 'receita'
        AND c.parent_id = v_revenue_cat_id
        AND p.id = v_user_id
        AND (
          (p.email IS NOT NULL AND p.email <> '' AND c.name ILIKE '%' || p.email || '%')
          OR (p.name IS NOT NULL AND p.name <> '' AND c.name ILIKE p.name || '%')
        );
    END IF;
  END IF;

  -- Recalcular previsões de receita para todos os meses que têm despesas previstas
  -- A função recompute_casa_revenue_forecasts irá criar subcategorias conforme necessário
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

-- Garantir que recompute_casa busca split atualizado a cada execução
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
  -- Buscar FRESH data da conta (garante ver mudanças do trigger)
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

  -- Limpar previsões de RECEITA anteriores do mês
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

    -- Se não existir, criar subcategoria
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

    -- Inserir previsão de RECEITA deste usuário para o mês
    INSERT INTO public.account_period_forecasts(
      account_id, category_id, period_start, period_end, forecasted_amount, notes
    ) VALUES (
      p_account_id,
      v_subcat_id,
      p_period_start,
      v_period_end,
      (v_total_expenses * v_weight / v_total_weight),
      'Contribuição automática: ' || to_char((v_weight / v_total_weight) * 100, 'FM999990.0') || '% (peso ' || v_weight::text || ')'
    )
    ON CONFLICT (account_id, category_id, period_start)
    DO UPDATE SET
      forecasted_amount = EXCLUDED.forecasted_amount,
      notes = EXCLUDED.notes,
      updated_at = now();
  END LOOP;
END;
$$;