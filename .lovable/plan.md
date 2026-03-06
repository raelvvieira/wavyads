

# Plan: Date filters, calendar styling, access control, and cleanup

## 1. Fix date filtering — support custom date ranges end-to-end

**Problem:** When `selectedPeriod === 'custom'`, the code falls back to `datePreset = 'last_30d'` (line 62 of ClientDashboard). Custom dates are never sent to the API.

**Files:** `src/pages/ClientDashboard.tsx`, `src/hooks/useMetaInsights.ts`, `supabase/functions/meta-fetch-insights/index.ts`

- Pass `time_range: { since, until }` alongside `date_preset` to the edge function when custom dates are selected
- In the edge function, if `time_range` is provided, use `time_range={"since":"...","until":"..."}` instead of `date_preset=...` for both aggregate and daily API calls
- Update `useMetaInsights` and `useMetaCampaigns` hooks to accept optional `timeRange` parameter
- In `ClientDashboard`, compute and pass the time range when period is `custom`

## 2. Add Meta-style date preset buttons

**File:** `src/pages/ClientDashboard.tsx`

Replace current period buttons (7d, 30d, 90d, Personalizado) with Meta Ads-style presets:
- Hoje, Ontem, Últimos 7 dias, Últimos 14 dias, Últimos 30 dias, Este mês, Mês passado, Personalizado
- Each preset computes a `since`/`until` date range sent to the API via `time_range`
- Remove `date_preset` usage entirely — always use explicit date ranges for consistency
- Keep the calendar popover for "Personalizado"

## 3. Calendar today styling

**File:** `src/components/ui/calendar.tsx`

Change `day_today` from `"bg-accent text-accent-foreground"` to `"text-accent font-bold"` — no green background, just green number text.

## 4. Remove "Sync Facebook Ads" button from header

**File:** `src/pages/ClientDashboard.tsx`

Remove the sync button block (lines 376-385) from the header. Keep the sync flow accessible only from the unsynced state card (which is already admin-only).

## 5. Client access control — skip admin client cards

**File:** `src/pages/DashboardPage.tsx`

For non-admin users, skip `AdminDashboard` entirely and render `ClientDashboard` directly (already done via `!isAdmin` check). The client's `useClients` query already returns only their own record via RLS, and `ClientDashboard` picks it up via `allClients[0]`.

No database changes needed — RLS already restricts clients to their own row.

## Files to modify

| File | Change |
|------|--------|
| `src/pages/ClientDashboard.tsx` | Meta-style presets, pass time_range, remove sync button |
| `src/hooks/useMetaInsights.ts` | Accept optional `timeRange` param, pass to edge function |
| `supabase/functions/meta-fetch-insights/index.ts` | Support `time_range` in campaigns + insights + insights_previous |
| `src/components/ui/calendar.tsx` | Today = green text only, no green bg |

