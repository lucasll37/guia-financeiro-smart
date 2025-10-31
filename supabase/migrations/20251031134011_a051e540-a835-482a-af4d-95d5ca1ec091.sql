-- Função para notificar admins sobre novo feedback
CREATE OR REPLACE FUNCTION public.tr_notify_admins_on_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_name text;
  v_user_email text;
  v_type_text text;
  v_admin_id uuid;
BEGIN
  -- Buscar informações do usuário que enviou o feedback
  SELECT p.name, p.email 
  INTO v_user_name, v_user_email
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  -- Definir texto do tipo de feedback
  v_type_text := CASE 
    WHEN NEW.type = 'bug' THEN 'relatou um bug'
    WHEN NEW.type = 'suggestion' THEN 'sugeriu uma melhoria'
    ELSE 'enviou um feedback'
  END;

  -- Notificar todos os admins
  FOR v_admin_id IN 
    SELECT user_id 
    FROM public.user_roles 
    WHERE role = 'admin'
  LOOP
    PERFORM public.create_notification(
      v_admin_id,
      'system',
      format('Usuário %s (%s) %s', 
        COALESCE(v_user_name, 'Sem nome'),
        COALESCE(v_user_email, 'sem email'),
        v_type_text
      ),
      jsonb_build_object(
        'feedback_id', NEW.id,
        'feedback_type', NEW.type,
        'user_id', NEW.user_id,
        'user_name', v_user_name,
        'user_email', v_user_email,
        'message', NEW.message
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Criar trigger na tabela feedback
DROP TRIGGER IF EXISTS notify_admins_on_feedback ON public.feedback;

CREATE TRIGGER notify_admins_on_feedback
AFTER INSERT ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.tr_notify_admins_on_feedback();