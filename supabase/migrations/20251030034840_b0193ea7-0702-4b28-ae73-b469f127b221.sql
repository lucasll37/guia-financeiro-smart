-- Adicionar campo para armazenar pesos de rateio de receita em contas tipo casa
ALTER TABLE public.accounts
ADD COLUMN revenue_split jsonb DEFAULT '{}';

-- Função para gerenciar subcategorias de receita em contas tipo casa
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
    AND type = 'income'
    AND parent_id IS NULL
  LIMIT 1;
  
  -- Se não existe categoria Receita, criar
  IF v_revenue_category_id IS NULL THEN
    INSERT INTO categories (account_id, name, type, color)
    VALUES (NEW.account_id, 'Receita', 'income', '#10b981')
    RETURNING id INTO v_revenue_category_id;
  END IF;
  
  -- Buscar nome e email do usuário
  SELECT name, email INTO v_user_name, v_user_email
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Nome da subcategoria será o nome do usuário ou email
  v_subcategory_name := COALESCE(v_user_name, v_user_email, 'Sem nome');
  
  -- Criar subcategoria de receita para o membro (se não existir)
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (
    NEW.account_id,
    v_subcategory_name,
    'income',
    '#10b981',
    v_revenue_category_id
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger para criar subcategoria quando membro é adicionado
DROP TRIGGER IF EXISTS tr_create_casa_revenue_subcategory ON account_members;
CREATE TRIGGER tr_create_casa_revenue_subcategory
AFTER INSERT OR UPDATE ON account_members
FOR EACH ROW
EXECUTE FUNCTION manage_casa_revenue_categories();

-- Função para criar subcategoria de receita do proprietário ao criar conta casa
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
  VALUES (NEW.id, 'Receita', 'income', '#10b981')
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
    'income',
    '#10b981',
    v_revenue_category_id
  );
  
  -- Inicializar peso padrão do proprietário como 1
  NEW.revenue_split = jsonb_build_object(NEW.owner_id::text, 1);
  
  RETURN NEW;
END;
$$;

-- Trigger para criar categoria e subcategoria do proprietário
DROP TRIGGER IF EXISTS tr_create_owner_revenue_category ON accounts;
CREATE TRIGGER tr_create_owner_revenue_category
BEFORE INSERT ON accounts
FOR EACH ROW
EXECUTE FUNCTION create_owner_revenue_category();