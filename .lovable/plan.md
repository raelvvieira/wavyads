

# Plan: Admin Client Cards Edit + Insights Intelligence Page

## Part 1 — Editable Client Cards + Re-sync Button

**File:** `src/pages/AdminDashboard.tsx`

- Add edit functionality to each client card: click a pencil icon to open an edit dialog with name and email fields
- Create `useUpdateClient` hook in `src/hooks/useClients.ts` that updates the `clients` table
- Add a "Re-sincronizar" button on each card that triggers the Meta OAuth flow (`handleSync`) for that specific client
- Keep the existing sync status badge (Sincronizado / Não sincronizado)
- Structure: each card gets an edit icon (top-right area) and a re-sync button (bottom of card, only for synced clients or as a general action)

**File:** `src/hooks/useClients.ts`
- Add `useUpdateClient()` mutation that updates name/email on the `clients` table

## Part 2 — Insights Page (Intelligence Engine)

This is the largest piece. It involves:

### 2a. Sidebar — Add "Insights" nav item (admin-only)

**File:** `src/components/AppSidebar.tsx`
- Import `useRole` hook
- Add `{ to: '/insights', icon: Lightbulb, label: 'Insights' }` between Dashboard and Configurações
- Only render this item if `isAdmin === true`

### 2b. Route

**File:** `src/App.tsx`
- Add `/insights` route inside the protected layout, pointing to new `InsightsPage`

### 2c. Data Fetching — New Edge Function action

**File:** `supabase/functions/meta-fetch-insights/index.ts`
- Add new action `insights_all_clients` that fetches data for ALL synced clients in one call
- For each client: fetch campaigns with insights for last 7Now I have a thorough understanding of the codebase. Let me present the plan.

<lov-plan>

# Plan: Admin Client Card Editing + Insights Intelligence Page

## Part 1 — Editable Client Cards in AdminDashboard

**File:** `src/pages/AdminDashboard.tsx`

Add inline edit capability to each client card:
- Edit button (pencil icon) opens a Dialog with name/email fields pre-filled
- Save calls `supabase.from('clients').update({ name, email })` via a new `useUpdateClient` mutation
- Add "Resincronizar Meta" button on each card that triggers `handleSync` (same OAuth flow already in ClientDashboard)
- Show sync status badge as already exists, plus a re-sync button for synced clients

**File:** `src/hooks/useClients.ts`

Add `useUpdateClient` mutation:
```
mutationFn: async ({ id, name, email }) => supabase.from('clients').update({ name, email }).eq('id', id)
```

## Part 2 — Insights Intelligence Page

This is a large feature. Here's the breakdown:

### 2a. Sidebar + Routing

**File:** `src/components/AppSidebar.tsx`
- Add "Insights" nav item between Dashboard and Configurações
- Only render if user role is admin (use `useRole`)

**File:** `src/App.tsx`
- Add route `/insights` inside the protected layout

### 2b. Intelligence Engine (Pure Frontend Logic)

**New file:** `src/lib/intelligenceEngine.ts`

A pure function `runIntelligenceEngine(clientsData)` that:
- Takes an array of `{ client, campaigns, insights, previousInsights, historicalInsights }` per client
- Computes periods: current 7d, previous 7d (days 8-14), historical average
- Runs all flag rules (R1-R5, P1-P5, E1-E4) as described
- Returns `IntelligenceFlag[]` sorted by priority
- Computes `healthScore` per client (0-100) based on the formula provided

The engine needs **multiple time periods per client** from the Meta API. The current hooks fetch one period at a time. The Insights page will call `meta-fetch-insights` directly for each client with different time ranges (last 7d, days 8-14, last 21d, and full history for week-1 data).

### 2c. Data Fetching for Insights Page

**New file:** `src/hooks/useInsightsData.ts`

For each synced client, fetch:
- Campaigns with `time_range` = last 7 days (current)
- Campaigns with `time_range` = days 8-14 (previous)  
- Account insights last 21 days with `time_increment=1` for daily data (to compute historical averages)
- Pass all data to `runIntelligenceEngine`

### 2d. Insights Page with 3 Sub-tabs

**New file:** `src/pages/InsightsPage.tsx`

Uses Shadcn Tabs component with 3 tabs:

**Tab 1 — 🔍 Rastreio (default)**
- Red dark banner at top with left red border: 3-column grid showing total campaigns with spend+zero results, clients with critical tracking flags, total spend on tracking-problem campaigns
- Expandable cards for `type === "tracking"` flags with priority filter badges
- Expanded state: dark block with recommended action, two side-by-side blocks (estimated impact + detected data), fix badge
- Empty state: "✓ Nenhum problema de rastreio detectado"

**Tab 2 — 💡 Performance & Estratégia**
- Expandable cards for `type !== "tracking"` flags, same card structure
- Summary panel at bottom: urgent actions count, clients with scale opportunity, total spend on campaigns with CPR above historical average

**Tab 3 — 👥 Clientes**
- Client list sorted by health score ascending (worst first)
- Each card expandable showing:
  - Health score bar with color + number
  - Score breakdown by category (tracking, results, efficiency, structure)
  - Alert badges: critical, high, medium flag counts
  - Campaign list with status dot, name, primary result + volume, CPR/ROAS colored by variation vs history, frequency, flag icons
- Alternative sort by spend

### 2e. Edge Function Update

**File:** `supabase/functions/meta-fetch-insights/index.ts`

Add new action `campaigns_extended` that returns campaign-level daily data and campaign creation dates (needed for "week 1" comparisons). Use `created_time` field from Meta API and `time_increment=1` for campaign-level daily breakdowns.

## Design

All components follow the existing glass/dark theme — `GlassCard`, `glass` class, green accent (`accent`), `border-white/10`, same spacing and typography patterns.

## Files Summary

| File | Action |
|------|--------|
| `src/pages/AdminDashboard.tsx` | Add edit dialog, re-sync button per card |
| `src/hooks/useClients.ts` | Add `useUpdateClient` mutation |
| `src/components/AppSidebar.tsx` | Add Insights nav (admin-only) |
| `src/App.tsx` | Add `/insights` route |
| `src/lib/intelligenceEngine.ts` | New — all flag rules + health score |
| `src/hooks/useInsightsData.ts` | New — multi-period data fetching per client |
| `src/pages/InsightsPage.tsx` | New — 3-tab Insights page |
| `supabase/functions/meta-fetch-insights/index.ts` | Add `campaigns_extended` action |

No database migrations needed — all data comes from Meta API, no new tables required.

