ALTER TABLE public.facebook_credentials
  ADD COLUMN IF NOT EXISTS ad_account_name text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;