-- Adiciona campo de mês inicial ao investimento
ALTER TABLE public.investment_assets 
ADD COLUMN initial_month date NOT NULL DEFAULT date_trunc('month', CURRENT_DATE);