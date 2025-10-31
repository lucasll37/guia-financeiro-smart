-- Atualizar função que cria categorias de receita para o owner em contas Casa
CREATE OR REPLACE FUNCTION public.create_owner_revenue_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_revenue_category_id uuid;
  v_user_name text;
  v_user_email text;
  v_subcategory_name text;
BEGIN
  -- Só processar contas tipo casa
  IF NEW.type != 'casa' THEN
    RETURN NEW;
  END IF;
  
  -- Criar categoria Receita (marcada como sistema)
  INSERT INTO categories (account_id, name, type, color, is_system_generated)
  VALUES (NEW.id, 'Receita', 'receita', '#10b981', true)
  RETURNING id INTO v_revenue_category_id;
  
  -- Buscar nome e email do proprietário
  SELECT name, email INTO v_user_name, v_user_email
  FROM profiles
  WHERE id = NEW.owner_id;
  
  -- Nome da subcategoria será o nome do usuário (email) ou apenas email
  IF v_user_name IS NOT NULL AND v_user_email IS NOT NULL THEN
    v_subcategory_name := v_user_name || ' (' || v_user_email || ')';
  ELSE
    v_subcategory_name := COALESCE(v_user_name, v_user_email, 'Sem nome');
  END IF;
  
  -- Criar subcategoria de receita para o proprietário (marcada como sistema)
  INSERT INTO categories (account_id, name, type, color, parent_id, is_system_generated)
  VALUES (
    NEW.id,
    v_subcategory_name,
    'receita',
    '#10b981',
    v_revenue_category_id,
    true
  );
  
  -- Inicializar peso padrão do proprietário como 1
  NEW.revenue_split = jsonb_build_object(NEW.owner_id::text, 1);
  
  RETURN NEW;
END;
$function$;

-- Atualizar função que cria categorias de receita para membros em contas Casa
CREATE OR REPLACE FUNCTION public.manage_casa_revenue_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_account_type account_type;
  v_revenue_category_id uuid;
  v_user_name text;
  v_user_email text;
  v_subcategory_name text;
  v_existing_subcategory_id uuid;
