-- Script para inicializar subcategorias de receita em contas tipo casa existentes
DO $$
DECLARE
  casa_account RECORD;
  v_revenue_category_id uuid;
  v_user_name text;
  v_user_email text;
  v_subcategory_name text;
  member RECORD;
  v_revenue_split jsonb;
BEGIN
  -- Para cada conta tipo casa existente
  FOR casa_account IN 
    SELECT * FROM public.accounts WHERE type = 'casa'
  LOOP
    -- Buscar ou criar categoria Receita
    SELECT id INTO v_revenue_category_id
    FROM public.categories
    WHERE account_id = casa_account.id
      AND type = 'receita'
      AND parent_id IS NULL
    LIMIT 1;
    
    -- Se não existe categoria Receita, criar
    IF v_revenue_category_id IS NULL THEN
      INSERT INTO public.categories (account_id, name, type, color)
      VALUES (casa_account.id, 'Receita', 'receita', '#10b981')
      RETURNING id INTO v_revenue_category_id;
    END IF;
    
    -- Inicializar revenue_split
    v_revenue_split = '{}'::jsonb;
    
    -- Criar subcategoria para o proprietário
    SELECT name, email INTO v_user_name, v_user_email
    FROM public.profiles
    WHERE id = casa_account.owner_id;
    
    v_subcategory_name := COALESCE(v_user_name, v_user_email, 'Sem nome');
    
    -- Inserir subcategoria se não existir
    INSERT INTO public.categories (account_id, name, type, color, parent_id)
    VALUES (
      casa_account.id,
      v_subcategory_name,
      'receita',
      '#10b981',
      v_revenue_category_id
    )
    ON CONFLICT DO NOTHING;
    
    -- Adicionar peso do proprietário
    v_revenue_split = jsonb_set(v_revenue_split, ARRAY[casa_account.owner_id::text], '1');
    
    -- Criar subcategorias para membros editores aceitos
    FOR member IN 
      SELECT am.user_id, p.name, p.email
      FROM public.account_members am
      JOIN public.profiles p ON p.id = am.user_id
      WHERE am.account_id = casa_account.id
        AND am.status = 'accepted'
        AND am.role = 'editor'
    LOOP
      v_subcategory_name := COALESCE(member.name, member.email, 'Sem nome');
      
      -- Inserir subcategoria se não existir
      INSERT INTO public.categories (account_id, name, type, color, parent_id)
      VALUES (
        casa_account.id,
        v_subcategory_name,
        'receita',
        '#10b981',
        v_revenue_category_id
      )
      ON CONFLICT DO NOTHING;
      
      -- Adicionar peso do membro
      v_revenue_split = jsonb_set(v_revenue_split, ARRAY[member.user_id::text], '1');
    END LOOP;
    
    -- Atualizar revenue_split da conta se estiver vazio
    IF casa_account.revenue_split = '{}'::jsonb OR casa_account.revenue_split IS NULL THEN
      UPDATE public.accounts
      SET revenue_split = v_revenue_split
      WHERE id = casa_account.id;
    END IF;
  END LOOP;
END $$;