-- Adicionar constraint única para evitar previsões duplicadas
-- Uma conta não pode ter duas previsões para a mesma categoria no mesmo período
ALTER TABLE public.account_period_forecasts
ADD CONSTRAINT unique_forecast_per_category_period 
UNIQUE (account_id, category_id, period_start);