-- Adicionar campo de dia de viragem na tabela accounts
ALTER TABLE public.accounts 
ADD COLUMN closing_day integer DEFAULT 1 CHECK (closing_day >= 1 AND closing_day <= 10);

-- Criar função para atualizar updated_at se não existir
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar tabela para armazenar previsões mensais por categoria
CREATE TABLE public.account_period_forecasts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  forecasted_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(account_id, category_id, period_start)
);

-- Criar índices para melhorar performance
CREATE INDEX idx_forecasts_account_period ON public.account_period_forecasts(account_id, period_start);
CREATE INDEX idx_forecasts_category ON public.account_period_forecasts(category_id);

-- Habilitar RLS
ALTER TABLE public.account_period_forecasts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para previsões
CREATE POLICY "Users can view forecasts of their accounts"
ON public.account_period_forecasts
FOR SELECT
USING (user_has_account_access(account_id, auth.uid()));

CREATE POLICY "Users can create forecasts in their accounts"
ON public.account_period_forecasts
FOR INSERT
WITH CHECK (user_has_account_access(account_id, auth.uid()));

CREATE POLICY "Users can update forecasts in their accounts"
ON public.account_period_forecasts
FOR UPDATE
USING (user_has_account_access(account_id, auth.uid()));

CREATE POLICY "Users can delete forecasts in their accounts"
ON public.account_period_forecasts
FOR DELETE
USING (user_has_account_access(account_id, auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_account_period_forecasts_updated_at
BEFORE UPDATE ON public.account_period_forecasts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();