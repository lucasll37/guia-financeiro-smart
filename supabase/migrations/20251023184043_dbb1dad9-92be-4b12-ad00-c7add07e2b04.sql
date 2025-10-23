-- Adicionar coluna email na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;

-- Criar índice para melhorar performance de busca por email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Atualizar a função handle_new_user para incluir email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;