# WAVY Components

## App shell

Use one shell across products: brand, workspace/client, search/command, period/context, notifications, profile, and module navigation.

For every shell or navigation task, follow [islands-navigation.md](islands-navigation.md). A full-height edge-bound sidebar is a legacy structure, not the WAVY target.

Floating side island: 68–76px collapsed, 232–264px expanded, 12–20px viewport offset, 24–28px radius. Expand by click. Preserve icon position; show labels when expanded and tooltips when collapsed. Active state uses a high-contrast sliding pill with accessible state.

Mobile bottom island: 3–5 primary destinations, safe-area spacing, labels, and a More destination for secondary areas.

## Buttons and controls

- Primary: WAVY gradient, white text, 40–44px, 12–14px radius, one dominant action per context.
- Secondary: high-contrast solid neutral.
- Tertiary: low-priority inline action with visible hover/focus.
- Glass: contextual tools and filters, not default critical CTA.
- Segmented: 2–5 options with sliding active surface and correct radio/button semantics.
- Icon-only: 40px minimum, preferably 44px, accessible name and tooltip where useful.

## Forms

Use persistent labels, solid input surfaces, 40–44px controls, visible 2px focus ring, actionable inline errors, retained input after errors, and progressive disclosure for advanced filters.

## Cards and islands

- KPI: label, tabular value, comparison with text/symbol, optional sparkline/help.
- Data: solid level-1 surface, 16px radius, 20–24px padding, subtle border and shadow.
- AI insight: elevated/tinted surface, restrained WAVY accent, evidence/context, confidence when meaningful, and reversible recommendation. Never imply unjustified certainty.
- Glass island: navigation/context only. Avoid stacked transparency and cards inside cards.
- Empty state: explain what is empty, why it matters, and the best next action.

## Tables and lists

Keep solid. Align numbers right. Keep row actions consistent. Show sort/filter state. On mobile prioritize columns, deliberately scroll, or transform rows to cards. Include loading, empty, error, stale, permission, and pagination states.

## Overlays and feedback

Side panel: 360–480px for details while preserving list context. Modal: focused decision only. Command palette: keyboard navigation and grouping. Restore focus to trigger. Tooltips never contain essential instructions.

Use skeletons for known structures, subtle Fluid Current for AI, honest progress for long tasks, recoverable errors that preserve work, and rollback for failed optimistic updates.

## Accessibility contract

Semantic HTML first; logical headings/landmarks; visible focus; WCAG AA contrast in rendered states; no color-only meaning; connected labels/errors; logical keyboard order; accessible menus/dialogs; chart summary/table for important data; support zoom, text scaling, reduced motion, and 44px targets.
