-- Add inflation_rate and contribution fields to investment_monthly_returns
ALTER TABLE public.investment_monthly_returns
ADD COLUMN inflation_rate numeric NOT NULL DEFAULT 0,
ADD COLUMN contribution numeric NOT NULL DEFAULT 0;