

# Fix: Custo/Resultado e Custo/Compra invisíveis no gráfico

## Problem

The `cost_per_result` and `cost_per_purchase` metrics share the same Y-axis (`currency`) as `spend`. Since spend values are in the thousands (e.g., R$10,000) while cost metrics are typically R$5-50, the cost lines appear as flat lines at the bottom — effectively invisible.

## Solution

Create a separate Y-axis for cost-per metrics so they render on their own scale, independent of spend.

**File:** `src/components/DailyChart.tsx`

- Add a third `yAxisId` value: `'cost'` (in addition to `'currency'` and `'count'`)
- Change `cost_per_result` and `cost_per_purchase` from `yAxisId: 'currency'` to `yAxisId: 'cost'`
- Add a hidden `<YAxis yAxisId="cost">` that auto-scales independently (hide it to avoid visual clutter since there are already 2 visible axes)
- Update the `LineConfig` type to accept `'currency' | 'count' | 'cost'`

This way, when the user activates these metrics, they'll scale to their own range and be clearly visible in the chart.

