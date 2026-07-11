-- Código React editável do design do template (Etapa 3 · aba Design).
-- Quando presente, a Etapa 6 renderiza os slides com este componente.
ALTER TABLE public.social_copy_templates
  ADD COLUMN IF NOT EXISTS design_code text;
