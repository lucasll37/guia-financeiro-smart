-- Create triggers for account member notifications
-- These triggers automatically create notifications when users are invited and respond

-- 1. Trigger to notify invited user when they are added to an account
CREATE OR REPLACE FUNCTION public.tr_notify_invited_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_account_name text;
BEGIN
  -- Get account name
  SELECT a.name INTO v_account_name FROM public.accounts a WHERE a.id = NEW.account_id;

  -- Create notification using the helper function
  PERFORM public.create_notification(
    NEW.user_id,
    'invite',
    COALESCE(format('Você foi convidado para "%s"', v_account_name), 'Você foi convidado para uma conta'),
    jsonb_build_object(
      'account_id', NEW.account_id,
      'account_name', v_account_name,
      'invite_id', NEW.id,
      'invited_by', NEW.invited_by,
      'role', NEW.role
    )
  );

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger to avoid duplicates
DROP TRIGGER IF EXISTS trg_notify_invited_user ON public.account_members;
CREATE TRIGGER trg_notify_invited_user
  AFTER INSERT ON public.account_members
  FOR EACH ROW 
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.tr_notify_invited_user();

-- 2. Trigger to notify inviter when invitee responds (accept/reject)
CREATE OR REPLACE FUNCTION public.tr_notify_inviter_on_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_account_name text;
BEGIN
  -- Only act when status changes from pending to accepted/rejected
  IF (NEW.status IS DISTINCT FROM OLD.status) AND (OLD.status = 'pending') THEN
    SELECT a.name INTO v_account_name FROM public.accounts a WHERE a.id = NEW.account_id;

    PERFORM public.create_notification(
      NEW.invited_by,
      'invite',
      CASE WHEN NEW.status = 'accepted' THEN
        COALESCE(format('Seu convite para "%s" foi aceito', v_account_name), 'Seu convite foi aceito')
      ELSE
        COALESCE(format('Seu convite para "%s" foi recusado', v_account_name), 'Seu convite foi recusado')
      END,
      jsonb_build_object(
        'account_id', NEW.account_id,
        'account_name', v_account_name,
        'responded_by', NEW.user_id,
        'status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_notify_inviter_on_response ON public.account_members;
CREATE TRIGGER trg_notify_inviter_on_response
  AFTER UPDATE ON public.account_members
  FOR EACH ROW 
  EXECUTE FUNCTION public.tr_notify_inviter_on_response();