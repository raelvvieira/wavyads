DROP POLICY "Client users view record" ON public.clients;

CREATE POLICY "Client users view record"
  ON public.clients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = clients.id AND cu.user_id = auth.uid()
    )
  );