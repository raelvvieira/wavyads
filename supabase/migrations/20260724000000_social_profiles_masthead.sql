-- Masthead editorial no perfil do Social Media Studio.
-- As referências de qualidade usam um cabeçalho de "veículo/publicação" no topo
-- de cada slide (ex.: "Marketing Insider / Conteúdo com IA") + selo verificado,
-- além do avatar/nome/@handle. O novo template "Wavy Editorial" desenha esse
-- masthead a partir destas colunas. Templates antigos ignoram os campos novos.
ALTER TABLE public.social_profiles
  ADD COLUMN IF NOT EXISTS veiculo text,
  ADD COLUMN IF NOT EXISTS veiculo_tag text DEFAULT 'Conteúdo com IA',
  ADD COLUMN IF NOT EXISTS verificado boolean NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';
