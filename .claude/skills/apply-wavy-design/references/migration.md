# Migrating Existing Products to WAVY

## Safety

Preserve functionality and unrelated changes. Read repository instructions and inspect the working tree. Avoid broad blind replacements, unnecessary library swaps, and simultaneous backend refactors.

## Inventory

Record framework/build, CSS/theme architecture, component/chart libraries, fonts, raw colors and variables, app shell, navigation, primitives, overlays, tables, charts, feedback states, breakpoints, accessibility utilities, tests, and resistant third-party widgets. Capture representative screens before changes.

## Semantic mapping

Classify every current color as semantic, brand, data series, status, or accidental. Map app background to canvas, panels to functional surfaces, raised cards to raised surfaces, accent to brand/action/status appropriately, and dividers to theme-aware border tokens.

## Phases

0. Run baseline build/tests and capture screenshots.
1. Introduce semantic tokens for color, type, spacing, radii, elevation, motion, charts.
2. Convert global shell spatially: remove edge-bound sidebar walls, establish continuous canvas, implement detached expandable navigation island and mobile bottom island. Do this before page-card polish.
3. Convert shared primitives and all their states.
4. Convert high-traffic product patterns in slices.
5. Theme charts and data states.
6. Add motion and reduced-motion behavior.
7. Remove proven-dead legacy styles only after verifying consumers.

## Verification

Build/tests pass; theme switch has no flash/unreadable state; representative routes render in both themes; key widths work; keyboard/focus/escape/focus-return work; charts handle realistic, zero, missing, large, and negative values where applicable; long names and locale strings fit; contrast and reduced motion pass; visual comparison preserves workflow density.

## Failure modes

Recoloring without hierarchy; retaining a full-height edge-bound sidebar; calling an opaque bordered panel “glass”; missing click expansion; global glass; gradient on every action; oversized radii in dense CRM; hiding labels for minimalism; breaking chart semantics; desktop navigation copied to mobile; replacing stable libraries; claiming completion without screenshots of collapsed and expanded states.
