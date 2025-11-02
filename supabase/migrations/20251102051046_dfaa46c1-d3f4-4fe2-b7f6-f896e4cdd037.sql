-- Criar tabela de membros de metas
CREATE TABLE public.goal_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  status member_status NOT NULL DEFAULT 'pending',
  role account_member_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(goal_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.goal_members ENABLE ROW LEVEL SECURITY;

-- Policies para goal_members
CREATE POLICY "Goal owners can manage members"
ON public.goal_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = goal_members.goal_id
    AND goals.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their goal memberships"
ON public.goal_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = goal_members.goal_id
    AND goals.user_id = auth.uid()
  )
);

CREATE POLICY "Members can delete their own membership"
ON public.goal_members
FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Members can update their own membership"
ON public.goal_members
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Função para verificar acesso à meta
CREATE OR REPLACE FUNCTION public.user_has_goal_access(goal_uuid uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.goal_members gm
    WHERE gm.goal_id = goal_uuid
      AND gm.user_id = _user_id
      AND gm.status = 'accepted'
  );
$$;

-- Função para verificar se pode editar meta
CREATE OR REPLACE FUNCTION public.user_can_edit_goal(goal_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se é o dono da meta, pode editar
  IF EXISTS (
    SELECT 1 FROM public.goals 
    WHERE id = goal_uuid AND user_id = user_uuid
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Se é um membro com role 'editor', pode editar
  IF EXISTS (
    SELECT 1 FROM public.goal_members 
    WHERE goal_id = goal_uuid 
      AND user_id = user_uuid 
      AND status = 'accepted'
      AND role = 'editor'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Atualizar RLS policies da tabela goals para considerar membros
DROP POLICY IF EXISTS "Users can manage their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can view their own goals" ON public.goals;

CREATE POLICY "Goal owners can manage their goals"
ON public.goals
FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Users can view goals they own or have access to"
ON public.goals
FOR SELECT
USING (
  user_id = auth.uid()
  OR user_has_goal_access(id, auth.uid())
);

CREATE POLICY "Owners and editors can update goals"
ON public.goals
FOR UPDATE
USING (user_can_edit_goal(id, auth.uid()));

-- Funções de log para goal_members (CRIAR ANTES DOS TRIGGERS)
CREATE OR REPLACE FUNCTION public.tr_log_goal_member_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_user_action(
    NEW.invited_by,
    'share_goal',
    'goal_member',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tr_log_goal_member_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_user_action(
    NEW.user_id,
    'update_goal_share',
    'goal_member',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tr_log_goal_member_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_user_action(
    OLD.user_id,
    'remove_goal_share',
    'goal_member',
    OLD.id
  );
  RETURN OLD;
END;
$$;

-- Trigger: Notificar usuário convidado quando aceito
CREATE OR REPLACE FUNCTION public.tr_notify_goal_invited_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal_name text;
  v_inviter_name text;
  v_inviter_email text;
  v_role_text text;
BEGIN
  -- Para INSERT: notificar se status é 'accepted'
  -- Para UPDATE: notificar apenas se status MUDOU para 'accepted'
  IF (TG_OP = 'INSERT' AND NEW.status = 'accepted') OR
     (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'accepted' AND NEW.status = 'accepted') THEN
    
    SELECT g.name INTO v_goal_name 
    FROM public.goals g 
    WHERE g.id = NEW.goal_id;

    SELECT p.name, p.email INTO v_inviter_name, v_inviter_email
    FROM public.profiles p
    WHERE p.id = NEW.invited_by;

    v_role_text := CASE 
      WHEN NEW.role = 'editor' THEN 'Editor'
      ELSE 'Visualizador'
    END;

    PERFORM public.create_notification(
      NEW.user_id,
      'system',
      format('A meta "%s" foi compartilhada contigo (%s) por %s (%s)', 
        v_goal_name, 
        v_role_text,
        COALESCE(v_inviter_name, 'Sem nome'),
        COALESCE(v_inviter_email, 'sem email')
      ),
      jsonb_build_object(
        'goal_id', NEW.goal_id,
        'goal_name', v_goal_name,
        'invited_by', NEW.invited_by,
        'role', NEW.role
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: Notificar quem convidou sobre resposta
CREATE OR REPLACE FUNCTION public.tr_notify_goal_inviter_on_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal_name text;
BEGIN
  -- Only act when status changes
  IF (NEW.status IS DISTINCT FROM OLD.status) THEN
    SELECT g.name INTO v_goal_name 
    FROM public.goals g 
    WHERE g.id = NEW.goal_id;

    PERFORM public.create_notification(
      NEW.invited_by,
      'invite',
      CASE WHEN NEW.status = 'accepted' THEN
        COALESCE(format('Seu convite para "%s" foi aceito', v_goal_name), 'Seu convite foi aceito')
      ELSE
        COALESCE(format('Seu convite para "%s" foi recusado', v_goal_name), 'Seu convite foi recusado')
      END,
      jsonb_build_object(
        'goal_id', NEW.goal_id,
        'goal_name', v_goal_name,
        'responded_by', NEW.user_id,
        'status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: Notificar usuário removido
CREATE OR REPLACE FUNCTION public.tr_notify_removed_from_goal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal_name text;
  v_owner_id uuid;
  v_remover_name text;
  v_remover_email text;
BEGIN
  -- Buscar owner da meta
  SELECT g.name, g.user_id 
  INTO v_goal_name, v_owner_id
  FROM public.goals g 
  WHERE g.id = OLD.goal_id;

  -- Se o próprio usuário está saindo, não notificar (outro trigger cuida disso)
  IF OLD.user_id = auth.uid() THEN
    RETURN OLD;
  END IF;

  -- Buscar dados de quem removeu (deve ser o owner)
  SELECT p.name, p.email 
  INTO v_remover_name, v_remover_email
  FROM public.profiles p
  WHERE p.id = v_owner_id;

  -- Notificar o usuário removido
  PERFORM public.create_notification(
    OLD.user_id,
    'system',
    format('O acesso à meta "%s" foi revogado por %s (%s)', 
      v_goal_name,
      COALESCE(v_remover_name, 'Sem nome'),
      COALESCE(v_remover_email, 'sem email')
    ),
    jsonb_build_object(
      'goal_id', OLD.goal_id,
      'goal_name', v_goal_name,
      'removed_by', v_owner_id
    )
  );

  RETURN OLD;
END;
$$;

-- Trigger: Notificar owner quando membro sai
CREATE OR REPLACE FUNCTION public.tr_notify_goal_owner_on_member_leave()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal_name text;
  v_owner_id uuid;
  v_leaving_user_name text;
  v_leaving_user_email text;
BEGIN
  -- Só notifica se o próprio usuário está saindo
  IF OLD.user_id != auth.uid() THEN
    RETURN OLD;
  END IF;

  SELECT g.name, g.user_id 
  INTO v_goal_name, v_owner_id
  FROM public.goals g 
  WHERE g.id = OLD.goal_id;

  SELECT p.name, p.email 
  INTO v_leaving_user_name, v_leaving_user_email
  FROM public.profiles p
  WHERE p.id = OLD.user_id;

  PERFORM public.create_notification(
    v_owner_id,
    'system',
    format('O usuário %s (%s) saiu da meta "%s" compartilhada', 
      COALESCE(v_leaving_user_name, 'Sem nome'),
      COALESCE(v_leaving_user_email, 'sem email'),
      v_goal_name
    ),
    jsonb_build_object(
      'goal_id', OLD.goal_id,
      'goal_name', v_goal_name,
      'user_id', OLD.user_id,
      'user_name', v_leaving_user_name,
      'user_email', v_leaving_user_email
    )
  );

  RETURN OLD;
END;
$$;

-- Criar triggers (DEPOIS de todas as funções)
CREATE TRIGGER tr_notify_goal_invited_user
AFTER INSERT OR UPDATE ON public.goal_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_notify_goal_invited_user();

CREATE TRIGGER tr_notify_goal_inviter_on_response
AFTER UPDATE ON public.goal_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_notify_goal_inviter_on_response();

CREATE TRIGGER tr_notify_removed_from_goal
AFTER DELETE ON public.goal_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_notify_removed_from_goal();

CREATE TRIGGER tr_notify_goal_owner_on_member_leave
AFTER DELETE ON public.goal_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_notify_goal_owner_on_member_leave();

CREATE TRIGGER tr_log_goal_member_creation
AFTER INSERT ON public.goal_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_goal_member_creation();

CREATE TRIGGER tr_log_goal_member_update
AFTER UPDATE ON public.goal_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_goal_member_update();

CREATE TRIGGER tr_log_goal_member_deletion
AFTER DELETE ON public.goal_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_goal_member_deletion();