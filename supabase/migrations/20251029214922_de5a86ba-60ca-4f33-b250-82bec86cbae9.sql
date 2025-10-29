-- Update notification status when investment member status changes
CREATE OR REPLACE FUNCTION public.update_invite_notification_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the notification to mark as read and add response status
  UPDATE public.notifications
  SET 
    read = true,
    metadata = metadata || jsonb_build_object(
      'status', NEW.status,
      'responded_at', now()
    )
  WHERE type = 'invite'
    AND (metadata->>'invite_id')::uuid = NEW.id;

  RETURN NEW;
END;
$$;

-- Create trigger for investment members
DROP TRIGGER IF EXISTS tr_update_investment_invite_notification ON public.investment_members;
CREATE TRIGGER tr_update_investment_invite_notification
  AFTER UPDATE ON public.investment_members
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('accepted', 'declined'))
  EXECUTE FUNCTION public.update_invite_notification_status();

-- Create trigger for account members
DROP TRIGGER IF EXISTS tr_update_account_invite_notification ON public.account_members;
CREATE TRIGGER tr_update_account_invite_notification
  AFTER UPDATE ON public.account_members
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('accepted', 'rejected'))
  EXECUTE FUNCTION public.update_invite_notification_status();