-- Make log_user_action null-safe to prevent NOT NULL violations
CREATE OR REPLACE FUNCTION public.log_user_action(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip logging when user_id is unknown/null (e.g., cascade deletes where owner is unavailable)
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_action_logs (user_id, action, entity_type, entity_id)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id);
END;
$$;