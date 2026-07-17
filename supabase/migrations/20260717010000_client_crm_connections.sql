-- Conexão SSO por cliente com a instância EVO CRM dele.
-- Guarda a URL e as CREDENCIAIS DE SERVIÇO usadas pelo backend da Wavy pra
-- emitir a sessão do cliente no EVO (SSO). É uma tabela SENSÍVEL: só admin
-- gerencia e, no runtime, apenas a edge function (service role) lê os segredos.
-- Os client-users NÃO têm policy de SELECT aqui — nunca enxergam credenciais.
-- (A clients.crm_url continua existindo como URL "pública" de exibição/fallback;
--  esta tabela é a parte secreta.)

CREATE TABLE IF NOT EXISTS public.client_crm_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  -- URLs da instância EVO daquele cliente
  evo_base_url text NOT NULL,          -- frontend do EVO (ex.: https://crm-cliente.dominio.com)
  evo_auth_url text,                   -- API de auth do EVO (Doorkeeper), se diferente da base
  -- identidade do usuário do cliente dentro do EVO
  evo_user_email text,
  -- mecanismo de SSO e segredos correspondentes (só um é usado, conforme sso_mode)
  sso_mode text NOT NULL DEFAULT 'jwt' CHECK (sso_mode IN ('jwt', 'oauth_password', 'service_token')),
  evo_jwt_secret text,                 -- HS256 do EVO (modo 'jwt' — assina a sessão no servidor)
  evo_service_token text,              -- token de serviço estático (modo 'service_token')
  evo_password text,                   -- senha do usuário no EVO (modo 'oauth_password')
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_crm_connections_client_idx
  ON public.client_crm_connections (client_id);

ALTER TABLE public.client_crm_connections ENABLE ROW LEVEL SECURITY;

-- Só admin. Sem policy pra client-users => eles nunca leem os segredos.
-- A edge function crm-sso acessa via service role (ignora RLS).
CREATE POLICY "Admins manage client crm connections"
ON public.client_crm_connections FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

NOTIFY pgrst, 'reload schema';
