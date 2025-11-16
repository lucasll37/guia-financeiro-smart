-- Inserir configuração do Stripe Pro Price ID (se não existir)
INSERT INTO public.admin_settings (setting_key, setting_value, updated_at)
VALUES ('stripe_pro_price_id', '"price_1SN39tHHQy81N0cFELbk2209"'::jsonb, now())
ON CONFLICT (setting_key) DO NOTHING;