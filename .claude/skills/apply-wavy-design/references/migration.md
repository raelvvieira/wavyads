# Migrating Existing Products to WAVY

## Safety

Preserve functionality and unrelated changes. Read repository instructions and inspect the working tree. Avoid broad blind replacements, unnecessary library swaps, and simultaneous backend refactors.

## Inventory

Record framework/build, CSS/theme architecture, component/chart libraries, fonts, raw colors and variables, app shell, navigation, primitives, overlays, tables, charts, feedback states, breakpoints, accessibility utilities, tests, and resistant third-party widgets. Capture representative screens before changes.

## Semantic mapping

Classify every current color as semantic, brand, data series, status, or accidental. Map app background to canvas, panels to functional surfaces, raised cards to raised surfaces, accent to brand/action/status appropriately, and dividers to theme-aware border tokens.

## Adding a second theme to a single-theme product

The obstacle is rarely the tokens — it is the volume of hardcoded foreground utilities. A mature dark-only product typically carries hundreds of `text-white/60`, `bg-white/[0.06]`, and `border-white/10` spread across dozens of files. Rewriting them one by one is a large, risky sweep.

Look at what they mean before planning that sweep. Almost all of them use white as **ink over the background** — and ink is exactly what inverts. Remap the framework's `white` to a themed ink token (`hsl(var(--ink) / <alpha-value>)`), white in dark and near-black in light, and every one of them becomes correct at once without touching a component. The same `hover:bg-white/[0.06]` stays the correct subtle veil in both themes.

Two checks before committing to that remap, both cheap and both decisive:

1. **Does rendered content use the same utilities?** If the product generates artwork, documents, or exports, confirm those are painted with inline styles or their own scope. A remap that reaches customer-facing output changes the deliverable, not the chrome.
2. **Where must white stay white?** Grep for foreground-white on saturated brand, destructive, or status fills. There are usually only a handful. Give them a dedicated always-white color; a tinted fill at low alpha is a *light* background in light theme and needs dark ink like everything else, so do not convert those by reflex.

Inventory single-tone brand assets in the same pass. A light-only logo disappears on a white surface — keep its container dark in both themes rather than shipping a second asset.

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

Measure contrast in the rendered page rather than reading hex values, and flatten alpha over the effective background — a translucent foreground compared against its own declared color reports a ratio the user never sees. Sample the same probes in both themes; a token that passes in one and fails in the other is the normal case, not the exception.

A remap-based theme conversion is correct in the general case by construction, so spend the visual pass on the dense screens and on any place the utility might have meant something other than ink.

## Failure modes

Recoloring without hierarchy; retaining a full-height edge-bound sidebar; calling an opaque bordered panel “glass”; missing click expansion; global glass; gradient on every action; oversized radii in dense CRM; hiding labels for minimalism; breaking chart semantics; desktop navigation copied to mobile; replacing stable libraries; claiming completion without screenshots of collapsed and expanded states.
