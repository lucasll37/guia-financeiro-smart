-- Atualizar trigger para adicionar novos membros ao revenue_split automaticamente
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
  v_current_split jsonb;
BEGIN
  -- Verificar se a conta é tipo casa
  SELECT type, revenue_split INTO v_account_type, v_current_split
  FROM accounts
  WHERE id = NEW.account_id;
  
  IF v_account_type != 'casa' THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se o membro foi aceito
  IF NEW.status != 'accepted' THEN
    RETURN NEW;
  END IF;
  
  -- Adicionar membro ao revenue_split se ainda não estiver
  IF v_current_split IS NULL THEN
    v_current_split := '{}'::jsonb;
  END IF;
  
  -- Se o usuário ainda não está no split, adicionar com peso 1
  IF NOT (v_current_split ? NEW.user_id::text) THEN
    v_current_split := v_current_split || jsonb_build_object(NEW.user_id::text, 1);
    
    UPDATE accounts
    SET revenue_split = v_current_split
    WHERE id = NEW.account_id;
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