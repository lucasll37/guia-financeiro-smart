-- Add deleted_at column to accounts table
ALTER TABLE public.accounts 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance on deleted accounts queries
CREATE INDEX idx_accounts_deleted_at ON public.accounts(deleted_at);

-- Update RLS policies to exclude soft-deleted accounts from normal queries
DROP POLICY IF EXISTS "Users can view their own accounts or accounts they are members " ON public.accounts;

CREATE POLICY "Users can view their own accounts or accounts they are members"
ON public.accounts
FOR SELECT
USING (
  ((owner_id = auth.uid()) OR user_has_account_access(id, auth.uid()))
  AND deleted_at IS NULL
);

-- Allow viewing deleted accounts for restoration (within 7 days)
CREATE POLICY "Users can view their soft-deleted accounts for restoration"
ON public.accounts
FOR SELECT
USING (
  owner_id = auth.uid()
  AND deleted_at IS NOT NULL
  AND deleted_at > (now() - interval '7 days')
);

-- Function to permanently delete accounts older than 7 days
CREATE OR REPLACE FUNCTION public.cleanup_deleted_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.accounts
  WHERE deleted_at IS NOT NULL
  AND deleted_at < (now() - interval '7 days');
END;
$$;

-- Function to restore a soft-deleted account
CREATE OR REPLACE FUNCTION public.restore_account(account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.accounts
  SET deleted_at = NULL
  WHERE id = account_id
  AND owner_id = auth.uid()
  AND deleted_at IS NOT NULL
  AND deleted_at > (now() - interval '7 days');
END;
$$;