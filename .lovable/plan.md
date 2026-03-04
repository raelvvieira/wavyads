

# Campaigns table Meta-style results + Area chart for all lines

## 1. Edge function: return `result_type` per campaign

**File:** `supabase/functions/meta-fetch-insights/index.ts`

Add a new function `extractResultType(actions)` that returns the action_type string of the first matching result (e.g. `"onsite_conversion.messaging_conversation_started_7d"`). Return this as `result_type` field in each campaign object.

## 2. MetaCampaign interface: add `result_type`

**File:** `src/hooks/useMetaInsights.ts`

Add `result_type: string;` to `MetaCampaign`.

## 3. CampaignsTable: Meta Ads Manager style columns

**File:** `src/components/CampaignsTable.tsx`

- Add an `ACTION_TYPE_LABELS` map translating action_type keys to Portuguese labels
- Replace "Leads" column with "Resultados": renders value on top (bold) + action type name below in small gray text. Show "—" if no results.
- Replace "CPL" column with "Custo por resultado": renders cost value on top + "Por [label]" below in small gray text. Show "—" if no results.
- Use custom cell rendering (not the generic `format` function) for these two columns
- Update totals row accordingly
- Keep all other columns unchanged

## 4. DailyChart: AreaChart with gradient fill for all lines

**File:** `src/components/DailyChart.tsx`

- Always use `AreaChart` instead of switching between `AreaChart` (spend only) and `LineChart` (multiple)
- Define a `<linearGradient>` for each line color in `<defs>`
- Render `<Area>` components with `fill="url(#gradientId)"` and `stroke` for each active line
- Each gradient goes from `stopOpacity={0.25}` at top to `stopOpacity={0}` at bottom
- Remove the `onlySpend` conditional — always render AreaChart

## Files

| File | Change |
|------|--------|
| `supabase/functions/meta-fetch-insights/index.ts` | Return `result_type` per campaign |
| `src/hooks/useMetaInsights.ts` | Add `result_type` to MetaCampaign |
| `src/components/CampaignsTable.tsx` | Meta-style Resultados + Custo por resultado columns |
| `src/components/DailyChart.tsx` | AreaChart with gradient fill for all lines |

