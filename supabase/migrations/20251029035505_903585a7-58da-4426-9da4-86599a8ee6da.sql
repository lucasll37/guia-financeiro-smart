-- Criar tabela de configurações do admin
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem gerenciar configurações
CREATE POLICY "Admins can manage settings"
  ON public.admin_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Inserir configuração padrão de expiração de logs (30 dias)
INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES ('log_retention_days', '{"days": 30}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Atualizar função de limpeza de logs para usar configuração dinâmica
CREATE OR REPLACE FUNCTION public.cleanup_old_action_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  retention_days INTEGER;
BEGIN
  -- Buscar configuração de retenção
  SELECT (setting_value->>'days')::INTEGER 
  INTO retention_days
  FROM public.admin_settings
  WHERE setting_key = 'log_retention_days';
  
  -- Se não encontrar configuração, usar 30 dias como padrão
  IF retention_days IS NULL THEN
    retention_days := 30;
  END IF;
  
  -- Deletar logs antigos
  DELETE FROM public.user_action_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
END;
$$;

-- Adicionar mais detalhes à tabela de logs (se ainda não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_action_logs' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.user_action_logs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_action_logs' 
    AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE public.user_action_logs ADD COLUMN ip_address TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_action_logs' 
    AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE public.user_action_logs ADD COLUMN user_agent TEXT;
  END IF;
END $$;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_action_logs_user_id ON public.user_action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_action_logs_created_at ON public.user_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_action_logs_action ON public.user_action_logs(action);