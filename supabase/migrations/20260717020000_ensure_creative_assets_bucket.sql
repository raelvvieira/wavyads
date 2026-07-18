-- GARANTE o bucket de Storage 'creative-assets'.
-- A migration consolidada aplicada em produção (20260715194728) criou apenas
-- as POLICIES do bucket, mas não o bucket em si — e as migrations antigas que o
-- criavam podem nunca ter sido aplicadas. Sem o bucket, TODO upload falha
-- (logo, imagens de referência e a arte final do Criativo Studio), com o app
-- caindo no aviso "imagem não foi salva no Storage" e a geração final quebrando.
-- Idempotente: se já existir, não faz nada.
INSERT INTO storage.buckets (id, name, public)
VALUES ('creative-assets', 'creative-assets', true)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
