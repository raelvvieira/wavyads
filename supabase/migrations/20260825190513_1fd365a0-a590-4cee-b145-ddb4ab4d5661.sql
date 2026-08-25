CREATE OR REPLACE VIEW public.creative_assets_grid
WITH (security_invoker = on) AS
SELECT
  id,
  project_id,
  client_id,
  type,
  status,
  CASE
    WHEN url IS NOT NULL AND (url LIKE 'data:%' OR length(url) > 2048) THEN NULL
    ELSE url
  END AS url,
  CASE
    WHEN thumbnail_url IS NOT NULL AND (thumbnail_url LIKE 'data:%' OR length(thumbnail_url) > 2048) THEN NULL
    ELSE thumbnail_url
  END AS thumbnail_url,
  filename,
  parent_asset_id,
  root_asset_id,
  group_id,
  factor_axis,
  aspect_ratio,
  resolution,
  width,
  height,
  negative_prompt,
  model,
  error_message,
  is_client_intelligence,
  strategic_angle,
  strategic_thesis,
  quality_score,
  created_at,
  updated_at
FROM public.creative_assets;

GRANT SELECT ON public.creative_assets_grid TO authenticated;
GRANT SELECT ON public.creative_assets_grid TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recover_stale_creative_assets(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recover_stale_creative_assets(uuid, integer) TO authenticated;