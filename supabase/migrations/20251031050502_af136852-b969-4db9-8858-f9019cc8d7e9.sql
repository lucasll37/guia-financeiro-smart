-- Corrigir seed de categorias para não copiar categorias geradas pelo sistema
-- Categorias de receita com nomes de usuários são específicas de contas Casa

CREATE OR REPLACE FUNCTION public.seed_regular_account_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seed_account uuid;
BEGIN
  -- Only process for non-casa account types
  IF NEW.type NOT IN ('pessoal', 'conjugal', 'mesada') THEN
    RETURN NEW;
  END IF;

  -- Pick the first created account as the admin-managed seed source
  SELECT id INTO v_seed_account
  FROM public.accounts
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_seed_account IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert parent categories (both types), idempotent by name+type
  -- Excluir categorias geradas pelo sistema (específicas de contas casa)
  INSERT INTO public.categories (account_id, name, type, color, parent_id)
  SELECT NEW.id, c.name, c.type, c.color, NULL
  FROM public.categories c
  WHERE c.account_id = v_seed_account
    AND c.parent_id IS NULL
    AND (c.is_system_generated = false OR c.is_system_generated IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM public.categories x
      WHERE x.account_id = NEW.id 
        AND x.parent_id IS NULL 
        AND x.name = c.name
        AND x.type = c.type
    );

  -- Insert child categories, mapping to newly created parents by name+type
  -- Excluir subcategorias geradas pelo sistema
  INSERT INTO public.categories (account_id, name, type, color, parent_id)
  SELECT NEW.id, c.name, c.type, c.color, p_new.id
  FROM public.categories c
  JOIN public.categories p_seed ON p_seed.id = c.parent_id
  JOIN public.categories p_new 
    ON p_new.account_id = NEW.id 
   AND p_new.parent_id IS NULL 
   AND p_new.name = p_seed.name
   AND p_new.type = p_seed.type
  WHERE c.account_id = v_seed_account
    AND c.parent_id IS NOT NULL
    AND (c.is_system_generated = false OR c.is_system_generated IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM public.categories x
      WHERE x.account_id = NEW.id 
        AND x.parent_id = p_new.id 
        AND x.name = c.name
        AND x.type = c.type
    );

  RETURN NEW;
END;
$$;

-- Atualizar também seed_casa_account_categories para consistência
CREATE OR REPLACE FUNCTION public.seed_casa_account_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seed_account uuid;
BEGIN
  -- Pick the first created account as the admin-managed seed source
  SELECT id INTO v_seed_account
  FROM public.accounts
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_seed_account IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert parent categories (DESPESA only), idempotent by name
  -- Excluir categorias geradas pelo sistema
  INSERT INTO public.categories (account_id, name, type, color, parent_id)
  SELECT NEW.id, c.name, c.type, c.color, NULL
  FROM public.categories c
  WHERE c.account_id = v_seed_account
    AND c.parent_id IS NULL
    AND c.type = 'despesa'
    AND (c.is_system_generated = false OR c.is_system_generated IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM public.categories x
      WHERE x.account_id = NEW.id AND x.parent_id IS NULL AND x.name = c.name
    );

  -- Insert child categories (DESPESA only), mapping to newly created parents by name
  -- Excluir subcategorias geradas pelo sistema
  INSERT INTO public.categories (account_id, name, type, color, parent_id)
  SELECT NEW.id, c.name, c.type, c.color, p_new.id
  FROM public.categories c
  JOIN public.categories p_seed ON p_seed.id = c.parent_id
  JOIN public.categories p_new 
    ON p_new.account_id = NEW.id 
   AND p_new.parent_id IS NULL 
   AND p_new.name = p_seed.name
  WHERE c.account_id = v_seed_account
    AND c.parent_id IS NOT NULL
    AND c.type = 'despesa'
    AND (c.is_system_generated = false OR c.is_system_generated IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM public.categories x
      WHERE x.account_id = NEW.id AND x.parent_id = p_new.id AND x.name = c.name
    );

  RETURN NEW;
END;
$$;