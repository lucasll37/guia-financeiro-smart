-- Corrigir trigger para criar categorias de despesa seguindo o padrão do seed
CREATE OR REPLACE FUNCTION public.create_owner_revenue_category()
RETURNS trigger
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
  
  -- Criar categorias de despesa padrão (sem categoria pai "Despesa")
  -- Cada categoria é principal e terá suas subcategorias
  
  -- Alimentação
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Alimentação', 'despesa', '#22c55e', NULL);
  
  -- Moradia
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Moradia', 'despesa', '#f59e0b', NULL);
  
  -- Educação
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Educação', 'despesa', '#8b5cf6', NULL);
  
  -- Animal de Estimação
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Animal de Estimação', 'despesa', '#ec4899', NULL);
  
  -- Saúde
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Saúde', 'despesa', '#14b8a6', NULL);
  
  -- Transporte
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Transporte', 'despesa', '#3b82f6', NULL);
  
  -- Pessoais
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Pessoais', 'despesa', '#06b6d4', NULL);
  
  -- Lazer
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Lazer', 'despesa', '#f43f5e', NULL);
  
  -- Serviços Financeiros
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Serviços Financeiros', 'despesa', '#6366f1', NULL);
  
  -- Atualizar revenue_split da conta (agora que ela já existe)
  UPDATE accounts
  SET revenue_split = jsonb_build_object(NEW.owner_id::text, 1)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;