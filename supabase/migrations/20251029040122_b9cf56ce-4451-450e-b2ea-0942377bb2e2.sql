-- Adicionar foreign key entre user_action_logs e profiles
ALTER TABLE public.user_action_logs
ADD CONSTRAINT user_action_logs_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;