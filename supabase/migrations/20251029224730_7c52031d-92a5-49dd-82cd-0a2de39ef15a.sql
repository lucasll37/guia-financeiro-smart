-- Update the notification function to use 'system' type instead of 'info'
CREATE OR REPLACE FUNCTION public.tr_notify_investment_invited_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_investment_name text;
  v_inviter_name text;
  v_role_text text;
BEGIN
  -- Only notify for accepted invitations (direct sharing)
  IF NEW.status = 'accepted' THEN
    -- Get investment name
    SELECT ia.name INTO v_investment_name 
    FROM public.investment_assets ia 
    WHERE ia.id = NEW.investment_id;

    -- Get inviter name
    SELECT p.name INTO v_inviter_name
    FROM public.profiles p
    WHERE p.id = NEW.invited_by;

    -- Translate role to Portuguese
    v_role_text := CASE 
      WHEN NEW.role = 'editor' THEN 'Editar'
      ELSE 'Visualizar'
    END;

    -- Create notification with 'system' type
    PERFORM public.create_notification(
      NEW.user_id,
      'system',
      format('O investimento "%s" foi compartilhado com você (%s) por %s', 
        v_investment_name, 
        v_role_text,
        COALESCE(v_inviter_name, 'um usuário')
      ),
      jsonb_build_object(
        'investment_id', NEW.investment_id,
        'investment_name', v_investment_name,
        'invited_by', NEW.invited_by,
        'role', NEW.role
      )
    );
  END IF;

  RETURN NEW;
END;
$$;