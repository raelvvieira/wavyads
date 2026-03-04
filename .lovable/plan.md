

# Fix duplicate metrics + Rebrand sidebar

## 1. Remove duplicate metrics from KpiCard

**File:** `src/components/KpiCard.tsx`

The `METRIC_DEFS` has two pairs of duplicates:
- `conversions` (label: "Resultados") duplicates `results` (label: "Resultados")
- `cost_per_conversion` (label: "Custo/Resultado") duplicates `cost_per_result` (label: "Custo/Resultado")

**Fix:** Remove `conversions` and `cost_per_conversion` from `METRIC_DEFS` and `MetricKey` type. Keep `results` and `cost_per_result` as the single source. Search codebase for any references to `conversions`/`cost_per_conversion` and update them to use `results`/`cost_per_result`.

## 2. Rebrand sidebar: "WAVY Dash" + logo

**File:** `src/components/AppSidebar.tsx`

- Copy `user-uploads://03_ISOTIPO.png` to `src/assets/wavy-logo.png`
- Replace the `Zap` icon with an `<img>` of the logo on a black rounded background
- Change "AdsPro" → "WAVY Dash"

## Files

| File | Change |
|------|--------|
| `src/components/KpiCard.tsx` | Remove `conversions` + `cost_per_conversion` keys |
| `src/components/AppSidebar.tsx` | Rename to "WAVY Dash", swap icon for logo image |
| `src/assets/wavy-logo.png` | Copy uploaded logo |

