-- Atualizar trigger para gerenciar membership no revenue_split e categorias
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
  v_user_name text;
  v_user_email text;
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

    -- Criar subcategoria de receita se não existir
    SELECT id INTO v_revenue_cat_id
    FROM public.categories
    WHERE account_id = v_account_id AND type = 'receita' AND parent_id IS NULL
    LIMIT 1;

    IF v_revenue_cat_id IS NULL THEN
      INSERT INTO public.categories(account_id, name, type, color)
      VALUES (v_account_id, 'Receita', 'receita', '#10b981')
      RETURNING id INTO v_revenue_cat_id;
    END IF;

    SELECT p.name, p.email INTO v_user_name, v_user_email
    FROM public.profiles p WHERE p.id = v_user_id;

    -- Verificar se já existe subcategoria para este usuário
    IF NOT EXISTS (
      SELECT 1 FROM public.categories
      WHERE account_id = v_account_id
        AND type = 'receita'
        AND parent_id = v_revenue_cat_id
        AND (
          (v_user_email IS NOT NULL AND v_user_email <> '' AND name ILIKE '%' || v_user_email || '%')
          OR (v_user_name IS NOT NULL AND v_user_name <> '' AND name ILIKE v_user_name || '%')
        )
    ) THEN
      INSERT INTO public.categories(account_id, name, type, color, parent_id)
      VALUES (
        v_account_id,
        COALESCE(NULLIF(v_user_name, ''), 'Sem nome') || 
          CASE WHEN v_user_email IS NOT NULL AND v_user_email <> '' 
            THEN ' (' || v_user_email || ')' 
            ELSE '' 
          END,
        'receita',
        '#10b981',
        v_revenue_cat_id
      );
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

    -- Encontrar categoria Receita raiz
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