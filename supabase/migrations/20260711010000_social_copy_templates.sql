-- Templates de copy editáveis / customizados (Social Mídia Studio, Etapa 3).
-- Guarda overrides de templates embutidos e novos templates criados pelo usuário.
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_key)
);

CREATE INDEX IF NOT EXISTS social_copy_templates_user_idx
  ON public.social_copy_templates (user_id);

ALTER TABLE public.social_copy_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own copy templates"
ON public.social_copy_templates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid());

CREATE TRIGGER update_social_copy_templates_updated_at
BEFORE UPDATE ON public.social_copy_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
