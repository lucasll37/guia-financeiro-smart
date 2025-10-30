-- Atualizar enum account_type para os novos valores
-- Primeiro, remover o default temporariamente
ALTER TABLE public.accounts ALTER COLUMN type DROP DEFAULT;

-- Criar um novo enum com os valores corretos
CREATE TYPE public.account_type_new AS ENUM ('pessoal', 'conjugal', 'mesada', 'casa', 'evento');

-- Converter valores antigos para os novos valores antes de alterar o tipo
-- empresa -> casa (fallback razoável)
-- outro -> pessoal (fallback razoável)
UPDATE public.accounts 
SET type = 'casa'::text::public.account_type
WHERE type = 'empresa'::public.account_type;

UPDATE public.accounts 
SET type = 'pessoal'::text::public.account_type
WHERE type = 'outro'::public.account_type;

-- Alterar a coluna para usar o novo tipo
ALTER TABLE public.accounts 
  ALTER COLUMN type TYPE public.account_type_new 
  USING type::text::public.account_type_new;

-- Remover o enum antigo
DROP TYPE public.account_type;

-- Renomear o novo enum para o nome original
ALTER TYPE public.account_type_new RENAME TO account_type;

-- Restaurar o default com o novo tipo
ALTER TABLE public.accounts ALTER COLUMN type SET DEFAULT 'pessoal'::public.account_type;