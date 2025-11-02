-- Criar tabela de configurações de simulação de investimento
CREATE TABLE IF NOT EXISTS public.investment_simulation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.investment_simulation_settings ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler
CREATE POLICY "Anyone can read simulation settings"
  ON public.investment_simulation_settings
  FOR SELECT
  USING (true);

-- Política: Apenas admins podem modificar
CREATE POLICY "Only admins can modify simulation settings"
  ON public.investment_simulation_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Inserir valores padrão
INSERT INTO public.investment_simulation_settings (setting_key, setting_value, description) VALUES
  ('months_config', '{"min": 1, "max": 360, "default": 12}'::jsonb, 'Configuração do prazo em meses'),
  ('monthly_rate_config', '{"min": -2, "max": 5, "default": 0.83}'::jsonb, 'Configuração da taxa mensal de retorno (%)'),
  ('inflation_rate_config', '{"min": -2, "max": 10, "default": 0.35}'::jsonb, 'Configuração da taxa de inflação (%)'),
  ('rate_std_dev_config', '{"min": 0, "max": 5, "default": 0.15}'::jsonb, 'Configuração do desvio padrão do retorno'),
  ('inflation_std_dev_config', '{"min": 0, "max": 5, "default": 0.25}'::jsonb, 'Configuração do desvio padrão da inflação'),
  ('contribution_config', '{"min": 0, "max_slider": 20000, "max_input": 100000, "default": 0}'::jsonb, 'Configuração do aporte mensal')
ON CONFLICT (setting_key) DO NOTHING;