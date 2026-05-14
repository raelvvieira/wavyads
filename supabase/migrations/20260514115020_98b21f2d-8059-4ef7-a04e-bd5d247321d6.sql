-- 1. Restrict OAuth tokens from being readable via REST: revoke column-level SELECT
REVOKE SELECT (meta_access_token, google_ads_access_token, google_ads_refresh_token)
  ON public.clients FROM anon, authenticated;

-- 2. Lock down user_roles admin policy with explicit WITH CHECK
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Restrict has_role EXECUTE: RLS policies still work because SECURITY DEFINER
--    functions used inside RLS are evaluated by the table owner context.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;