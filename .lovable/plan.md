

# Fixes + Insights & Strategic Summary

## 1. Fix "Resultados" extraction from Meta API

**Problem:** Currently `conversions = leads + purchases`, but many campaigns have other result types (messaging, engagement, video views, etc.) that aren't being captured.

**Fix in `meta-fetch-insights/index.ts`:**
- Add a `RESULT_TYPES` array covering all common Meta objective results: `onsite_conversion.messaging_conversation_started_7d`, `landing_page_view`, `video_view`, `post_engagement`, `page_engagement`, `link_click`, plus existing lead/purchase types
- Extract `results` as the sum of the FIRST matching action from the actions array (Meta orders by campaign objective relevance)
- Extract `cost_per_result` from `cost_per_action_type` similarly
- Return `results` and `cost_per_result` as separate fields alongside existing `leads`/`purchases`
- Update campaigns mapping to include `results` and `cost_per_result`
- Update daily breakdown to extract results per day

**Update `useMetaInsights.ts`:**
- Add `results` and `cost_per_result` to `MetaInsights` and `MetaCampaign` interfaces
- Map `conversions` → `results` (or keep both, using `results` as the primary "Resultados" field)

**Update `KpiCard.tsx`:**
- Change `conversions` metric to read from `results` field
- Change `cost_per_conversion` to read from `cost_per_result`

**Update `DailyChart.tsx` and `DailyMetric`:**
- Add `results` to daily data and chart line

## 2. Fix Funnel order: Impressões before Alcance

**File:** `src/components/ConversionFunnel.tsx`
- Swap order: Impressões → Alcance → Cliques → Leads → Compras
- Impressões gets the CPM cost label (since CPM = cost per 1000 impressions)
- Alcance loses the CPM label
- Update rates array to match new order (alcance/impressions rate between them)

## 3. Add Insights & Recommendations section

**New file:** `src/components/InsightsCards.tsx`
- Grid of cards (2 cols desktop, 1 col mobile)
- Rules-based generation from campaign data:
  - Best campaign (lowest CPL with volume) → green card
  - Worst campaign (highest CPL or zero conversions with spend) → red card
  - CTR outlier (> 2x average) → info card
  - High CPM (> 2x average) → yellow card
  - Saturated audience (frequency > 3) → yellow card
  - Spend with zero results → red card
  - Scale suggestion (lowest CPL) → green CTA card
- Each card: emoji icon, bold title, specific data description, colored border

## 4. Add Strategic Summary section

**New file:** `src/components/StrategicSummary.tsx`
- Full-width card with narrative text
- Template literal using real data: period, client name, total leads, total spend, CPL, best campaign, gap insight, recommended actions
- Generated purely from data (no AI call for now)

## 5. Compose in ClientDashboard

**File:** `src/pages/ClientDashboard.tsx`
- Add InsightsCards after RankingCharts
- Add StrategicSummary after ConversionFunnel
- Pass campaign list and metric values to both components

## Files

| Action | File |
|--------|------|
| Modify | `supabase/functions/meta-fetch-insights/index.ts` — fix results extraction |
| Modify | `src/hooks/useMetaInsights.ts` — add results/cost_per_result fields |
| Modify | `src/components/KpiCard.tsx` — map conversions to results |
| Modify | `src/components/DailyChart.tsx` — add results line |
| Modify | `src/components/ConversionFunnel.tsx` — swap impressões before alcance |
| Create | `src/components/InsightsCards.tsx` — auto-generated insight cards |
| Create | `src/components/StrategicSummary.tsx` — narrative summary |
| Modify | `src/pages/ClientDashboard.tsx` — compose new sections, pass results data |

