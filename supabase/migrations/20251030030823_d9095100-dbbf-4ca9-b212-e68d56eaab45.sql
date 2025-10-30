-- Allow non-owners to leave shared accounts by deleting their own membership
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'account_members'
      AND policyname = 'Members can delete their own membership'
  ) THEN
    CREATE POLICY "Members can delete their own membership"
    ON public.account_members
    FOR DELETE
    USING (user_id = auth.uid());
  END IF;
END
$$;

-- Optionally, allow members to update their own membership (e.g., to decline)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'account_members'
      AND policyname = 'Members can update their own membership'
  ) THEN
    CREATE POLICY "Members can update their own membership"
    ON public.account_members
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;