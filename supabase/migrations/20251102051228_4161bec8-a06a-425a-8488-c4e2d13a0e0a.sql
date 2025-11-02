-- Adicionar foreign key constraint para goal_members.user_id -> profiles.id
ALTER TABLE public.goal_members
ADD CONSTRAINT goal_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;