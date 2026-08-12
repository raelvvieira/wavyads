# WAVY Frontend Implementation

Inspect the current stack first. Reuse stable component and chart libraries. For new products build tokens → base → primitives → shell → patterns → pages → motion → QA.

For shell work, copy or adapt `assets/expandable-island/` and follow [islands-navigation.md](islands-navigation.md). Do not improvise a conventional sidebar when this asset can be integrated.

## CSS

Use `assets/wavy-tokens.css` as reference or drop-in. Components consume semantic variables and variants, not markup-depth selectors or repeated raw colors.

Example:

    .wavy-card {
      color: var(--wavy-text);
      background: var(--wavy-surface-raised);
      border: 1px solid var(--wavy-border);
      border-radius: var(--wavy-radius-card);
      box-shadow: var(--wavy-shadow-card);
      padding: var(--wavy-space-6);
    }

    .wavy-primary {
      min-height: 44px;
      color: #fff;
      background: var(--wavy-gradient);
      border: 0;
      border-radius: var(--wavy-radius-control);
      transition: transform var(--wavy-duration-fast) var(--wavy-ease);
    }

    .wavy-primary:hover { transform: translateY(-1px); }
    .wavy-primary:active { transform: scale(.98); }

## React and framework patterns

Separate behavior from visual primitives. Use native buttons/anchors/inputs and composable variants. Preserve accessible names/states. Map Tailwind theme colors and radii to semantic CSS variables rather than raw hex. Do not force Tailwind into another stable architecture.

Create one theme adapter for the chart library: palette, axes, grid, tooltip, legend, focus, and motion. Use `Intl.NumberFormat('pt-BR', ...)` for Brazilian locale where appropriate.

## Performance and QA

Avoid blur on large scrolling containers. Prefer transform/opacity. Lazy-load heavy charts/editors when appropriate. Prevent font layout shift. Put decorative glows in pointer-inert pseudo-elements.

Run project build/tests/lint/typecheck plus `python3 scripts/wavy_audit.py PROJECT`. Treat static findings as leads and pair them with rendered visual, responsive, contrast, reduced-motion, and keyboard checks.

Render and capture the navigation both collapsed and expanded. Code completion without those visual states is insufficient.
