-- Etapa 2 do redesenho do Criativo Studio: toda imagem gerada vira um
-- CreativeAsset independente, e toda transformação (fator, edição, resize)
-- cria outro asset ligado ao anterior.
--
-- Hoje a tela é a fonte da verdade: storyImage, squareImage, factorImages[],
-- factorSquareImages[] e editedVersions{} vivem só no state do React, e o banco
-- recebe linhas soltas sem relação entre si (creative_outputs.source_output_id
-- existe mas nunca foi preenchido). Por isso o Canvas novo não consegue
-- remontar os grupos sozinho — é isso que esta migration destrava.

-- ---------------------------------------------------------------------------
-- 1. Colunas de linhagem e de geração em creative_assets
-- ---------------------------------------------------------------------------

ALTER TABLE public.creative_assets
  ADD COLUMN IF NOT EXISTS parent_asset_id uuid NULL REFERENCES public.creative_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS root_asset_id   uuid NULL REFERENCES public.creative_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS factor_axis     text NULL,
  ADD COLUMN IF NOT EXISTS status          text NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS aspect_ratio    text NULL,
  ADD COLUMN IF NOT EXISTS resolution      text NULL,
  ADD COLUMN IF NOT EXISTS width           integer NULL,
  ADD COLUMN IF NOT EXISTS height          integer NULL,
  ADD COLUMN IF NOT EXISTS prompt          text NULL,
  ADD COLUMN IF NOT EXISTS negative_prompt text NULL,
  ADD COLUMN IF NOT EXISTS model           text NULL,
  ADD COLUMN IF NOT EXISTS error_message   text NULL,
  ADD COLUMN IF NOT EXISTS updated_at      timestamptz NOT NULL DEFAULT now();

-- status permite que o asset exista ANTES da imagem — é o que deixa o Canvas
-- mostrar o skeleton no lugar certo em vez de um "gerando..." solto no chat.
ALTER TABLE public.creative_assets DROP CONSTRAINT IF EXISTS creative_assets_status_check;
ALTER TABLE public.creative_assets
  ADD CONSTRAINT creative_assets_status_check
  CHECK (status IN ('queued', 'generating', 'ready', 'failed'));

ALTER TABLE public.creative_assets DROP CONSTRAINT IF EXISTS creative_assets_factor_axis_check;
ALTER TABLE public.creative_assets
  ADD CONSTRAINT creative_assets_factor_axis_check
  CHECK (factor_axis IS NULL OR factor_axis IN ('emotional', 'offer', 'persona', 'hook', 'structure'));

-- url passa a ser opcional: um asset 'queued'/'generating' ainda não tem imagem.
ALTER TABLE public.creative_assets ALTER COLUMN url DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Vocabulário de type
-- ---------------------------------------------------------------------------
-- A tabela guarda dois universos: insumos enviados pelo usuário (reference,
-- logo, product, avatar, template) e artes produzidas (original, factor,
-- edited, resize, imported). O Canvas lê só o segundo grupo.

-- A ordem importa: o CHECK antigo não conhece 'original', então ele precisa
-- cair ANTES do UPDATE, e o novo entra depois dos dados já convertidos.
ALTER TABLE public.creative_assets DROP CONSTRAINT IF EXISTS creative_assets_type_check;

UPDATE public.creative_assets SET type = 'original' WHERE type = 'generated';

ALTER TABLE public.creative_assets
  ADD CONSTRAINT creative_assets_type_check
  CHECK (type IN (
    'reference', 'logo', 'product', 'avatar', 'template',
    'original', 'factor', 'edited', 'resize', 'imported'
  ));