BEGIN
  -- Verificar se a conta é tipo casa
  SELECT type INTO v_account_type
  FROM accounts
  WHERE id = NEW.account_id;
  
  IF v_account_type != 'casa' THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se o membro foi aceito
  IF NEW.status != 'accepted' THEN
    RETURN NEW;
  END IF;
  
  -- Buscar categoria Receita da conta
  SELECT id INTO v_revenue_category_id
  FROM categories
  WHERE account_id = NEW.account_id
    AND type = 'receita'
    AND parent_id IS NULL
  LIMIT 1;
  
  -- Se não existe categoria Receita, criar (marcada como sistema)
  IF v_revenue_category_id IS NULL THEN
    INSERT INTO categories (account_id, name, type, color, is_system_generated)
    VALUES (NEW.account_id, 'Receita', 'receita', '#10b981', true)
    RETURNING id INTO v_revenue_category_id;
  END IF;
  
  -- Buscar nome e email do usuário
  SELECT name, email INTO v_user_name, v_user_email
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Nome da subcategoria será o nome do usuário (email) ou apenas email
  IF v_user_name IS NOT NULL AND v_user_email IS NOT NULL THEN
    v_subcategory_name := v_user_name || ' (' || v_user_email || ')';
  ELSE
    v_subcategory_name := COALESCE(v_user_name, v_user_email, 'Sem nome');
  END IF;
  
  -- Verificar se já existe uma subcategoria com esse nome
  SELECT id INTO v_existing_subcategory_id
  FROM categories
  WHERE account_id = NEW.account_id
    AND parent_id = v_revenue_category_id
    AND name = v_subcategory_name
    AND type = 'receita'
  LIMIT 1;
  
  -- Criar subcategoria de receita para o membro apenas se não existir (marcada como sistema)
  IF v_existing_subcategory_id IS NULL THEN
    INSERT INTO categories (account_id, name, type, color, parent_id, is_system_generated)
    VALUES (
      NEW.account_id,
      v_subcategory_name,
      'receita',
      '#10b981',
      v_revenue_category_id,
      true
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Atualizar função recompute_casa_revenue_forecasts para marcar categorias como sistema
CREATE OR REPLACE FUNCTION public.recompute_casa_revenue_forecasts(p_account_id uuid, p_period_start date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_acc_type public.account_type;
  v_owner_id uuid;
  v_total_expenses numeric := 0;
  v_revenue_cat_id uuid;
  v_total_weight numeric := 0;
  v_period_end date := (date_trunc('month', p_period_start) + interval '1 month' - interval '1 day')::date;
  v_prev_period date;
  r record;
  v_user_id uuid;
  v_weight numeric;
  v_name text;
  v_email text;
  v_subcat_id uuid;
  v_split jsonb := '{}'::jsonb;
  v_split_count integer := 0;
BEGIN
  -- Verificar tipo da conta e buscar owner
  SELECT type, owner_id INTO v_acc_type, v_owner_id
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

  -- Encontrar/criar categoria Receita raiz (marcada como sistema)
  SELECT id INTO v_revenue_cat_id
  FROM public.categories
  WHERE account_id = p_account_id AND type = 'receita' AND parent_id IS NULL
  LIMIT 1;

  IF v_revenue_cat_id IS NULL THEN
    INSERT INTO public.categories(account_id, name, type, color, is_system_generated)
    VALUES (p_account_id, 'Receita', 'receita', '#10b981', true)
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

  -- Garantir que exista split para o período; se não houver, clonar
  SELECT COUNT(*) INTO v_split_count
  FROM public.casa_revenue_splits
  WHERE account_id = p_account_id
    AND period_start = p_period_start;

  IF v_split_count = 0 THEN
    -- 1) Tentar clonar do último período existente <= p_period_start
    SELECT period_start INTO v_prev_period
    FROM public.casa_revenue_splits
    WHERE account_id = p_account_id
      AND period_start <= p_period_start
    ORDER BY period_start DESC
    LIMIT 1;

    IF v_prev_period IS NOT NULL THEN
      INSERT INTO public.casa_revenue_splits (account_id, user_id, period_start, weight)
      SELECT account_id, user_id, p_period_start, weight
      FROM public.casa_revenue_splits
      WHERE account_id = p_account_id
        AND period_start = v_prev_period
      ON CONFLICT (account_id, user_id, period_start) DO NOTHING;
    ELSE
      -- 2) Como fallback, usar accounts.revenue_split
      SELECT COALESCE(revenue_split, '{}'::jsonb) INTO v_split
      FROM public.accounts
      WHERE id = p_account_id;

      IF jsonb_typeof(v_split) = 'object' THEN
        FOR r IN SELECT key, value FROM jsonb_each(v_split) LOOP
          INSERT INTO public.casa_revenue_splits (account_id, user_id, period_start, weight)
          VALUES (p_account_id, r.key::uuid, p_period_start, (r.value)::numeric)
          ON CONFLICT (account_id, user_id, period_start) DO NOTHING;
        END LOOP;
      END IF;

      -- 3) Fallback final: owner + membros editores aceitos
      -- SEMPRE incluir o owner da conta
      INSERT INTO public.casa_revenue_splits (account_id, user_id, period_start, weight)
      VALUES (p_account_id, v_owner_id, p_period_start, 1)
      ON CONFLICT (account_id, user_id, period_start) DO NOTHING;
      
      -- Incluir membros editores aceitos
      INSERT INTO public.casa_revenue_splits (account_id, user_id, period_start, weight)
      SELECT p_account_id, am.user_id, p_period_start, 1
      FROM public.account_members am
      WHERE am.account_id = p_account_id
        AND am.status = 'accepted'
        AND am.role = 'editor'
      ON CONFLICT (account_id, user_id, period_start) DO NOTHING;
    END IF;
  END IF;

  -- Recalcular peso total após possível preenchimento
  SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
  FROM public.casa_revenue_splits
  WHERE account_id = p_account_id
    AND period_start = p_period_start;

  IF v_total_weight = 0 THEN
    RETURN;
  END IF;

  -- Para cada participante no split do período
  FOR r IN 
    SELECT user_id, weight 
    FROM public.casa_revenue_splits
    WHERE account_id = p_account_id
      AND period_start = p_period_start
  LOOP
    v_user_id := r.user_id;
    v_weight := r.weight;

    SELECT p.name, p.email INTO v_name, v_email
    FROM public.profiles p
    WHERE p.id = v_user_id;

    -- Verificar se já existe subcategoria com o padrão NOME (EMAIL)
    SELECT id INTO v_subcat_id
    FROM public.categories
    WHERE account_id = p_account_id
      AND type = 'receita'
      AND parent_id = v_revenue_cat_id
      AND name = (COALESCE(NULLIF(v_name, ''), 'Sem nome') || 
                  CASE WHEN v_email IS NOT NULL AND v_email <> '' 
                       THEN ' (' || v_email || ')' 
                       ELSE '' END)
    LIMIT 1;

    -- Se não existir, criar subcategoria (marcada como sistema)
    IF v_subcat_id IS NULL THEN
      INSERT INTO public.categories(account_id, name, type, color, parent_id, is_system_generated)
      VALUES (
        p_account_id,
        COALESCE(NULLIF(v_name, ''), 'Sem nome') || 
          CASE WHEN v_email IS NOT NULL AND v_email <> '' 
               THEN ' (' || v_email || ')' 
               ELSE '' END,
        'receita',
        '#10b981',
        v_revenue_cat_id,
        true
      )
      RETURNING id INTO v_subcat_id;
    ELSE
      -- Se já existe, garantir que está marcada como sistema
      UPDATE public.categories
      SET is_system_generated = true
      WHERE id = v_subcat_id;
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
      'Contribuição automática: ' || to_char((v_weight / v_total_weight) * 100, 'FM999990.0') || '% (peso ' || v_weight::text || ')'
    )
    ON CONFLICT (account_id, category_id, period_start)
    DO UPDATE SET
      forecasted_amount = EXCLUDED.forecasted_amount,
      notes = EXCLUDED.notes,
      updated_at = now();
  END LOOP;
END;
$function$;

-- Marcar categorias de receita existentes em contas Casa como sistema
UPDATE categories c
SET is_system_generated = true
FROM accounts a
WHERE c.account_id = a.id
  AND a.type = 'casa'
  AND c.type = 'receita';