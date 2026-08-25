CREATE INDEX IF NOT EXISTS creative_assets_created_at_desc_idx
  ON public.creative_assets (created_at DESC);

CREATE INDEX IF NOT EXISTS creative_assets_client_created_idx
  ON public.creative_assets (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS creative_assets_type_created_idx
  ON public.creative_assets (type, created_at DESC);