-- ---------------------------------------------------------------------------
-- 3. Grupos (Fator Criativo, variações, resizes)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.creative_asset_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.creative_projects(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('original', 'factor', 'variations', 'resize', 'edited')),
  parent_asset_id uuid NULL REFERENCES public.creative_assets(id) ON DELETE SET NULL,
  title text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creative_assets
  ADD COLUMN IF NOT EXISTS group_id uuid NULL REFERENCES public.creative_asset_groups(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 4. root_asset_id é derivado, nunca informado pelo cliente
-- ---------------------------------------------------------------------------
-- Deixar isso a cargo do frontend significaria uma árvore inconsistente na
-- primeira chamada que esquecesse de propagar a raiz. O trigger garante que
-- "todas as artes que descendem da Arte 01" seja sempre uma query simples
-- (WHERE root_asset_id = ...), por mais fundo que o encadeamento vá.

CREATE OR REPLACE FUNCTION public.set_creative_asset_lineage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.root_asset_id IS NULL THEN
    IF NEW.parent_asset_id IS NULL THEN
      NEW.root_asset_id := NEW.id;
    ELSE
      SELECT COALESCE(parent.root_asset_id, parent.id)
        INTO NEW.root_asset_id
        FROM public.creative_assets AS parent
       WHERE parent.id = NEW.parent_asset_id;

      -- Pai inexistente (corrida ou id inválido): a própria linha vira raiz,
      -- em vez de gravar um asset órfão que sumiria do Canvas.
      IF NEW.root_asset_id IS NULL THEN
        NEW.root_asset_id := NEW.id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_creative_asset_lineage_trigger ON public.creative_assets;
CREATE TRIGGER set_creative_asset_lineage_trigger
BEFORE INSERT ON public.creative_assets
FOR EACH ROW EXECUTE FUNCTION public.set_creative_asset_lineage();

DROP TRIGGER IF EXISTS update_creative_assets_updated_at ON public.creative_assets;
CREATE TRIGGER update_creative_assets_updated_at
BEFORE UPDATE ON public.creative_assets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_creative_asset_groups_updated_at ON public.creative_asset_groups;
CREATE TRIGGER update_creative_asset_groups_updated_at
BEFORE UPDATE ON public.creative_asset_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 5. Backfill do que já existe
-- ---------------------------------------------------------------------------

-- creative_outputs guardava aspect_ratio/resolution/prompt que o asset não
-- tinha. Traz para o asset, que passa a ser a fonte única.
UPDATE public.creative_assets AS a
   SET aspect_ratio = COALESCE(a.aspect_ratio, o.aspect_ratio),
       resolution   = COALESCE(a.resolution, o.resolution),
       prompt       = COALESCE(a.prompt, o.prompt)
  FROM public.creative_outputs AS o
 WHERE o.asset_id = a.id;

-- Versões 1080x1080 antigas eram gravadas com o mesmo type da arte principal;
-- só o creative_outputs sabia que eram quadradas.
UPDATE public.creative_assets AS a
   SET type = 'resize'
  FROM public.creative_outputs AS o
 WHERE o.asset_id = a.id
   AND o.type = 'square'
   AND a.type IN ('original', 'factor');

-- Nenhum vínculo real de linhagem existe no histórico (source_output_id nunca
-- foi preenchido), então cada asset antigo vira raiz da própria árvore. Artes
-- antigas aparecem no Canvas sem agrupamento — as novas já nascem ligadas.
UPDATE public.creative_assets SET root_asset_id = id WHERE root_asset_id IS NULL;

-- ---------------------------------------------------------------------------
-- 6. Índices
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS creative_assets_project_type_idx  ON public.creative_assets (project_id, type);
CREATE INDEX IF NOT EXISTS creative_assets_parent_idx        ON public.creative_assets (parent_asset_id);
CREATE INDEX IF NOT EXISTS creative_assets_root_idx          ON public.creative_assets (root_asset_id);
CREATE INDEX IF NOT EXISTS creative_assets_group_idx         ON public.creative_assets (group_id);
CREATE INDEX IF NOT EXISTS creative_assets_project_created_idx ON public.creative_assets (project_id, created_at);
CREATE INDEX IF NOT EXISTS creative_asset_groups_project_idx ON public.creative_asset_groups (project_id, created_at);

-- ---------------------------------------------------------------------------
-- 7. RLS do novo grupo (mesma política das demais tabelas do Studio)
-- ---------------------------------------------------------------------------

ALTER TABLE public.creative_asset_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage creative asset groups" ON public.creative_asset_groups;
CREATE POLICY "Admins manage creative asset groups"
ON public.creative_asset_groups FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

NOTIFY pgrst, 'reload schema';