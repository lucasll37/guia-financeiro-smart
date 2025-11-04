-- Adicionar coluna image_url à tabela feedback
ALTER TABLE public.feedback
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Criar bucket para imagens de feedback
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-images', 'feedback-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS para o bucket feedback-images
-- Usuários autenticados podem fazer upload
CREATE POLICY "Users can upload feedback images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Todos podem visualizar imagens de feedback (bucket público)
CREATE POLICY "Anyone can view feedback images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'feedback-images');

-- Usuários podem deletar suas próprias imagens
CREATE POLICY "Users can delete their own feedback images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'feedback-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins podem deletar qualquer imagem de feedback
CREATE POLICY "Admins can delete any feedback images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'feedback-images' AND has_role(auth.uid(), 'admin'));