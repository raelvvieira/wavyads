ALTER TABLE public.clients
  ADD COLUMN google_ads_access_token text,
  ADD COLUMN google_ads_refresh_token text,
  ADD COLUMN google_ads_customer_id text,
  ADD COLUMN google_ads_customer_name text,
  ADD COLUMN google_ads_synced boolean NOT NULL DEFAULT false,
  ADD COLUMN google_ads_token_expires_at timestamptz,
  ADD COLUMN google_ads_last_sync_at timestamptz;