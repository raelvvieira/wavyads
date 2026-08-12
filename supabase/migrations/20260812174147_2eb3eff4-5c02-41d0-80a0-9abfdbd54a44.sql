-- Etapa 10 do redesenho: a direção visual passa a pertencer ao PROJETO.
--
-- No fluxo clássico a análise das referências vive só no state do React e é
-- serializada dentro de creative_project_state.state_json — um blob opaco que
-- só aquela tela sabe ler. Com colunas próprias, o workspace novo (e qualquer
-- coisa futura) consegue perguntar "qual é a direção visual deste projeto?"
-- sem desempacotar o estado inteiro de uma UI.

ALTER TABLE public.creative_projects
  ADD COLUMN IF NOT EXISTS design_system_doc text NULL,
  -- Análise completa (composição, fotografia, paleta, tipografia, camadas,
  -- mood, anti-padrões). jsonb porque o formato acompanha o prompt da IA e
  -- muda mais rápido que o schema.
  ADD COLUMN IF NOT EXISTS visual_analysis jsonb NULL;

NOTIFY pgrst, 'reload schema';