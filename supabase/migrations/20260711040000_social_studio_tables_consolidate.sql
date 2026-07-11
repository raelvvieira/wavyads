-- Consolidação idempotente das tabelas do Social Mídia Studio (templates de
-- copy editáveis + skills de estilo de imagem) e reload do schema cache do
-- PostgREST. Resolve "Could not find the table '...' in the schema cache".
-- Seguro rodar mesmo que as migrations anteriores já tenham (ou não) aplicado.

-- ============ social_copy_templates ============
CREATE TABLE IF NOT EXISTS public.social_copy_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  nome text NOT NULL,
  emoji text NOT NULL DEFAULT '✨',
  preview text NOT NULL DEFAULT 'linear-gradient(135deg,#0D1B2A 0%,#1A2D40 100%)',
  carrossel boolean NOT NULL DEFAULT true,
  slides_min integer NOT NULL DEFAULT 5,
  slides_max integer NOT NULL DEFAULT 10,
  slides_default integer NOT NULL DEFAULT 7,
  base_layout text NOT NULL DEFAULT '2A',
  prompt_body text NOT NULL,
  builtin boolean NOT NULL DEFAULT false,
  design_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_key)
);
-- Colunas que podem faltar se uma versão parcial da tabela já existir:
ALTER TABLE public.social_copy_templates ADD COLUMN IF NOT EXISTS design_code text;

CREATE INDEX IF NOT EXISTS social_copy_templates_user_idx
  ON public.social_copy_templates (user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_copy_templates' AND policyname = 'Admins manage own copy templates') THEN
    ALTER TABLE public.social_copy_templates ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins manage own copy templates" ON public.social_copy_templates FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid())
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid());
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_social_copy_templates_updated_at ON public.social_copy_templates;
CREATE TRIGGER update_social_copy_templates_updated_at
BEFORE UPDATE ON public.social_copy_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ social_image_style_skills ============
CREATE TABLE IF NOT EXISTS public.social_image_style_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  style_id text NOT NULL,
  prompt_template text NOT NULL,
  nome text,
  emoji text NOT NULL DEFAULT '✨',
  resumo text,
  descricao_longa text,
  caminho text NOT NULL DEFAULT 'ia',
  builtin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, style_id)
);
-- Colunas que podem faltar se a versão inicial (só prompt_template) já existir:
ALTER TABLE public.social_image_style_skills ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.social_image_style_skills ADD COLUMN IF NOT EXISTS emoji text NOT NULL DEFAULT '✨';
ALTER TABLE public.social_image_style_skills ADD COLUMN IF NOT EXISTS resumo text;
ALTER TABLE public.social_image_style_skills ADD COLUMN IF NOT EXISTS descricao_longa text;
ALTER TABLE public.social_image_style_skills ADD COLUMN IF NOT EXISTS caminho text NOT NULL DEFAULT 'ia';
ALTER TABLE public.social_image_style_skills ADD COLUMN IF NOT EXISTS builtin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS social_image_style_skills_user_idx
  ON public.social_image_style_skills (user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_image_style_skills' AND policyname = 'Admins manage own image style skills') THEN
    ALTER TABLE public.social_image_style_skills ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins manage own image style skills" ON public.social_image_style_skills FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid())
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid());
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_social_image_style_skills_updated_at ON public.social_image_style_skills;
CREATE TRIGGER update_social_image_style_skills_updated_at
BEFORE UPDATE ON public.social_image_style_skills
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Força o PostgREST a recarregar o schema cache
NOTIFY pgrst, 'reload schema';
