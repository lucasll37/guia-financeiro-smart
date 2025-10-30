-- Recriar o trigger para AFTER INSERT em vez de BEFORE INSERT
DROP TRIGGER IF EXISTS tr_create_owner_revenue_category ON accounts;

CREATE TRIGGER tr_create_owner_revenue_category
AFTER INSERT ON accounts
FOR EACH ROW
EXECUTE FUNCTION create_owner_revenue_category();

-- Atualizar a função para não modificar NEW (já que é AFTER INSERT)
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
  
  -- Nome da subcategoria será o nome do usuário ou email
  v_subcategory_name := COALESCE(v_user_name, v_user_email, 'Sem nome');
  
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