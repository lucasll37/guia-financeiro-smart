-- Remover constraint duplicada
ALTER TABLE public.account_period_forecasts 
  DROP CONSTRAINT IF EXISTS unique_forecast_per_category_period;