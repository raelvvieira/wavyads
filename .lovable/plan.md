

## Plan: Add "Acessos" Tab to Settings — Admin User Management

### Overview

Add a third tab "Acessos" to the Settings page where the admin can invite new administrators by entering name and email. A new edge function `invite-admin` will create the user with `admin` role and send a branded email via Resend with password creation instructions.

### Changes

#### 1. New Edge Function — `supabase/functions/invite-admin/index.ts`

Based on the existing `invite-client` pattern but with key differences:
- Inserts role `admin` instead of `client` into `user_roles`
- Does NOT create a `clients` record (admins don't need one)
- Email subject: "VOCÊ RECEBEU ACESSO ADMINISTRATIVO NO WAVY DASHBOARD!"
- Email body explains they received admin access, with the same 4-step flow (create password → login → full access)
- Uses same Resend sender `contato@wavydigital.com.br`

#### 2. Settings Page — `src/pages/SettingsPage.tsx`

Add tab `{ id: 'acessos', label: 'Acessos' }` to the tabs array.

New "Acessos" section contains:
- **Form**: Name + Email inputs + "Convidar Admin" button (calls `invite-admin` edge function)
- **List**: Fetches all users with `admin` role from `user_roles` joined with `profiles` to show name/email. Displays as a simple table/list with each admin's name, email, and creation date.
- Only visible to admin users (uses `useRole` hook to guard)

The form calls `supabase.functions.invoke('invite-admin', { body: { name, email } })` and shows success/error toast.

#### 3. Edge Function Config — `supabase/config.toml`

Add `[functions.invite-admin]` with `verify_jwt = false` (validation done in code, same pattern as `invite-client`).

### File Summary

| File | Action |
|------|--------|
| `supabase/functions/invite-admin/index.ts` | Create — new edge function |
| `src/pages/SettingsPage.tsx` | Edit — add Acessos tab with form + admin list |

