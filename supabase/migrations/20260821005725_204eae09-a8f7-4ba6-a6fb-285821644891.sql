-- ---------------------------------------------------------------------------
-- UGC Studio: projetos e clipes de vídeo
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ugc_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  avatar_asset_id uuid REFERENCES public.creative_assets(id) ON DELETE SET NULL,
  tier text NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard', 'premium')),
  product_image_url text,
  script_json jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'done', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ugc_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ugc_projects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('avatar', 'broll')),
  segment text CHECK (segment IN ('hook', 'body_1', 'body_2', 'cta')),
  angle_preset text,
  CONSTRAINT ugc_clips_kind_fields_check CHECK (
    (kind = 'avatar' AND segment IS NOT NULL AND angle_preset IS NULL)
    OR
    (kind = 'broll' AND segment IS NULL AND angle_preset IS NOT NULL)
  ),
  speech text,
  duration_seconds numeric NOT NULL DEFAULT 8,
  resolution text NOT NULL DEFAULT '1080p',
  audio boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'generating', 'ready', 'failed')),
  url text,
  thumbnail_url text,
  error_message text,
  prompt text,
  model text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ugc_projects TO authenticated;
GRANT ALL ON public.ugc_projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ugc_clips TO authenticated;
GRANT ALL ON public.ugc_clips TO service_role;

CREATE INDEX IF NOT EXISTS ugc_clips_project_kind_idx
  ON public.ugc_clips (project_id, kind, created_at DESC);

CREATE INDEX IF NOT EXISTS ugc_projects_client_idx
  ON public.ugc_projects (client_id, updated_at DESC);

DROP TRIGGER IF EXISTS ugc_projects_updated_at ON public.ugc_projects;
CREATE TRIGGER ugc_projects_updated_at
BEFORE UPDATE ON public.ugc_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS ugc_clips_updated_at ON public.ugc_clips;
CREATE TRIGGER ugc_clips_updated_at
BEFORE UPDATE ON public.ugc_clips
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ugc_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_clips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage ugc projects" ON public.ugc_projects;
CREATE POLICY "Admins manage ugc projects"
ON public.ugc_projects FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage ugc clips" ON public.ugc_clips;
CREATE POLICY "Admins manage ugc clips"
ON public.ugc_clips FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

NOTIFY pgrst, 'reload schema';