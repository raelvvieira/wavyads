CREATE TABLE public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  usage_type text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  cost_usd numeric NOT NULL DEFAULT 0,
  tokens integer NOT NULL DEFAULT 0,
  month_key text NOT NULL
);

CREATE OR REPLACE FUNCTION public.set_ai_usage_month_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.month_key := to_char((COALESCE(NEW.created_at, now()) AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ai_usage_month_key
BEFORE INSERT OR UPDATE ON public.ai_usage_events
FOR EACH ROW EXECUTE FUNCTION public.set_ai_usage_month_key();

CREATE INDEX idx_ai_usage_events_month_key ON public.ai_usage_events(month_key);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can insert ai_usage_events"
ON public.ai_usage_events
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins view ai_usage_events"
ON public.ai_usage_events
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));