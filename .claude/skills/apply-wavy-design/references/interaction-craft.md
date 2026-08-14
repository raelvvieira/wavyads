# WAVY Interaction Craft

## Scope

Use this reference for motion, gesture-driven components, drawers, sheets, carousels, drag/drop, resizable panels, expandable islands, popovers, theme transitions, and high-craft UI review. Do not add gesture physics to ordinary buttons, forms, tables, or dashboards without an interaction need.

## Human outcome

Optimize for safety/predictability, understanding, achievement, agency, and restrained delight. WAVY should feel calm and responsive, not animated for display.

## Immediate response

- Start visual feedback on pointer/touch down through `:active` or pointer events; commit the action on release/click.
- Keep feedback continuous during dragging or resizing.
- Remove artificial waits, delayed highlights, and animation locks from input paths.
- Allow cancellation where the interaction supports it.

Use press scale around `.98`; avoid exaggerated `.95` effects on dense professional controls.

## Interruptibility

Anything users directly manipulate must remain interruptible. A moving drawer, sheet, card, or panel can be grabbed and redirected before settling.

- Animate from the current rendered value, not a stale target.
- Retarget springs instead of stacking fixed animations.
- Never disable input merely because a transition is running.
- Preserve velocity when switching from drag to settle animation.
- Use independent X/Y motion when axes have different behavior.

CSS transitions remain appropriate for small hover, opacity, color, and non-gesture shell changes. Use a spring library only when direct manipulation, interruption, or momentum makes the dependency worthwhile.

## Spring presets

Use conceptual presets rather than arbitrary durations:

| Preset | Use | Behavior |
|---|---|---|
| responsive | navigation expansion, reposition | critically damped, no bounce, response about 0.32–0.40s |
| sheet | drawer/sheet after release | slight physical settle only when gesture supplied velocity, response about 0.28–0.34s |
| momentum | flick/carousel throw | limited overshoot, response about 0.35–0.45s |

Default to no bounce. Permit bounce only after momentum-driven input; menus and routine modals should not bounce.

## Gesture contract

- Use Pointer Events and pointer capture for drag/swipe.
- Preserve the grab offset so the object does not jump to the pointer center.
- Require about 8–10px movement before committing to a drag direction.
- Track a short position/time history to estimate release velocity.
- Project the likely resting position before choosing a snap point for flick interactions.
- Add progressive resistance beyond boundaries instead of a hard frozen stop.
- Keep pointer movement and content movement 1:1 before resistance applies.

Only implement momentum projection or rubber-banding for genuine physical surfaces such as sheets, carousels, reorderable cards, or resizable panels.

## Spatial continuity

- Enter and exit along the same path.
- Originate popovers and menus from their trigger using an appropriate transform origin.
- Return focus to the source when an overlay closes.
- Make intermediate frames communicate the destination.
- Use a scrim for blocking modal tasks; use offset and material separation without a scrim for parallel contextual panels.
- For stacked overlays, visually recede parent layers without losing orientation.

## Material behavior

Material hierarchy must be visible and purposeful:

- Structural islands use heavier blur, tint, and shadow.
- Small interactive glass controls use lighter material.
- Larger glass surfaces appear optically thicker than chips.
- Do not stack light translucent layers over each other.
- Increase text contrast/weight slightly on changing translucent backgrounds.
- Animate glass by combining opacity with restrained scale/blur change; do not merely fade a flat rectangle.
- Where content scrolls under floating chrome, prefer a soft scroll-edge fade/blur to a harsh divider.

## Typography craft

Use optical sizing when supported: `font-optical-sizing: auto`.

Tracking and leading vary by role:

| Role | Tracking | Line height |
|---|---|---|
| display 32px+ | `-0.025em` to `-0.015em` | 1.05–1.15 |
| page/section title | `-0.018em` to `-0.008em` | 1.15–1.25 |
| body 14–16px | `-0.005em` to `0` | 1.45–1.6 |
| label 11–13px | `0` to `0.02em` | 1.25–1.4 |
| uppercase micro-label | `0.04em` to `0.08em` | 1.2–1.35 |

Use `clamp()` for display typography where fluid scaling helps. Prefer `rem` for type and text-related spacing so browser text scaling does not break layout. Use weight, size, spacing, and contrast together instead of size alone.

Attach tracking and leading to the **size scale itself**, not to a parallel set of role classes. In a utility framework the size utility also sets `line-height`, and utilities are emitted after the component layer — so a `line-height` declared on a `.role-title` class loses silently to the `text-3xl` on the same element, and the page looks untouched for a reason nothing in the code reveals. Baking the values into the scale makes the correct spacing arrive with the size, and every existing call site inherits it without being edited.

Two consequences worth checking after that change: a generic tightening utility applied at call sites (`tracking-tight` and equivalents) now double-applies and fights the scale, so remove it; and an uppercase micro-label needs tracking that *opens* against the scale, which means that one rule does belong in the utility layer so it wins.

## Adaptive accessibility

Treat these preferences independently:

```css
@media (prefers-reduced-motion: reduce) {
  .wavy-motion { transform: none !important; transition: opacity 160ms ease !important; }
}

@media (prefers-reduced-transparency: reduce) {
  .wavy-glass-island { background: var(--wavy-surface-elevated); backdrop-filter: none; }
}

@media (prefers-contrast: more) {
  .wavy-glass-island { border-color: var(--wavy-border-strong); box-shadow: none; }
}
```

Reduced motion preserves feedback through short fades or immediate state changes. Reduced transparency makes glass solid. Increased contrast strengthens boundaries and text.

## Wayfinding and agency

Every screen must make clear:

1. Where am I?
2. What is available here?
3. What is the primary next action?
4. How do I return, cancel, undo, or exit?

Use specific navigation labels. Place controls near what they affect. Provide undo for reversible mistakes; reserve confirmations for genuinely destructive or hard-to-reverse actions. Preserve user work during errors and interrupted flows.

## Implementation process

1. Define states and input model before animation values.
2. Build an interactive prototype for novel navigation, drag, sheets, or complex transitions.
3. Test slow and rapid repeated input, interruption, reversal, and resize.
4. Review at normal speed and frame-by-frame for jumps, clipping, and velocity discontinuity.
5. Test real content, long labels, loading, errors, reduced preferences, keyboard, and touch.
6. Keep only motion that improves causality, orientation, feedback, or delight without delaying work.

## Rejection criteria

Reject or revise when interaction waits for animation, motion restarts from a stale position, a panel exits differently from its entrance without reason, all components use identical easing, glass layers collapse legibility, headings use body tracking, reduced preferences are missing, or minimalism hides wayfinding and recovery.
