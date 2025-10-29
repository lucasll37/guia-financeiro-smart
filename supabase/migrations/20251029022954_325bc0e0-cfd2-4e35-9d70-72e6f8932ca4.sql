-- Drop existing restrictive INSERT policies
DROP POLICY IF EXISTS "Allow invite notifications creation" ON public.notifications;
DROP POLICY IF EXISTS "Allow system notifications creation" ON public.notifications;

-- Create a new policy that allows admins to create any notifications
CREATE POLICY "Admins can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  -- Also allow SECURITY DEFINER functions to insert
  current_setting('role') = 'postgres'
);

-- Keep existing policies for viewing and updating
-- Users can view their own notifications (already exists)
-- Users can update their own notifications (already exists)