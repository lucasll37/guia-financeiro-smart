-- Grant INSERT permission on notifications table for triggers
-- Create function with elevated privileges to insert notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _type notification_type,
  _message text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, message, metadata)
  VALUES (_user_id, _type, _message, _metadata);
END;
$$;

-- Update the trigger functions to use the new function
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
      'invited_by', NEW.invited_by
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tr_notify_inviter_on_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_account_name text;
BEGIN
  -- Only act when status changes
  IF (NEW.status IS DISTINCT FROM OLD.status) THEN
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