-- Atualizar trigger para evitar duplicatas de subcategorias de receita ao adicionar membros
CREATE OR REPLACE FUNCTION public.manage_casa_revenue_categories()
RETURNS trigger
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
  
  -- Criar subcategoria de receita para o membro (evitar duplicatas)
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (
    NEW.account_id,
    v_subcategory_name,
    'receita',
    '#10b981',
    v_revenue_category_id
  )
  ON CONFLICT DO NOTHING;
  
  -- Se a subcategoria já existe mas com nome diferente, atualizar
  UPDATE categories
  SET name = v_subcategory_name
  WHERE account_id = NEW.account_id
    AND type = 'receita'
    AND parent_id = v_revenue_category_id
    AND name LIKE CASE 
      WHEN v_user_email IS NOT NULL THEN '%' || v_user_email || '%'
      WHEN v_user_name IS NOT NULL THEN v_user_name || '%'
      ELSE name
    END;
  
  RETURN NEW;
END;
$$;

-- Atualizar trigger para criar categorias automaticamente com seed na criação da conta
CREATE OR REPLACE FUNCTION public.create_owner_revenue_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revenue_category_id uuid;
  v_expense_category_id uuid;
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
  
  -- Criar categorias de despesa padrão
  INSERT INTO categories (account_id, name, type, color)
  VALUES (NEW.id, 'Despesa', 'despesa', '#ef4444')
  RETURNING id INTO v_expense_category_id;
  
  -- Criar subcategorias de despesa padrão
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES 
    (NEW.id, 'Alimentação', 'despesa', '#f59e0b', v_expense_category_id),
    (NEW.id, 'Transporte', 'despesa', '#3b82f6', v_expense_category_id),
    (NEW.id, 'Moradia', 'despesa', '#8b5cf6', v_expense_category_id),
    (NEW.id, 'Saúde', 'despesa', '#ec4899', v_expense_category_id),
    (NEW.id, 'Educação', 'despesa', '#14b8a6', v_expense_category_id),
    (NEW.id, 'Lazer', 'despesa', '#f97316', v_expense_category_id),
    (NEW.id, 'Contas', 'despesa', '#6366f1', v_expense_category_id),
    (NEW.id, 'Outros', 'despesa', '#64748b', v_expense_category_id);
  
  -- Atualizar revenue_split da conta (agora que ela já existe)
  UPDATE accounts
  SET revenue_split = jsonb_build_object(NEW.owner_id::text, 1)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;