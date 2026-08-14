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

When a Tailwind color maps to a CSS variable, declare it as `hsl(var(--token) / <alpha-value>)`. Without the placeholder the opacity modifier is dropped silently: `bg-token/10` renders fully opaque and nothing reports an error. Verify in the compiled CSS, not by reading the config.

Verify arbitrary values reached the output too. A malformed one (`duration-[--token]` instead of `duration-[var(--token)]`) simply produces no rule, so the element keeps the default and the diff still looks right.

Create one theme adapter for the chart library: palette, axes, grid, tooltip, legend, focus, and motion. Use `Intl.NumberFormat('pt-BR', ...)` for Brazilian locale where appropriate.

## Theme switching

Stamp the resolved theme on the root element from an inline script before first paint. Applied only from the app framework, the page renders in the default theme and visibly flips once the app mounts.

Set `color-scheme` per theme. It themes native selects, scrollbars, and form controls for free, and lets you delete the per-theme hacks usually found on `<option>` and similar elements.

Model the preference as *unset* until the user chooses, not as a third "system" mode in the control. While unset, follow `prefers-color-scheme` live, including changes during the session; the first explicit choice takes over permanently. That keeps the system-following behavior for people who never touch the control, without spending a third button on it — and it means someone who picked light is never surprised by nightfall.

Offer a single control that shows the **destination**, not the current state: a sun in dark theme, because that is where the click leads. Place it with display preferences, not with session utilities like sign-out.

## Performance and QA

Avoid blur on large scrolling containers. Prefer transform/opacity. Lazy-load heavy charts/editors when appropriate. Prevent font layout shift. Put decorative glows in pointer-inert pseudo-elements.

Run project build/tests/lint/typecheck plus `python3 scripts/wavy_audit.py PROJECT`. Treat static findings as leads and pair them with rendered visual, responsive, contrast, reduced-motion, and keyboard checks.

Render and capture the navigation both collapsed and expanded. Code completion without those visual states is insufficient.

Measure rather than eyeball the shell. Read back the island's rect, the content container's computed offset, and the position of a real element in the first column, in every state — collapsed, hover, pinned — and at more than one viewport height. Overlap is a number: the island's right edge against the content's left edge. A screenshot shows whether it looks right; the measurement proves it, and catches the case where the offset is applied but a viewport-anchored element ignores it.

Test pointer behavior with hand-built events. jsdom does not implement `PointerEvent`, so `fireEvent.pointerOver(el, { pointerType })` delivers an empty type and the mouse-versus-touch branch — usually the whole point of the test — is never exercised.
