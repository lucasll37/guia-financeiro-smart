-- Atualizar função para incluir nome e email nas subcategorias
CREATE OR REPLACE FUNCTION public.manage_casa_revenue_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type account_type;
  v_revenue_category_id uuid;
  v_user_name text;
  v_user_email text;
  v_subcategory_name text;
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
  
  -- Se não existe categoria Receita, criar
  IF v_revenue_category_id IS NULL THEN
    INSERT INTO categories (account_id, name, type, color)
    VALUES (NEW.account_id, 'Receita', 'receita', '#10b981')
    RETURNING id INTO v_revenue_category_id;
  END IF;
  
  -- Buscar nome e email do usuário
  SELECT name, email INTO v_user_name, v_user_email
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Formatar nome da subcategoria: "Nome (email@exemplo.com)"
  v_subcategory_name := CASE 
    WHEN v_user_name IS NOT NULL AND v_user_email IS NOT NULL THEN 
      v_user_name || ' (' || v_user_email || ')'
    WHEN v_user_name IS NOT NULL THEN 
      v_user_name
    WHEN v_user_email IS NOT NULL THEN 
      v_user_email
    ELSE 
      'Sem nome'
  END;
  
  -- Criar subcategoria de receita para o membro (se não existir)
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (
    NEW.account_id,
    v_subcategory_name,
    'receita',
    '#10b981',
    v_revenue_category_id
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_owner_revenue_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Criar categoria Receita
  INSERT INTO categories (account_id, name, type, color)
  VALUES (NEW.id, 'Receita', 'receita', '#10b981')
  RETURNING id INTO v_revenue_category_id;
  
  -- Buscar nome e email do proprietário
  SELECT name, email INTO v_user_name, v_user_email
  FROM profiles
  WHERE id = NEW.owner_id;
  
  -- Formatar nome da subcategoria: "Nome (email@exemplo.com)"
  v_subcategory_name := CASE 
    WHEN v_user_name IS NOT NULL AND v_user_email IS NOT NULL THEN 
      v_user_name || ' (' || v_user_email || ')'
    WHEN v_user_name IS NOT NULL THEN 
      v_user_name
    WHEN v_user_email IS NOT NULL THEN 
      v_user_email
    ELSE 
      'Sem nome'
  END;
  
  -- Criar subcategoria de receita para o proprietário
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (
    NEW.id,
    v_subcategory_name,
    'receita',
    '#10b981',
    v_revenue_category_id
  );
  
  -- Atualizar revenue_split da conta (agora que ela já existe)
  UPDATE accounts
  SET revenue_split = jsonb_build_object(NEW.owner_id::text, 1)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;