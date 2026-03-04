
-- Fix user_roles: drop restrictive, create permissive
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix clients: drop restrictive, create permissive
DROP POLICY IF EXISTS "Admins full access on clients" ON public.clients;
DROP POLICY IF EXISTS "Clients view own record" ON public.clients;

CREATE POLICY "Admins full access on clients" ON public.clients
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients view own record" ON public.clients
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
