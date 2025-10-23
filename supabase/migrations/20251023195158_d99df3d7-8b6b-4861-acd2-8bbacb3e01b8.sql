-- Criar tabela para rendimentos mensais de investimentos
CREATE TABLE IF NOT EXISTS public.investment_monthly_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investment_id UUID NOT NULL REFERENCES public.investment_assets(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  actual_return NUMERIC NOT NULL DEFAULT 0,
  balance_after NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(investment_id, month)
);

-- Enable RLS
ALTER TABLE public.investment_monthly_returns ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view returns of their investments"
ON public.investment_monthly_returns
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.investment_assets ia
    WHERE ia.id = investment_monthly_returns.investment_id
    AND user_has_account_access(ia.account_id, auth.uid())
  )
);

CREATE POLICY "Users can manage returns of their investments"
ON public.investment_monthly_returns
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.investment_assets ia
    WHERE ia.id = investment_monthly_returns.investment_id
    AND user_has_account_access(ia.account_id, auth.uid())
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_investment_monthly_returns_updated_at
BEFORE UPDATE ON public.investment_monthly_returns
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();