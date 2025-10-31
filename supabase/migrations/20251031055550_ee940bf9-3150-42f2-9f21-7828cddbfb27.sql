-- Update create_notification to skip when user no longer exists
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _type notification_type,
  _message text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure recipient exists in auth before inserting to avoid FK violations during cascaded deletes
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, type, message, metadata)
  VALUES (_user_id, _type, _message, _metadata);
END;
$$;