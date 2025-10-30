-- Create function to seed CASA accounts from Admin Seed (first account)
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
  INSERT INTO public.categories (account_id, name, type, color, parent_id)
  SELECT NEW.id, c.name, c.type, c.color, NULL
  FROM public.categories c
  WHERE c.account_id = v_seed_account
    AND c.parent_id IS NULL
    AND c.type = 'despesa'
    AND NOT EXISTS (
      SELECT 1 FROM public.categories x
      WHERE x.account_id = NEW.id AND x.parent_id IS NULL AND x.name = c.name
    );

  -- Insert child categories (DESPESA only), mapping to newly created parents by name
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
    AND NOT EXISTS (
      SELECT 1 FROM public.categories x
      WHERE x.account_id = NEW.id AND x.parent_id = p_new.id AND x.name = c.name
    );

  RETURN NEW;
END;
$$;

-- Create conditional triggers on accounts
-- CASA accounts: copy from Admin Seed
DROP TRIGGER IF EXISTS tr_seed_casa_categories ON public.accounts;
CREATE TRIGGER tr_seed_casa_categories
AFTER INSERT ON public.accounts
FOR EACH ROW
WHEN (NEW.type = 'casa')
EXECUTE FUNCTION public.seed_casa_account_categories();

-- Regular accounts: use existing hardcoded defaults function
-- Ensure a trigger exists to call seed_regular_account_categories for non-casa types
DROP TRIGGER IF EXISTS tr_seed_regular_categories ON public.accounts;
CREATE TRIGGER tr_seed_regular_categories
AFTER INSERT ON public.accounts
FOR EACH ROW
WHEN (NEW.type IN ('pessoal','conjugal','mesada'))
EXECUTE FUNCTION public.seed_regular_account_categories();