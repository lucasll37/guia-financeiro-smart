-- Adicionar configurações do Tutor IA na tabela app_settings
INSERT INTO public.app_settings (key, value, description, updated_by)
VALUES 
  ('ai_tutor_tutorial_text', '{"text": ""}', 'Texto tutorial base para o Tutor IA usar como contexto ao responder perguntas e criar sugestões', NULL),
  ('ai_tutor_enabled', '{"enabled": false}', 'Habilitar ou desabilitar o Tutor IA no sistema', NULL)
ON CONFLICT (key) DO NOTHING;