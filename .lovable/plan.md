

# Funnel gradient, layout reorder, ranking upgrade & richer insights

## 1. ConversionFunnel — green gradient + all-green rate badges
**File:** `src/components/ConversionFunnel.tsx`
- Apply a gradient background to each funnel stage: darkest green at top (Impressões) → lighter green at bottom (Compras)
  - Use inline styles with interpolated green shades: `rgba(26,205,138, 0.05)` → `rgba(26,205,138, 0.25)` or similar based on stage index
  - Add a left border accent that also follows the gradient
- Change `rateColor()` to always return green styling (emerald) for all percentage badges between stages, removing the red/amber logic

## 2. Reorder sections in ClientDashboard
**File:** `src/pages/ClientDashboard.tsx` (lines 433-479)
- New order:
  1. GapAlert
  2. KPI Cards
  3. Daily Chart
  4. Campaigns Table
  5. **Ranking Charts** (already here)
  6. **Conversion Funnel** (move up, before insights)
  7. **Insights & Recommendations** (move down, after funnel)
  8. **Strategic Summary** (stays last)

## 3. RankingCharts — upgrade per spec
**File:** `src/components/RankingCharts.tsx`
- **Left chart (Leads)**: Use `results` instead of `leads` (or keep leads if that's the intent — the spec says "Leads por Campanha"). Give each bar a unique color from a palette array.
- **Right chart (CPL)**: Already has green→yellow→red scale. Add value labels at end of each bar showing `R$ X.XX`. Keep sorted lowest→highest.
- Both charts: ensure tooltip shows full campaign name on hover (already works).

## 4. InsightsCards — richer, more detailed descriptions
**File:** `src/components/InsightsCards.tsx`
- Upgrade to match the reference image style: longer, more analytical descriptions with bold data points
- Change layout to `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for better density
- Add funnel-analysis insights:
  - **Funnel health** (top-of-funnel CTR assessment)
  - **Click→Lead conversion rate** with specific numbers and percentage
  - **Lead→Purchase conversion** with revenue estimation logic
  - **Regional/campaign concentration** analysis (which campaigns hold most leads)
  - **Actionable recommendations** (reactivate leads, test budget increase)
- Make descriptions multi-sentence with `<strong>` bold for key numbers
- Remove the outer GlassCard wrapper, use standalone cards like the reference image

## Files to modify
| File | Change |
|------|--------|
| `src/components/ConversionFunnel.tsx` | Green gradient stages + all-green rate badges |
| `src/pages/ClientDashboard.tsx` | Reorder: Funnel before Insights, Insights before Summary |
| `src/components/RankingCharts.tsx` | Unique bar colors for leads, value labels |
| `src/components/InsightsCards.tsx` | Richer descriptions, funnel insights, better layout |

