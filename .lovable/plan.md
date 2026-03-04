

# Add cost metrics to daily chart + campaign status filter

## 1. DailyChart — add "Custo por Compra" and "Custo por Resultado"

**File:** `src/components/DailyChart.tsx`

The `LINES` array currently has: spend, clicks, impressions, leads, purchases, results. Add two new computed metrics:

- `cost_per_purchase` (Custo/Compra) — `spend / purchases` per day
- `cost_per_result` (Custo/Resultado) — `spend / results` per day

These don't exist in `DailyMetric`, so we need to:
- Extend `DailyMetric` in `useMetaInsights.ts` to include `cost_per_purchase` and `cost_per_result`
- Compute them in the `useMetaInsights` hook when processing daily data: `cost_per_result = d.spend / d.results` (guard div by zero)
- Add two new entries to `LINES` with `yAxisId: 'currency'` and `formatCurrency`

## 2. CampaignsTable — add status filter

**File:** `src/components/CampaignsTable.tsx`

Add a row of filter buttons above the table ("Todas", "Ativas", "Pausadas", "Encerradas"):
- State: `filterStatus: 'all' | 'active' | 'paused' | 'ended'`
- Filter `campaigns` before sorting
- Recalculate totals based on filtered campaigns
- Style: small pill buttons similar to the DailyChart metric toggles

## Files

| File | Change |
|------|--------|
| `src/hooks/useMetaInsights.ts` | Add `cost_per_purchase` and `cost_per_result` to `DailyMetric`, compute in daily mapping |
| `src/components/DailyChart.tsx` | Add two new LINES entries for cost metrics |
| `src/components/CampaignsTable.tsx` | Add status filter buttons, filter campaigns before sort/totals |

