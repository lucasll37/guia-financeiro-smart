-- Remover políticas existentes que podem estar causando conflito
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- Criar política correta para admins gerenciarem todas as subscriptions
CREATE POLICY "Admins can manage all subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Política para usuários gerenciarem apenas suas próprias subscriptions
CREATE POLICY "Users can manage own subscription"
  ON public.subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());