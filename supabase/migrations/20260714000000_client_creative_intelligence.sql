-- Inteligência do cliente: banco de copys usadas + marcação de artes
-- representativas por cliente. Alimenta o "Criativo Rápido" (reaproveitar
-- copy/estilo já usados para aquele cliente, sem passar pelo fluxo completo).

-- Copy salva explicitamente pelo usuário como referência do tom do cliente
-- (botão "Salvar copy pra inteligência do cliente").
CREATE TABLE IF NOT EXISTS public.client_copy_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  copy_text text NOT NULL,
  tema text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
  project_id uuid NULL REFERENCES public.creative_projects(id) ON DELETE SET NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_copy_bank_client_idx
  ON public.client_copy_bank (client_id, created_at DESC);

ALTER TABLE public.client_copy_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client copy bank"
ON public.client_copy_bank FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Marca uma arte (já existente em creative_assets) como representativa do
-- cliente — usada como referência de estilo pelo "Criativo Rápido"
-- (botão "Salvar arte pra inteligência do cliente").
ALTER TABLE public.creative_assets
  ADD COLUMN IF NOT EXISTS is_client_intelligence boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS creative_assets_client_intelligence_idx
  ON public.creative_assets (client_id, is_client_intelligence)
  WHERE is_client_intelligence = true;

NOTIFY pgrst, 'reload schema';
