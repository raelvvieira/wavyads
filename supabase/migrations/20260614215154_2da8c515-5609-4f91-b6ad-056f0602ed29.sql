
CREATE TABLE public.client_editorials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  design_system_doc text NOT NULL DEFAULT '',
  visual_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_editorials TO authenticated;
GRANT ALL ON public.client_editorials TO service_role;

ALTER TABLE public.client_editorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all editorials"
  ON public.client_editorials FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Client users can view their editorial"
  ON public.client_editorials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = client_editorials.client_id
        AND cu.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_client_editorials_updated_at
  BEFORE UPDATE ON public.client_editorials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
