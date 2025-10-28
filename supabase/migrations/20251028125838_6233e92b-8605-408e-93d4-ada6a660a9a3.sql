-- Fix RLS policies for notifications to allow trigger-based inserts
-- The triggers run as SECURITY DEFINER so they bypass RLS, but we need proper policies

-- Drop the restrictive policies we just created
DROP POLICY IF EXISTS "Inviter can insert invite notifications" ON public.notifications;
DROP POLICY IF EXISTS "Invitee can insert response notifications" ON public.notifications;

-- Create a policy that allows the notification triggers to insert
-- Since triggers run as SECURITY DEFINER (as the function owner), 
-- and the notification creation happens via a helper function,
-- we need to allow inserts for invite notifications
CREATE POLICY "Allow invite notifications creation"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    type = 'invite'::notification_type
  );

-- Also allow system notifications for ownership transfers
CREATE POLICY "Allow system notifications creation"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    type = 'system'::notification_type
  );