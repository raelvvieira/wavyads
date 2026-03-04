

# Full Multi-Client Meta OAuth Dashboard Overhaul

This is a significant restructuring of the entire app. The current system is single-user/single-account. The new system has admin and client roles, a `clients` table in the database, per-client Meta OAuth sync, and role-based views.

## Database Changes

### 1. Create `user_roles` table (security best practice)
```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- RLS: users can read their own roles, admins can read all
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
```

### 2. Create `clients` table
```sql
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  meta_ad_account_id text,
  meta_access_token text,
  meta_ad_account_name text,
  token_expires_at timestamptz,
  is_synced boolean DEFAULT false,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL -- linked client user account (nullable)
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins full access" ON public.clients FOR ALL USING (public.has_role(auth.uid(), 'admin'));
-- Clients can only view their own row
CREATE POLICY "Clients view own" ON public.clients FOR SELECT USING (auth.uid() = user_id);
```

### 3. Drop old `facebook_credentials` table
The credentials are now stored per-client in the `clients` table. The old table becomes unnecessary.

## Edge Functions

### Rename/Rewrite `facebook-oauth` -> `meta-oauth`
Same OAuth flow but now accepts a `client_id` parameter:
- **`auth-url`**: Generates Meta OAuth URL with `state={client_id}` so the callback knows which client to link the token to.
- **`callback`**: Receives `code` + `state` (client_id), exchanges for long-lived token, saves to `clients.meta_access_token` for that client_id. Requires admin role.

### Rewrite `facebook-ads` -> `meta-fetch-insights`
- Accepts `client_id` parameter, reads that client's token and ad_account_id from the `clients` table.
- Actions: `campaigns`, `insights` (same logic as current `facebook-ads` but scoped to a client).
- Admin can fetch any client. Client users can only fetch their own.

### New callback route: `/auth/meta/callback`
Replaces `/auth/facebook/callback`. Reads `code` and `state` (client_id) from URL params, calls `meta-oauth` edge function.

## Frontend Pages & Routes

### Route restructuring
```
/login                    - Login page (unchanged)
/dashboard                - Admin home (client cards list) OR client's own dashboard
/dashboard/:clientId      - Admin viewing a specific client's dashboard
/auth/meta/callback       - OAuth callback handler
/configuracoes            - Settings (profile only, remove integration tab)
```

Remove `/campanhas` and `/clientes` routes (absorbed into the new dashboard structure).

### Admin Home (`/dashboard`)
- Grid of client cards showing: name, ad account, sync status (green/gray badge), last sync date
- "Add new client" button opens a modal (name, email, meta_ad_account_id)
- Click card navigates to `/dashboard/:clientId`

### Client Dashboard (`/dashboard/:clientId` or `/dashboard` for client users)
- Header: client name + "Sync Facebook Ads" button (admin only)
- If not synced: empty state with illustration and sync CTA
- If synced: full dashboard with KPIs, charts, campaigns table (reuses existing dashboard components)
- Date range selector: 7d, 30d, 90d
- Data fetched via `meta-fetch-insights` edge function using the client's stored token

### Sidebar updates
- Admin sees: Dashboard (home), Settings
- Client sees: Dashboard, Settings

### ProtectedRoute update
- After auth, check user role via `has_role()` function or query `user_roles` table
- Redirect client users directly to their dashboard
- Store role in auth context

## Sync Flow (popup-based)
1. Admin clicks "Sync Facebook Ads" on a client's dashboard
2. Frontend calls `meta-oauth` with action `auth-url` and `client_id`
3. Opens Meta OAuth URL in a popup window (not redirect) with `state={client_id}`
4. After authorization, Meta redirects popup to `/auth/meta/callback?code=xxx&state={client_id}`
5. Callback page calls edge function to exchange code, save token
6. Popup closes itself and sends message to parent window via `window.opener.postMessage`
7. Parent dashboard refreshes data

## Accent Color Change
- Update CSS variable `--primary` from orange (#FF6B35) to green (#1ACD8A)
- Update `.btn-orange` class to `.btn-accent` with new gradient
- Update all gradient references

## Summary of files to create/modify

**Create:**
- `supabase/functions/meta-oauth/index.ts`
- `supabase/functions/meta-fetch-insights/index.ts`
- `src/pages/AdminDashboard.tsx` (client cards grid)
- `src/pages/ClientDashboard.tsx` (per-client dashboard with sync)
- `src/pages/MetaCallbackPage.tsx` (popup callback)
- `src/hooks/useMetaOAuth.ts`
- `src/hooks/useClients.ts` (CRUD for clients table)
- `src/hooks/useRole.ts` (role checking)
- Migration SQL

**Modify:**
- `src/App.tsx` (new routes)
- `src/hooks/useAuth.tsx` (add role to context)
- `src/components/AppSidebar.tsx` (role-based nav)
- `src/components/ProtectedRoute.tsx` (role-based redirects)
- `src/index.css` (accent color #1ACD8A)
- `tailwind.config.ts` (new accent color)
- `supabase/config.toml` (new edge functions)

**Delete/deprecate:**
- `src/pages/DashboardPage.tsx` (replaced by AdminDashboard + ClientDashboard)
- `src/pages/CampaignsPage.tsx` (absorbed into ClientDashboard)
- `src/pages/ClientsPage.tsx` (absorbed into AdminDashboard)
- `src/pages/FacebookCallbackPage.tsx` (replaced by MetaCallbackPage)
- `src/hooks/useFacebookOAuth.ts` (replaced by useMetaOAuth)
- `src/hooks/useFacebookAds.ts` (replaced by meta-fetch-insights hook)
- Old `facebook_credentials` table
