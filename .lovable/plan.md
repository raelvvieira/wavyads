

# Dashboard UX Overhaul — Phased Plan

This is a large-scope improvement. I'll break it into **3 phases**, starting with the most impactful visual and data changes. Each phase builds on the previous.

---

## Phase 1 — Enhanced KPIs, Rich Chart, Better Table (this implementation)

### 1. Enhance Edge Function to fetch more metrics
**File:** `supabase/functions/meta-fetch-insights/index.ts`
- Add fields to both insights and campaigns queries: `reach`, `frequency`, `actions` (to extract leads, purchases separately), `cost_per_action_type`
- Return: `reach`, `leads`, `cpl`, `purchases`, `cost_per_purchase`, `frequency`, `roas`
- Daily breakdown: fetch `spend,impressions,clicks,actions` with `time_increment=1` so the multi-line chart has data

### 2. KPI Cards — 6 cards, customizable metric
**File:** `src/pages/ClientDashboard.tsx` + new `src/components/KpiCard.tsx`
- 6 cards in a row (responsive grid: 2 cols mobile, 3 cols tablet, 6 cols desktop)
- Each card: icon, label, value (large bold), change badge (green/red), colored bottom bar
- Gear icon on each card opens a dropdown to pick which metric to display
- Metrics list: Total Gasto, Impressões, Alcance, Cliques, CTR, CPM, CPC, Leads, CPL, Conversões, Custo/Compra, ROAS, Frequência
- Selection saved to `localStorage`
- Fade transition on metric change

### 3. Multi-line Time Series Chart
**File:** `src/components/DailyChart.tsx`
- Full-width area/line chart with toggleable lines via checkboxes above the chart
- Lines: Gasto (always on, green), Leads, Cliques, Impressões, Compras
- Each line has unique color and clickable legend
- Rich tooltip showing all active lines' values
- Dual Y-axis (currency vs counts)
- Smooth animation on toggle

### 4. Enhanced Campaigns Table
**File:** `src/components/CampaignsTable.tsx`
- Add columns: Alcance, CPM, Leads, CPL, Compras, Custo/Compra
- Sortable columns (click header to toggle asc/desc)
- Status badges: Ativa (green), Pausada (gray), Em revisão (yellow)
- Totals/averages row pinned at bottom (teal highlight)
- Auto-tags: "Melhor CPL" (green), "Mais Leads" (blue), "Pior CPL" (red), "Venda" (gold)
- Conditional cell highlighting: CPL above average → red tint, below → green tint

### 5. Ranking Charts (side by side)
**File:** `src/components/RankingCharts.tsx`
- Left: Leads por Campanha — horizontal bars, sorted desc, values shown
- Right: CPL por Campanha — horizontal bars, sorted asc, color scale green→yellow→red

### 6. Conversion Funnel
**File:** `src/components/ConversionFunnel.tsx`
- Vertical funnel: Alcance → Impressões → Cliques → Leads → Compras
- Each block width proportional to volume
- Arrows between stages with conversion rate badge (green/yellow/red thresholds)
- Cost per stage as sub-label (CPM, CPC, CPL, Custo/Compra)
- Summary box below: "Para cada X alcançadas → Y clicaram → Z leads → W compraram"

### 7. Leads vs Sales Gap Alert
**File:** `src/components/GapAlert.tsx`
- Auto-shown when leads > 0 AND purchases == 0, or lead→sale rate < 2%
- Pulsing orange/red border card with warning icon
- Shows lead count, purchase count, conversion rate
- Dismissible for 24h (localStorage)

---

## Phase 2 (next iteration)
- Insights & Recommendations cards (auto-generated from data rules)
- Strategic Summary text (template-based)
- Period comparison (% change vs previous period) for KPI cards
- Custom date picker

## Phase 3 (future)
- AI-powered strategic summary via edge function
- Client settings (average ticket, thresholds)
- PDF export
- Multi-account support

---

## Files to create/modify

| Action | File |
|--------|------|
| Modify | `supabase/functions/meta-fetch-insights/index.ts` — add reach, leads, purchases, frequency, cpl, roas fields |
| Create | `src/components/KpiCard.tsx` — customizable metric card with dropdown |
| Create | `src/components/DailyChart.tsx` — multi-line toggleable time series |
| Create | `src/components/CampaignsTable.tsx` — sortable table with tags & highlights |
| Create | `src/components/RankingCharts.tsx` — side-by-side horizontal bar charts |
| Create | `src/components/ConversionFunnel.tsx` — visual funnel with rates |
| Create | `src/components/GapAlert.tsx` — leads vs sales alert banner |
| Modify | `src/pages/ClientDashboard.tsx` — compose all new components, update data flow |
| Modify | `src/hooks/useMetaInsights.ts` — update types for new fields |
| Modify | `src/data/mock.ts` — add mock data for new metrics |

This is a significant rebuild of the dashboard content area. The header, sidebar, auth, and sync flows remain unchanged.

