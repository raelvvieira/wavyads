-- Fator Criativo V2 — motor de diversificação estratégica.
--
-- A V1 tinha 5 eixos fixos (emocional, oferta, persona, hook, estrutura) e
-- rodava sempre os cinco. A V2 tem 12 ângulos estratégicos, escolhe quais
-- cabem na oferta e reprova internamente variação que não passa no motor
-- de qualidade.
--
-- O CHECK antigo de `factor_axis` REJEITARIA os 12 ângulos novos. Aqui ele
-- é alargado para aceitar os dois vocabulários: as artes já geradas com os
-- eixos V1 continuam válidas, e as novas gravam o ângulo estratégico.

ALTER TABLE public.creative_assets DROP CONSTRAINT IF EXISTS creative_assets_factor_axis_check;

ALTER TABLE public.creative_assets
  ADD CONSTRAINT creative_assets_factor_axis_check
  CHECK (
    factor_axis IS NULL OR factor_axis IN (
      -- V1 (histórico)
      'emotional', 'offer', 'persona', 'hook', 'structure',
      -- V2 (§5 da spec)
      'problem', 'mechanism', 'proof', 'contrast', 'objection', 'transformation',
      'opportunity', 'cost_of_inaction', 'identity', 'belief_shift',
      'behind_the_scenes', 'ease'
    )
  );

-- Campos que a V2 produz e que não cabiam em `metadata` sem virar consulta
-- impossível: ângulo, tese e nota são o que se filtra e ordena depois.
ALTER TABLE public.creative_assets
  ADD COLUMN IF NOT EXISTS strategic_angle   text,
  ADD COLUMN IF NOT EXISTS angle_subtype     text,
  ADD COLUMN IF NOT EXISTS strategic_thesis  text,
  ADD COLUMN IF NOT EXISTS awareness_level   text,
  ADD COLUMN IF NOT EXISTS dominant_emotion  text,
  ADD COLUMN IF NOT EXISTS quality_score     numeric,
  ADD COLUMN IF NOT EXISTS strategy_json     jsonb,
  ADD COLUMN IF NOT EXISTS validation_json   jsonb,
  -- Qual motor gerou a linha. Sem isso não há como distinguir uma arte V1
  -- de uma V2 depois que o vocabulário de eixo passou a ser compartilhado.
  ADD COLUMN IF NOT EXISTS generation_version text;

ALTER TABLE public.creative_assets DROP CONSTRAINT IF EXISTS creative_assets_strategic_angle_check;

ALTER TABLE public.creative_assets
  ADD CONSTRAINT creative_assets_strategic_angle_check
  CHECK (
    strategic_angle IS NULL OR strategic_angle IN (
      'problem', 'mechanism', 'proof', 'contrast', 'objection', 'transformation',
      'opportunity', 'cost_of_inaction', 'identity', 'belief_shift',
      'behind_the_scenes', 'ease'
    )
  );

-- Filtrar "as artes de Fator deste projeto por ângulo" é a consulta que a
-- tela de linhagem vai fazer com mais frequência.
CREATE INDEX IF NOT EXISTS creative_assets_strategic_angle_idx
  ON public.creative_assets (project_id, strategic_angle)
  WHERE strategic_angle IS NOT NULL;