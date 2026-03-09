

## Plan: Fix Intelligence Engine — Too Few Insights Generated

The engine has several bugs causing most insights to be silently skipped. Only E1 (learning phase) fires because its conditions are the easiest to meet. Here's what's wrong and the fix:

### Root Causes

1. **Deduplication too aggressive**: `addFlag` deduplicates by `${type}-${fix}` per client. So if Client A has 3 campaigns stuck in learning, only 1 insight shows. The key should include campaign/ad name.

2. **E1 uses `conversions` (leads+purchases) instead of `results`**: Messaging campaigns have results but 0 `conversions`, so E1 fires for every campaign even those performing well. Should use `results` field.

3. **Historical averages are account-level, not campaign-level**: `historicalCPR`, `historicalCTR`, `historicalConvRate` are computed from `dailyHistory` which is account-level 21-day data. But Layer 3 compares individual campaign CPR against the account average — if one campaign is cheap and another expensive, the average masks both. Should compare campaign current vs previous period.

4. **Layer 2 (Funnel) minimum 300 clicks is too strict for 7-day window**: Many campaigns won't hit 300 clicks in 7 days. Lower to 100.

5. **Layer 3 (Performance) minimum 5 results is fine, but comparison logic is wrong**: It compares `camp.cost_per_result` against `historicalCPR` (account average), not against that campaign's own previous period CPR (`prevCamp.cost_per_result`). A campaign could have CPR 2x the account average and that's just how it operates — not an insight.

6. **No "basic" performance insights**: There are no insights for simple things like "this campaign has excellent performance" or "this campaign's CTR is dropping week-over-week". The engine only fires on extreme conditions.

### Changes

**File: `src/lib/intelligenceEngine.ts`**

1. **Fix deduplication key** — change from `${flag.type}-${flag.fix}` to `${flag.type}-${flag.fix}-${flag.campaign}-${flag.adName || ''}`. This allows multiple insights of the same type across different campaigns.

2. **Fix E1** — use `results` instead of `conversions` for the threshold check. Also lower threshold to 50 total (not per week as stated in the description — the code checks total, which is correct but should use results).

3. **Fix Layer 3 comparisons** — use `prevCamp.cost_per_result` (same campaign, previous period) instead of `historicalCPR` (account average) for P1/P5 campaign-level analysis. Keep account-level `historicalCPR` only for P2 (ROAS) and health score.

4. **Lower funnel minimum** from 300 to 100 clicks.

5. **Add new basic insights** that fire more easily:
   - **P6 — Campaign performing well**: CPR < 70% of account average with >= 5 results → "opportunity" priority, positive insight
   - **P7 — Week-over-week spend drop**: Spend dropped > 50% vs previous period for active campaign → medium priority, budget issue
   - **General account insight**: If total spend > 0 but < R$50/day average, flag as "budget too low for meaningful optimization"

6. **Fix ROAS calculation in edge function** — currently `roas = (purchases * costPerPurchase) / spend` which calculates cost-based ROAS (always ~1). Should use purchase_value from actions if available, or document that ROAS may not be available without value tracking.

Single file change: `src/lib/intelligenceEngine.ts`

