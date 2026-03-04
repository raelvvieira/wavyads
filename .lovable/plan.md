

# Table scroll + "Resultados" metric in KPI cards & chart

## 1. CampaignsTable — max height with scroll
**File:** `src/components/CampaignsTable.tsx`
- Wrap the `<table>` in a container with `max-h-[480px] overflow-y-auto` (roughly 10 rows visible)
- Keep `<thead>` sticky at top with `sticky top-0 z-10 bg-[#111827]`
- Keep `<tfoot>` sticky at bottom with `sticky bottom-0 z-10 bg-[#111827]`
- The horizontal scroll (`overflow-x-auto`) remains on the outer wrapper

## 2. Add "Resultados" and "Custo por Resultado" to KPI cards
**File:** `src/components/KpiCard.tsx`
- Add two new entries to `METRIC_DEFS`:
  - `conversions` → label "Resultados", format as number, icon Target
  - `cost_per_conversion` → label "Custo/Resultado", format as currency, `invertChange: true`
- Update `MetricKey` type to include `'conversions' | 'cost_per_conversion'`

**File:** `src/hooks/useMetaInsights.ts`
- Ensure `MetaInsights` interface has `conversions` (already exists in `MetaCampaign`)
- Add `cost_per_conversion` computed field (spend / conversions) if not present

## 3. Add "Resultados" and "Custo por Resultado" to DailyChart
**File:** `src/components/DailyChart.tsx`
- Add two new entries to `LINES` array:
  - `conversions` → label "Resultados", color distinct, yAxisId "count"
  - (Custo/Resultado is a ratio, not ideal for daily line chart — skip unless daily data supports it)

**File:** `src/hooks/useMetaInsights.ts`
- Add `conversions` to `DailyMetric` interface if the edge function returns it in daily breakdown

## 4. Edge function check
The edge function already fetches `actions` which includes leads/purchases. "Resultados" in Meta Ads context typically maps to the campaign objective result (same as leads or purchases depending on objective). We'll map `conversions` = leads + purchases as a combined "results" metric, or use the existing `conversions` field from the API response.

