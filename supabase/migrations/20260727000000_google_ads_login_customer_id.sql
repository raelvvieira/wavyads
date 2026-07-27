ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS google_ads_login_customer_id text;
