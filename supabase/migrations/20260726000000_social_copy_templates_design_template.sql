-- Pareamento copy ↔ design: cada formato carrega o design que combina com ele.
-- Antes, o design era escolhido de novo na última etapa (decisão duplicada).
-- Guarda um TemplateId ("1A" | "1B" | "2A" | "2B" | "4" | "5" | "we-light" | "we-dark").
ALTER TABLE public.social_copy_templates
  ADD COLUMN IF NOT EXISTS design_template text;

NOTIFY pgrst, 'reload schema';
