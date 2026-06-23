-- Garante que as tabelas do Criativo Studio existam e força o PostgREST
-- a recarregar o schema cache (resolve "table not found in schema cache").

CREATE TABLE IF NOT EXISTS public.creative_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id uuid NULL REFERENCES public.clients(id) ON DELETE SET NULL,
  campaign_id uuid NULL,
  title text NOT NULL,
  initial_prompt text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'generated', 'archived')),
  current_stage text,
  selected_aspect_ratio text NOT NULL DEFAULT '4:5',
  selected_resolution text NOT NULL DEFAULT '4K',
  language text NOT NULL DEFAULT 'pt-BR',
  model text NULL,
  thumbnail_url text NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creative_project_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.creative_projects(id) ON DELETE CASCADE,
  state_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

CREATE TABLE IF NOT EXISTS public.creative_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NULL REFERENCES public.creative_projects(id) ON DELETE SET NULL,
  client_id uuid NULL REFERENCES public.clients(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('reference', 'logo', 'product', 'avatar', 'generated', 'factor', 'edited', 'template')),
  url text NOT NULL,
  thumbnail_url text NULL,
  filename text NULL,
  mime_type text NULL,
  size_bytes bigint NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creative_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.creative_projects(id) ON DELETE CASCADE,
  asset_id uuid NULL REFERENCES public.creative_assets(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('main', 'square', 'factor', 'edited')),
  aspect_ratio text NULL,
  resolution text NULL,
  image_url text NOT NULL,
  prompt text NULL,
  source_output_id uuid NULL REFERENCES public.creative_outputs(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creative_copy_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.creative_projects(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('original', 'ai')),
  is_approved boolean NOT NULL DEFAULT false,
  variation_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creative_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id uuid NULL REFERENCES public.clients(id) ON DELETE SET NULL,
  source_project_id uuid NULL REFERENCES public.creative_projects(id) ON DELETE SET NULL,
  source_output_id uuid NULL REFERENCES public.creative_outputs(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NULL,
  category text NULL,
  niche text NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'global')),
  aspect_ratio text NOT NULL DEFAULT '4:5',
  preferred_resolution text NOT NULL DEFAULT '4K',
  preview_url text NULL,
  design_system_doc text NULL,
  base_prompt text NULL,
  negative_prompt text NULL,
  copy_structure jsonb NOT NULL DEFAULT '{}'::jsonb,
  layout_structure jsonb NOT NULL DEFAULT '{}'::jsonb,
  style_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creative_template_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.creative_templates(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.creative_assets(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('preview', 'reference', 'logo_placeholder', 'product_placeholder', 'avatar_placeholder', 'generated_example')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS (idempotente via DO block)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creative_projects' AND policyname = 'Admins manage creative projects') THEN
    ALTER TABLE public.creative_projects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins manage creative projects" ON public.creative_projects FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creative_project_state' AND policyname = 'Admins manage creative project state') THEN
    ALTER TABLE public.creative_project_state ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins manage creative project state" ON public.creative_project_state FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creative_assets' AND policyname = 'Admins manage creative assets') THEN
    ALTER TABLE public.creative_assets ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins manage creative assets" ON public.creative_assets FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creative_outputs' AND policyname = 'Admins manage creative outputs') THEN
    ALTER TABLE public.creative_outputs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins manage creative outputs" ON public.creative_outputs FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creative_copy_variations' AND policyname = 'Admins manage creative copy variations') THEN
    ALTER TABLE public.creative_copy_variations ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins manage creative copy variations" ON public.creative_copy_variations FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creative_templates' AND policyname = 'Admins manage creative templates') THEN
    ALTER TABLE public.creative_templates ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins manage creative templates" ON public.creative_templates FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creative_template_assets' AND policyname = 'Admins manage creative template assets') THEN
    ALTER TABLE public.creative_template_assets ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins manage creative template assets" ON public.creative_template_assets FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Índices (IF NOT EXISTS para idempotência)
CREATE INDEX IF NOT EXISTS creative_projects_updated_at_idx ON public.creative_projects (updated_at DESC);
CREATE INDEX IF NOT EXISTS creative_projects_created_by_idx ON public.creative_projects (created_by);
CREATE INDEX IF NOT EXISTS creative_assets_project_id_idx ON public.creative_assets (project_id);
CREATE INDEX IF NOT EXISTS creative_outputs_project_id_idx ON public.creative_outputs (project_id);
CREATE INDEX IF NOT EXISTS creative_copy_variations_project_id_idx ON public.creative_copy_variations (project_id);
CREATE INDEX IF NOT EXISTS creative_templates_status_idx ON public.creative_templates (status);
CREATE INDEX IF NOT EXISTS creative_templates_updated_at_idx ON public.creative_templates (updated_at DESC);

-- Storage bucket (idempotente)
INSERT INTO storage.buckets (id, name, public)
VALUES ('creative-assets', 'creative-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Força o PostgREST a recarregar o schema cache
NOTIFY pgrst, 'reload schema';
