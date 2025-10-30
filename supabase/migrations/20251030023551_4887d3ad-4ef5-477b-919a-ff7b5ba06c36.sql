-- Remove old account invitation triggers and functions with CASCADE
DROP TRIGGER IF EXISTS tr_notify_invited_user ON public.account_members;
DROP TRIGGER IF EXISTS tr_notify_inviter_on_response ON public.account_members;
DROP TRIGGER IF EXISTS trg_notify_invited_user ON public.account_members CASCADE;
DROP FUNCTION IF EXISTS public.tr_notify_invited_user() CASCADE;
DROP FUNCTION IF EXISTS public.tr_notify_inviter_on_response() CASCADE;

-- Create new function to notify user when account is shared with them (direct acceptance)
CREATE OR REPLACE FUNCTION public.tr_notify_account_shared_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_name text;
  v_inviter_name text;
  v_role_text text;
BEGIN
  -- Only notify for accepted shares (direct sharing)
  IF NEW.status = 'accepted' THEN
    -- Get account name
    SELECT a.name INTO v_account_name 
    FROM public.accounts a 
    WHERE a.id = NEW.account_id;

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
      format('A conta "%s" foi compartilhada com você (%s) por %s', 
        v_account_name, 
        v_role_text,
        COALESCE(v_inviter_name, 'um usuário')
      ),
      jsonb_build_object(
        'account_id', NEW.account_id,
        'account_name', v_account_name,
        'invited_by', NEW.invited_by,
        'role', NEW.role
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to notify user when account is shared with them
CREATE TRIGGER tr_notify_account_shared_user
  AFTER INSERT ON public.account_members
  FOR EACH ROW
  WHEN (NEW.status = 'accepted')
  EXECUTE FUNCTION public.tr_notify_account_shared_user();