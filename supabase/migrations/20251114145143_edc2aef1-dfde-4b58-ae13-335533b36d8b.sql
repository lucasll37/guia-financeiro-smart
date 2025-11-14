-- Add tutorial video URL setting to app_settings
INSERT INTO app_settings (key, value, description, updated_by)
VALUES (
  'tutorial_video_url',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  'URL do vídeo do YouTube para o tutorial (formato embed)',
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (key) DO NOTHING;