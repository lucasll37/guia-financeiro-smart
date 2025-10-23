-- Fix search_path for user_has_account_access function
CREATE OR REPLACE FUNCTION user_has_account_access(account_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.accounts WHERE id = account_uuid AND owner_id = user_uuid
    UNION
    SELECT 1 FROM public.account_members 
    WHERE account_id = account_uuid AND user_id = user_uuid AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;