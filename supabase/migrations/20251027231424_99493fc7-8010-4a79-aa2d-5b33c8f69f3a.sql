-- Add RLS policy for admins to create notifications
CREATE POLICY "Admins can create notifications for all users"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));