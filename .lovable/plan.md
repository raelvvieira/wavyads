

# Fix custom date picker + customizable funnel bottom stages

## 1. Fix custom date range picker — click-to-toggle days

**File:** `src/pages/ClientDashboard.tsx`

**Problem:** The calendar requires selecting a range (from→to), which is unintuitive. User wants to simply click days to toggle them on/off, and the selected range auto-derives from the earliest and latest selected dates.

**Fix:**
- Switch from `mode="range"` to `mode="multiple"` on the Calendar
- Store selected dates as `Date[]` in state
- On each click, toggle the date (add if not present, remove if present)
- Derive `from` and `to` from `Math.min/max` of selected dates
- Auto-apply: as soon as there are 2+ dates selected, set `selectedPeriod = 'custom'` and compute the date range
- Show the range in the button label: `dd/MM - dd/MM`
- Send the custom date range to the edge function as `since`/`until` ISO strings (requires updating `datePreset` logic to pass actual dates instead of a preset string)
- Keep the popover open so user can keep clicking days; add a small "Aplicar" button or auto-close on second click

**Simpler approach:** Keep `mode="range"` but fix the UX by:
- Allowing partial selection (show `from` immediately when first day clicked)
- Setting `selected` to `{ from, to: undefined }` after first click so user sees the start highlighted
- The current code already does this but requires `range.from && range.to` to close — the issue is likely `pointer-events-auto` or the popover closing. Let me check the Calendar component...

Actually, looking at the reference image, the user shows a range selection with two months visible and green-highlighted days. The current code already uses `mode="range"` with `numberOfMonths={2}`. The issue is likely that the calendar isn't receiving clicks due to missing `pointer-events-auto` or the popover behavior.

The current code already has `pointer-events-auto`. The real fix: remove the condition that auto-closes popover on `range.to` selection, and instead let user freely click. Change approach:
- Use `mode="range"` (keep it)
- Remove auto-close on range complete
- Add an "Aplicar" button below the calendar
- Make sure the `selected` state works with partial ranges (from only)

## 2. Customizable funnel bottom stages

**File:** `src/components/ConversionFunnel.tsx`

**Problem:** The last two stages are hardcoded as "Leads" and "Compras". User wants to choose between leads, results, purchases for the bottom funnel stages.

**Fix:**
- Add a new prop `bottomStages` or handle it internally with state
- Add small dropdown/toggle buttons above or beside the last 2 funnel stages
- Options: `leads`, `results`, `purchases` (with labels "Leads", "Resultados", "Compras")
- Store selection in `useState` with localStorage persistence
- Update `ConversionFunnelProps` to also accept `results` and `cost_per_result` values
- Pass `results` and `cost_per_result` from `ClientDashboard.tsx`

**Implementation:**
- Add `results` and `costPerResult` to props
- Add state for stage 4 and stage 5 selection (default: leads, purchases)
- Render small select/toggle above the funnel or inline with each stage label
- Recalculate rates dynamically based on selected stages

## Files

| File | Change |
|------|--------|
| `src/pages/ClientDashboard.tsx` | Fix calendar: add "Aplicar" button, remove auto-close, pass custom dates |
| `src/components/ConversionFunnel.tsx` | Add stage selector for last 2 funnel stages, accept results prop |

