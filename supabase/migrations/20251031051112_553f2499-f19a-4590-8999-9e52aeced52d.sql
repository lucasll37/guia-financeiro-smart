-- Desmarcar categorias normais de receita que não deveriam ser system_generated
-- Apenas subcategorias com formato "Nome (Email)" devem ser marcadas como system_generated

-- Primeiro, identificar a primeira conta criada (seed account)
DO $$
DECLARE
  v_seed_account_id uuid;
  v_casa_accounts uuid[];
BEGIN
  -- Buscar a primeira conta criada (seed account)
  SELECT id INTO v_seed_account_id
  FROM public.accounts
  ORDER BY created_at ASC
  LIMIT 1;

  -- Buscar IDs de todas as contas tipo casa
  SELECT ARRAY_AGG(id) INTO v_casa_accounts
  FROM public.accounts
  WHERE type = 'casa';

  -- Desmarcar is_system_generated de subcategorias de RECEITA na conta seed
  -- que NÃO têm formato "Nome (Email)" - essas são as subcategorias padrão
  UPDATE public.categories
  SET is_system_generated = false
  WHERE account_id = v_seed_account_id
    AND type = 'receita'
    AND parent_id IS NOT NULL
    -- Mantém marcadas apenas as que têm formato "Nome (email@...)" 
    AND NOT (name ~ '\([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\)$');

  -- Desmarcar is_system_generated de subcategorias de RECEITA em contas NÃO-CASA
  -- que NÃO têm formato "Nome (Email)"
  UPDATE public.categories
  SET is_system_generated = false
  WHERE account_id != ALL(COALESCE(v_casa_accounts, ARRAY[]::uuid[]))
    AND type = 'receita'
    AND parent_id IS NOT NULL
    AND NOT (name ~ '\([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\)$');
END $$;