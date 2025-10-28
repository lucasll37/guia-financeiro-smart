-- Habilitar RLS na tabela account_deletion_tokens
ALTER TABLE public.account_deletion_tokens ENABLE ROW LEVEL SECURITY;

-- Esta tabela é gerenciada apenas pelas edge functions usando service role key
-- Não há acesso direto via cliente, então não precisamos de políticas RLS
-- O RLS está habilitado apenas para conformidade de segurança