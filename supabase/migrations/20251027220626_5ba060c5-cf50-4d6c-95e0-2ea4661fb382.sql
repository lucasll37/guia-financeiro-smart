-- Permitir que valid_until seja nulo para cupons sem validade
ALTER TABLE public.coupons ALTER COLUMN valid_until DROP NOT NULL;