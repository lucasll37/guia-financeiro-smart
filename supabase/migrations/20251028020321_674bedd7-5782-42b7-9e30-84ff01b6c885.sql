-- Criar tabela para armazenar tokens de exclusão de conta
CREATE TABLE IF NOT EXISTS public.account_deletion_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice para busca rápida por token
CREATE INDEX idx_account_deletion_tokens_token ON public.account_deletion_tokens(token);
CREATE INDEX idx_account_deletion_tokens_user_id ON public.account_deletion_tokens(user_id);

-- Adicionar comentários
COMMENT ON TABLE public.account_deletion_tokens IS 'Armazena tokens temporários para confirmação de exclusão de conta';
COMMENT ON COLUMN public.account_deletion_tokens.token IS 'Token único para confirmação (válido por 1 hora)';
COMMENT ON COLUMN public.account_deletion_tokens.used IS 'Indica se o token já foi usado';
COMMENT ON COLUMN public.account_deletion_tokens.expires_at IS 'Data e hora de expiração do token';

-- Função para limpar tokens expirados automaticamente
CREATE OR REPLACE FUNCTION cleanup_expired_deletion_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.account_deletion_tokens
  WHERE expires_at < now() OR (used = true AND created_at < (now() - interval '7 days'));
END;
$$;