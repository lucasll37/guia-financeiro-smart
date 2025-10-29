-- Create function to notify owner when member leaves investment
CREATE OR REPLACE FUNCTION public.tr_notify_owner_on_member_leave()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_investment_name text;
  v_owner_id uuid;
  v_leaving_user_name text;
  v_leaving_user_email text;
BEGIN
  -- Get investment details
  SELECT ia.name, ia.owner_id 
  INTO v_investment_name, v_owner_id
  FROM public.investment_assets ia 
  WHERE ia.id = OLD.investment_id;

  -- Get leaving user details
  SELECT p.name, p.email 
  INTO v_leaving_user_name, v_leaving_user_email
  FROM public.profiles p
  WHERE p.id = OLD.user_id;

  -- Create notification for owner
  PERFORM public.create_notification(
    v_owner_id,
    'system',
    format('O usuário %s (%s) saiu do compartilhamento do investimento "%s"', 
      COALESCE(v_leaving_user_name, 'Sem nome'),
      COALESCE(v_leaving_user_email, 'sem email'),
      v_investment_name
    ),
    jsonb_build_object(
      'investment_id', OLD.investment_id,
      'investment_name', v_investment_name,
      'user_id', OLD.user_id,
      'user_name', v_leaving_user_name,
      'user_email', v_leaving_user_email
    )
  );

  RETURN OLD;
END;
$$;

-- Create trigger for when member leaves investment
CREATE TRIGGER tr_notify_owner_on_member_leave_trigger
  BEFORE DELETE ON public.investment_members
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_notify_owner_on_member_leave();