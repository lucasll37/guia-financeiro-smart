-- Adjust notifications INSERT policies to allow trigger-based inserts by inviter and invitee
-- Drop existing admin-only INSERT policy if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Admins can create notifications for all users'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can create notifications for all users" ON public.notifications';
  END IF;
END$$;

-- Policy: inviter can insert invite notification for invited user
CREATE POLICY "Inviter can insert invite notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    type = 'invite'::notification_type
    AND (metadata->>'invited_by')::uuid = auth.uid()
  );

-- Policy: invitee can insert response notification back to inviter
CREATE POLICY "Invitee can insert response notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    type = 'invite'::notification_type
    AND (metadata->>'responded_by')::uuid = auth.uid()
  );