# WAVY Floating Islands and Expandable Navigation

## Purpose

This reference is mandatory for a full WAVY redesign, app shell, sidebar, navigation, glass, or layout task. The defining feature is spatial separation: navigation and contextual controls float above a continuous canvas instead of forming rigid viewport walls.

## Flat-theme rejection rule

Reject the result as incomplete when any of these remains without a documented product constraint:

- sidebar touches top, bottom, and left viewport edges;
- sidebar is a full-height opaque rectangle dividing the screen;
- only colors, borders, or radii changed;
- glass lacks visible background separation, translucency, blur, edge light, or shadow;
- menu has no collapsed/expanded behavior on desktop;
- content starts immediately against the sidebar without an air gap;
- every panel has identical material and elevation.

## Desktop shell anatomy

Use a continuous app canvas. Place a compact brand mark separately at top-left or inside the island. Position the navigation island with `position: fixed` or a stable sticky shell:

- left: 12–20px;
- top: 88–112px when a small header exists, or 16–24px for a self-contained island;
- bottom: 16–24px or use content-driven height with max-height;
- collapsed width: 68–76px;
- expanded width: 232–264px;
- radius: 24–28px;
- internal padding: 8–12px;
- content gap from expanded island: 24–32px;
- z-index high enough to float, below dialogs/toasts;
- never use `height: 100vh` together with zero edge offsets.

The canvas may show a restrained ambient orange-red glow behind or near the island so blur is perceptible. Do not place noise or glow behind dense text.

## Expansion behavior

Use an explicit toggle button with `aria-expanded` and accessible label. Expansion occurs on click, not hover. Optional hover preview must never be the only access to labels.

- Preserve the x-position of icons.
- Animate width 260–320ms with fluid easing.
- Reveal labels using opacity plus small x translation after width begins.
- Slide the active background between items where framework permits.
- Store preference locally only if useful; do not override responsive behavior.
- Escape may collapse when focus is inside the navigation.
- Tooltips appear only while collapsed.
- The content region must adapt through a CSS variable or layout state without overlapping important content.

Preferred state model: `collapsed`, `expanded`, and responsive `mobile`. Never create separate navigation trees with divergent permissions or routes.

## Visual material contract

Dark island:

```css
background:
  linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.018)),
  rgba(23,23,27,.68);
border: 1px solid rgba(255,255,255,.12);
box-shadow:
  0 24px 70px rgba(0,0,0,.42),
  0 2px 12px rgba(0,0,0,.24),
  inset 0 1px 0 rgba(255,255,255,.10);
backdrop-filter: blur(24px) saturate(135%);
```

Light island:

```css
background:
  linear-gradient(180deg, rgba(255,255,255,.84), rgba(255,255,255,.65)),
  rgba(255,255,255,.66);
border: 1px solid rgba(255,255,255,.92);
box-shadow:
  0 24px 64px rgba(24,24,30,.13),
  0 2px 10px rgba(24,24,30,.06),
  inset 0 1px 0 #fff;
backdrop-filter: blur(24px) saturate(125%);
```

Glass needs something subtle behind it to refract. If the underlying canvas is visually uniform, add a restrained ambient layer; never compensate by lowering opacity until text becomes unreadable.

## Navigation items

- Row height: 44–48px.
- Icon slot: 44–48px fixed width.
- Label: 13–14px, 500–600 weight.
- Gap between groups: 12–18px with a low-contrast divider or micro-label.
- Active item: high-contrast capsule; dark mode may use near-white capsule with dark icon/text or restrained WAVY tint.
- Do not fill the entire active row with an intense gradient by default. Reserve full gradient for primary actions.
- Footer utilities and profile/usage may occupy a separate small island when that creates clearer hierarchy.

## Contextual islands

Use islands where tools change according to the current task:

- period and comparison filters;
- chart series/view controls;
- Studio model, ratio, resolution, product/avatar options;
- save/history/version actions;
- CRM lead status, owner, quick actions;
- bottom-centered canvas toolbar.

Keep them content-sized. Prefer one clear cluster over many unrelated pills. Do not apply glass to message bubbles, long forms, data tables, or every KPI card.

## Mobile

Below the project breakpoint, remove the desktop island and use one bottom island with 3–5 primary destinations. Respect safe area, keep 12–16px side/bottom offsets, use 64–72px total height, and move secondary navigation to a sheet. Do not simply shrink the expanded desktop sidebar.

## Mandatory visual QA

Capture at least one desktop screenshot in collapsed state, one in expanded state, one mobile state, and both themes when in scope. Verify surrounding canvas is visible on all sides of the desktop island, labels never clip, content does not jump abruptly, focus remains visible, blur is perceptible, and reduced motion removes nonessential transitions.

## Acceptance checklist

- [ ] Island detached from viewport boundaries.
- [ ] Collapsed and expanded states implemented and captured.
- [ ] Click toggle and `aria-expanded` present.
- [ ] Fixed icon anchors and readable labels.
- [ ] Glass includes transparency, blur, border highlight, and shadow.
- [ ] Content offset tracks island state without overlap.
- [ ] Active indicator has spatial continuity.
- [ ] Mobile uses a bottom island or justified alternative.
- [ ] Reduced motion and keyboard behavior verified.
- [ ] Dense operational surfaces remain solid.
