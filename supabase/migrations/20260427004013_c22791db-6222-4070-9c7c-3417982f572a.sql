-- TABLE 1: client_pixels
CREATE TABLE public.client_pixels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  pixel_id text NOT NULL,
  access_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on client_pixels"
ON public.client_pixels
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients view own pixel"
ON public.client_pixels
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.client_id = client_pixels.client_id
      AND cu.user_id = auth.uid()
  )
);

-- TABLE 2: offline_conversions
CREATE TABLE public.offline_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  -- Contact
  email text,
  phone text,
  fn text,
  ln text,
  -- Location
  zip text,
  ct text,
  country text DEFAULT 'BR',
  -- Personal
  dob text,
  doby text,
  gen text,
  age integer,
  -- Conversion
  event_name text NOT NULL DEFAULT 'Purchase',
  conversion_date timestamptz NOT NULL,
  value numeric(10,2),
  currency text NOT NULL DEFAULT 'BRL',
  -- Control
  send_status text NOT NULL DEFAULT 'pending',
  meta_event_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_offline_conversions_client_id ON public.offline_conversions(client_id);
CREATE INDEX idx_offline_conversions_send_status ON public.offline_conversions(send_status);

ALTER TABLE public.offline_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on offline_conversions"
ON public.offline_conversions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients view own offline_conversions"
ON public.offline_conversions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.client_id = offline_conversions.client_id
      AND cu.user_id = auth.uid()
  )
);

CREATE POLICY "Clients insert own offline_conversions"
ON public.offline_conversions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.client_id = offline_conversions.client_id
      AND cu.user_id = auth.uid()
  )
);