

# Plan: Delete Client with Confirmation

## Changes

### 1. `src/pages/AdminDashboard.tsx`
- Import `Trash2` from lucide-react and `useDeleteClient` from hooks
- Import `AlertDialog` components for confirmation
- Add delete state (`deleteId`, `deleteDialogOpen`)
- Add trash icon button next to the pencil icon on each card
- Add AlertDialog with confirmation message: "Tem certeza que deseja apagar este cliente? Todos os dados de anúncios e o acesso do cliente serão removidos permanentemente."
- On confirm, call `deleteClient.mutate(deleteId)` then show success toast

### 2. Edge Function: `supabase/functions/invite-client/index.ts`
- Add a new action for `DELETE` method (or add a `delete-client` edge function)
- Since `useDeleteClient` currently just deletes from `clients` table, but we also need to delete the auth user and user_roles, we need an edge function
- Create logic: receive `clientId`, look up `user_id` from clients table, delete `user_roles` entry, delete `clients` record, delete auth user via `auth.admin.deleteUser(userId)`

### 3. `src/hooks/useClients.ts`
- Update `useDeleteClient` to call an edge function instead of direct delete, so auth user + roles get cleaned up too

Actually, let me reconsider — the `clients` table has `user_id`. Deleting the auth user requires service role. So I'll create a dedicated edge function `delete-client` that handles full cleanup.

## Files

| File | Action |
|------|--------|
| `supabase/functions/delete-client/index.ts` | New — deletes client record, user_roles, and auth user |
| `src/hooks/useClients.ts` | Update `useDeleteClient` to call edge function |
| `src/pages/AdminDashboard.tsx` | Add trash icon + AlertDialog confirmation |

