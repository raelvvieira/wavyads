
-- Tabela de junção para múltiplos usuários por cliente
CREATE TABLE public.client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);

ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access on client_users"
  ON public.client_users FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Usuários podem ver seus próprios registros
CREATE POLICY "Users view own client_users"
  ON public.client_users FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Migrar dados existentes
INSERT INTO public.client_users (client_id, user_id)
SELECT id, user_id FROM public.clients WHERE user_id IS NOT NULL;

-- Nova política que usa client_users
CREATE POLICY "Client users view record"
  ON public.clients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = id AND cu.user_id = auth.uid()
    )
  );

-- Remover política antiga
DROP POLICY "Clients view own record" ON public.clients;
