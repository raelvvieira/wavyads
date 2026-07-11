-- Skills editáveis de estilo de imagem (Social Mídia Studio, Etapa 5).
-- Cada linha guarda o promptTemplate customizado de um estilo por usuário.
CREATE TABLE IF NOT EXISTS public.social_image_style_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  style_id text NOT NULL,
  prompt_template text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, style_id)
);

CREATE INDEX IF NOT EXISTS social_image_style_skills_user_idx
  ON public.social_image_style_skills (user_id);

ALTER TABLE public.social_image_style_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own image style skills"
ON public.social_image_style_skills FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid());

CREATE TRIGGER update_social_image_style_skills_updated_at
BEFORE UPDATE ON public.social_image_style_skills
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
