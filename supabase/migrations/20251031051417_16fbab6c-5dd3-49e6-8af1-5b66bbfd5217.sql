-- Remover subcategorias "Lucas Lima" de contas não-casa
-- Estas são específicas de contas casa e não devem ser copiadas

DO $$
DECLARE
  v_seed_account_id uuid;
BEGIN
  -- Buscar a primeira conta criada (seed account)
  SELECT id INTO v_seed_account_id
  FROM public.accounts
  ORDER BY created_at ASC
  LIMIT 1;

  -- Deletar subcategorias "Lucas Lima" da conta seed
  DELETE FROM public.categories
  WHERE account_id = v_seed_account_id
    AND name = 'Lucas Lima'
    AND type = 'receita'
    AND parent_id IS NOT NULL;

  -- Deletar subcategorias "Lucas Lima" de todas as contas não-casa
  DELETE FROM public.categories c
  USING public.accounts a
  WHERE c.account_id = a.id
    AND a.type != 'casa'
    AND c.name = 'Lucas Lima'
    AND c.type = 'receita'
    AND c.parent_id IS NOT NULL;
    
  -- Marcar como system_generated qualquer subcategoria de receita em conta seed
  -- que contenha um "@" (email) ou que seja apenas um nome próprio sem descritivo
  UPDATE public.categories
  SET is_system_generated = true
  WHERE account_id = v_seed_account_id
    AND type = 'receita'
    AND parent_id IS NOT NULL
    AND (
      -- Tem formato "Nome (email)"
      name ~ '\([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\)$'
      OR
      -- É apenas um nome simples sem descrição (provável nome de usuário)
      (name !~ '/' AND name !~ '-' AND char_length(name) < 30 AND name !~ '^(13º|Aposentadoria|Férias|Outras|Salário|Receita)')
    );
END $$;