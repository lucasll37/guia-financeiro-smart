-- Create function to notify account owner when member leaves
CREATE OR REPLACE FUNCTION public.tr_notify_account_owner_on_member_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_name text;
  v_owner_id uuid;
  v_leaving_user_name text;
  v_leaving_user_email text;
BEGIN
  -- Get account details
  SELECT a.name, a.owner_id 
  INTO v_account_name, v_owner_id
  FROM public.accounts a 
  WHERE a.id = OLD.account_id;

  -- Get leaving user details
  SELECT p.name, p.email 
  INTO v_leaving_user_name, v_leaving_user_email
  FROM public.profiles p
  WHERE p.id = OLD.user_id;

  -- Create notification for owner
  PERFORM public.create_notification(
    v_owner_id,
    'system',
    format('O usuário %s (%s) saiu do compartilhamento da conta "%s"', 
      COALESCE(v_leaving_user_name, 'Sem nome'),
      COALESCE(v_leaving_user_email, 'sem email'),
      v_account_name
    ),
    jsonb_build_object(
      'account_id', OLD.account_id,
      'account_name', v_account_name,
      'user_id', OLD.user_id,
      'user_name', v_leaving_user_name,
      'user_email', v_leaving_user_email
    )
  );

  RETURN OLD;
END;
$$;

-- Create trigger to notify owner when member leaves/is removed
CREATE TRIGGER tr_notify_account_owner_on_member_leave
  BEFORE DELETE ON public.account_members
  FOR EACH ROW
  WHEN (OLD.status = 'accepted')
  EXECUTE FUNCTION public.tr_notify_account_owner_on_member_leave();