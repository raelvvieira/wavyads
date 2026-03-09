

# Plan: Rebuild Insights Page — Deep Analysis Engine

This is a major rebuild involving 4 files: the edge function (to fetch ad-level + video data), the intelligence engine (complete rewrite with 5 layers), the data fetching hook (to fetch ad-level data), and the Insights page (single-page layout with filters).

---

## Current State

- **Edge function** fetches campaign-level data only. No ad-level data. No video metrics (3s views, thruplay). No `created_time` field.
- **Intelligence engine** has ~5 tracking rules + ~5 performance rules + ~4 structure rules. No creative/ad-level analysis. No funnel analysis. No metrics crossover object in flags.
- **Insights page** uses 3 tabs (Rastreio, Performance, Clientes). Flags have `description`, `action`, `impact`, `metric` as strings.
- **Data hook** fetches campaigns + account insights for current/previous 7d + 21d daily.

---

## Changes

### 1. Edge Function — `supabase/functions/meta-fetch-insights/index.ts`

Add new action `"ads"` that fetches ad-level data from Meta Graph API:

```
GET /{adAccountId}/ads?fields=name,status,campaign_id,creative{id,name},
  insights.{dateParam}{spend,impressions,reach,clicks,actions,cost_per_action_type,
  ctr,cpc,cpm,frequency,video_3_sec_watched_actions,video_thruplay_watched_actions}
```

Also extend the `"campaigns"` action to include `created_time` in the fields.

Add `landing_page_view` and funnel events (`add_to_cart`, `initiate_checkout`) extraction to existing helpers.

### 2. Data Fetching Hook — `src/hooks/useInsightsData.ts`

Add parallel fetch for `ads` action (current period) per client. Pass ad-level data into the engine via extended `ClientInsightsData` interface.

### 3. Intelligence Engine — `src/lib/intelligenceEngine.ts`

Complete rewrite. New flag interface with `metrics` object (not string), `diagnosis`, `adName`, `impact` as number (R$). New structure:

```typescript
interface IntelligenceFlag {
  id: string;
  type: 'tracking' | 'performance' | 'creative' | 'structure' | 'opportunity';
  priority: 'critical' | 'high' | 'medium' | 'low';
  icon: string;
  category: 'rastreio' | 'funil' | 'custo' | 'criativo' | 'estrutura' | 'escala';
  client: string;
  clientId: string;
  campaign: string;
  adName: string | null;
  title: string;
  diagnosis: string;
  metrics: { label: string; atual: string; historico: string; variacao: string }[];
  action: string;
  impact: number; // R$ value
  fix: string;
}
```

Implement all 5 layers as specified:
- **Layer 1 — Tracking** (R1-R5): Spend with zero results, clicks incompatible with zero conversion, results zeroed after history, impossible ROAS, messaging without conversations
- **Layer 2 — Funnel** (F1-F5): CTR high + low conversion, CTR low + high conversion, low landing page rate, cart→checkout abandonment, checkout→purchase abandonment
- **Layer 3 — Performance** (P1-P5): CPR rising with cause identification (frequency/CPM/CTR crossover), ROAS falling, CPM rising without results, spend up without proportional results, frequency + CPR rising
- **Layer 4 — Creative** (C1-C6): Ad draining budget, winning ad underinvested, low hook rate, low hold rate with high hook, progressive creative fatigue, excessive concentration in one ad
- **Layer 5 — Structure & Opportunity** (E1-E4): Learning phase stuck, no retargeting with real volume, budget concentration, confirmed scale opportunity

Sorting: priority order, then by descending `impact` (R$) within same priority.

Deduplication: Only show the most financially impactful flag of each type per client.

Health score calculation uses the specified formula with 4 pillars (tracking 35, results 25, efficiency 20, structure 20).

### 4. Insights Page — `src/pages/InsightsPage.tsx`

Complete rewrite. Single page, no tabs:

**Section 1 — Insights Cards**
- Horizontal filter bar: Priority (Todos/Crítico/Urgente/Médio/Oportunidade), Type (Todos/Rastreio/Performance/Criativo/Estrutura), Client dropdown
- Filters work in conjunction (AND)
- Card closed: colored left border by priority, type badge with type color, priority badge, client name, title with real numbers, campaign/ad name
- Card expanded: diagnosis block, metrics table (atual vs historico side by side), recommended action, impact in R$, fix badge
- ADMIN ONLY badge at page top

**Section 2 — Client Health Scores**
- Cards sorted by lowest score first, toggle to sort by spend
- Closed: name, health bar, problem count badges, total spend
- Expanded: score breakdown (4 categories), campaign list with status dots, CPR/ROAS colored by trend, frequency, flag icons per campaign

**Design tokens:**
- Priority colors: critical `#FF2222`, high `#FF6B2B`, medium `#F59E0B`, low `#1ACD8A`
- Type colors: rastreio `#FF2222`, performance `#FF6B2B`, criativo `#A855F7`, estrutura `#3B82F6`, oportunidade `#1ACD8A`
- Left border on closed cards, full border + shadow on expanded
- `font-mono` for numeric values

---

## File Summary

| File | Action |
|------|--------|
| `supabase/functions/meta-fetch-insights/index.ts` | Add `ads` action, extend `campaigns` with `created_time`, add funnel event extraction |
| `src/lib/intelligenceEngine.ts` | Complete rewrite — 5 layers, new flag interface, ad-level analysis |
| `src/hooks/useInsightsData.ts` | Add ads data fetching, extend `ClientInsightsData` |
| `src/pages/InsightsPage.tsx` | Complete rewrite — single page, filters, new card design |

