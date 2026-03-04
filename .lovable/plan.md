

# Fix mobile layout + sidebar close button position

## 1. Mobile KPI cards — fix cramped layout

**File:** `src/pages/ClientDashboard.tsx`

The KPI grid uses `grid-cols-2` on mobile, making cards too narrow to read values. Fix:
- Change grid to `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6` so cards stack single-column on small phones
- Add responsive padding adjustments to the header section for mobile (`px-4` on mobile, `px-6` on desktop)
- Reduce header gap on mobile

**File:** `src/components/KpiCard.tsx`

- Ensure text doesn't truncate on small screens — the metric value font size should be responsive (`text-xl sm:text-2xl md:text-3xl`)

## 2. Mobile header — make period buttons and client info fit

**File:** `src/pages/ClientDashboard.tsx`

- The header with period buttons wraps badly on mobile. Add `pt-16 lg:pt-0` to header content so it doesn't overlap with the hamburger button
- Make period buttons smaller on mobile with `text-[10px] sm:text-xs` and `px-2.5 sm:px-4`

## 3. Sidebar close button — move X away from logo

**File:** `src/components/AppSidebar.tsx`

Currently the hamburger/X button is `fixed top-4 left-4` which overlaps the sidebar header when open. Fix:
- Move the X button to the **top-right** of the sidebar when open (e.g., inside the sidebar header, aligned right)
- Keep the hamburger Menu button at `fixed top-4 left-4` when sidebar is closed
- When sidebar is open, render the X button inside the sidebar header area (right side), not overlapping the logo

## Files

| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Move X close button to sidebar header right side |
| `src/pages/ClientDashboard.tsx` | Fix grid to `grid-cols-1` on mobile, adjust header padding |
| `src/components/KpiCard.tsx` | Responsive font sizes for metric values |

