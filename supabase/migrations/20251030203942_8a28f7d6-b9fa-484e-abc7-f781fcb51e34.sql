-- Add AI tutor access configuration to admin settings
INSERT INTO public.admin_settings (setting_key, setting_value, updated_by)
VALUES (
  'ai_tutor_requires_pro',
  '{"enabled": false}'::jsonb,
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
)
ON CONFLICT (setting_key) DO NOTHING;