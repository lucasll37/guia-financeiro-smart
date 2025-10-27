-- Permitir que qualquer usuário autenticado veja todos os perfis (para funcionalidade admin)
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;

CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Manter a política de update para que usuários só possam editar seu próprio perfil
-- A política "Usuários podem atualizar seu próprio perfil" já existe e está correta