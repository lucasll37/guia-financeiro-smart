-- Adicionar política RLS para admins poderem deletar feedbacks
CREATE POLICY "Admins can delete feedback"
ON public.feedback
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));