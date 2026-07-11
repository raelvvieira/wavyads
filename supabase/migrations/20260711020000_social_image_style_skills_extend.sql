-- Estende social_image_style_skills para suportar estilos customizados e
-- edição de nome/descrição (além do prompt_template já existente).
ALTER TABLE public.social_image_style_skills
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS emoji text NOT NULL DEFAULT '✨',
  ADD COLUMN IF NOT EXISTS resumo text,
  ADD COLUMN IF NOT EXISTS descricao_longa text,
  ADD COLUMN IF NOT EXISTS caminho text NOT NULL DEFAULT 'ia',
  ADD COLUMN IF NOT EXISTS builtin boolean NOT NULL DEFAULT false;
