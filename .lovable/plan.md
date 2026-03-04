

# Fix Critical Bugs Before Testing Sync Flow

I found 3 critical issues that will break the app:

## Bug 1: RLS Policies are RESTRICTIVE instead of PERMISSIVE

Both `user_roles` and `clients` tables have all policies set as **RESTRICTIVE** (Permissive: No). This means ALL restrictive policies must pass simultaneously. For client users doing a SELECT on `user_roles`, they'd need both `has_role(auth.uid(), 'admin')` AND `auth.uid() = user_id` to be true -- impossible for non-admin users.

**Fix:** Drop and recreate the policies as PERMISSIVE (the default). This way any ONE matching policy allows access.

## Bug 2: `getClaims()` is not a valid Supabase Auth method

The `meta-oauth` edge function uses `supabase.auth.getClaims(token)` which doesn't exist in the Supabase JS client. It should use `supabase.auth.getUser(token)` instead.

**Fix:** Replace `getClaims` with `getUser` and extract `user.id` from the result.

## Bug 3: `meta-fetch-insights` edge function likely has same auth issue

Need to verify and fix the same `getClaims` usage.

## Implementation

### 1. Database migration to fix RLS policies
```sql
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
```

### 2. Fix `meta-oauth` edge function auth
Replace `getClaims` with `getUser`:
```typescript
const { data: { user }, error: userError } = await supabase.auth.getUser(token);
if (userError || !user) { ... }
const userId = user.id;
```

### 3. Fix `meta-fetch-insights` edge function (same pattern)

### 4. After fixes, test the sync flow manually
Click a client card, click "Sync Facebook Ads", authorize in the Meta popup, select an ad account.

