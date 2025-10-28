-- Script para tornar um usuário admin
-- Substitua 'SEU_EMAIL_AQUI' pelo seu email de login

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Busca o ID do usuário pelo email (você deve substituir pelo seu email)
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'SEU_EMAIL_AQUI'  -- IMPORTANTE: Substitua pelo seu email
  LIMIT 1;

  -- Se encontrou o usuário, adiciona o role de admin
  IF admin_user_id IS NOT NULL THEN
    -- Tenta inserir, mas ignora se já existir
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Usuário % promovido a admin com sucesso', admin_user_id;
  ELSE
    RAISE NOTICE 'Usuário com email SEU_EMAIL_AQUI não encontrado';
  END IF;
END $$;