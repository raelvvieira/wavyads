CREATE TABLE public.social_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT 'WAVY',
  handle text NOT NULL DEFAULT '@wavy.mkt',
  avatar_url text,
  template_padrao text NOT NULL DEFAULT 'A',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own social profile"
ON public.social_profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_social_profiles_updated_at
BEFORE UPDATE ON public.social_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();