---
name: apply-wavy-design
description: Create, redesign, migrate, implement, audit, review, and quality-check web applications, SaaS products, dashboards, CRMs, internal tools, landing pages, and design systems using the WAVY Fluid Intelligence visual standard. Use when building a new WAVY interface; restyling an existing product; unifying disconnected WAVY products; changing colors, typography, spacing, cards, tables, forms, navigation, charts, motion, light/dark themes, responsiveness, or accessibility; reviewing screenshots, Figma frames, URLs, or frontend code for WAVY compliance; or converting an existing UI into the WAVY Design System without breaking behavior.
---

# Apply WAVY Design

Apply **WAVY Fluid Intelligence** as a product system, not a decorative skin. Preserve or improve usability, data clarity, accessibility, responsiveness, and product behavior while introducing the WAVY visual language.

## Required operating principles

1. Treat Dashboard, CRM, Studio, AI tools, and future modules as one ecosystem with one shared app shell and design-token contract.
2. Preserve working behavior, routes, state, data contracts, permissions, analytics, and business rules unless the user explicitly authorizes functional changes.
3. Use glass selectively for navigation, toolbars, filters, contextual controls, overlays, and AI surfaces. Keep dense data surfaces mostly solid.
4. Keep white dominant in light mode. Use `#111113` and nearby charcoal values instead of pure black for main dark surfaces.
5. Use the WAVY orange-to-red gradient as energy, active emphasis, and primary action—not as a universal fill.
6. Prefer clarity over visual effects. A premium result is restrained, spacious, precise, and operational.
7. Never claim accessibility or visual fidelity from code inspection alone. Render and test when tools permit.
8. Respect `prefers-reduced-motion`, contrast, keyboard focus, touch target, and responsive requirements.
9. Treat spatial architecture as mandatory. A recolored conventional full-height sidebar, flat top bar, or uniformly boxed grid is not a WAVY redesign.
10. Unless product constraints make it impossible, detach primary desktop navigation from viewport edges and implement it as an expandable floating island with visible surrounding canvas.
11. For any task involving shell, sidebar, navigation, layout, glass, or a full-product redesign, read [islands-navigation.md](references/islands-navigation.md) and use its implementation contract.
12. For any task involving motion, drawers, sheets, drag/swipe, carousels, resizable panels, theme transitions, or high-craft interaction, read [interaction-craft.md](references/interaction-craft.md). Use physical behavior only where user input or spatial continuity justifies it.
13. Design for calm, confidence, agency, predictability, and speed. Minimal appearance is not enough when controls are ambiguous, feedback is delayed, or users lose context.

## Select the mode

### Create

Use for a new interface or module. Read [foundations.md](references/foundations.md), [tokens.md](references/tokens.md), [components.md](references/components.md), [islands-navigation.md](references/islands-navigation.md), the relevant patterns in [dashboard-crm.md](references/dashboard-crm.md), and [implementation.md](references/implementation.md).

Define information architecture and task hierarchy before styling. Create both light and dark behavior unless the user scopes one theme only.

### Migrate or redesign

Use for an existing product. Read [migration.md](references/migration.md), [tokens.md](references/tokens.md), [components.md](references/components.md), [islands-navigation.md](references/islands-navigation.md), and [implementation.md](references/implementation.md).

Inventory the current UI and dependencies first. Establish tokens and shared primitives before performing page-by-page conversion. Work in reversible stages and verify behavior after each stage.

### Audit or review

Use for screenshots, a live product, Figma, or code. Read [audit.md](references/audit.md), [foundations.md](references/foundations.md), [tokens.md](references/tokens.md), and [components.md](references/components.md).

Capture or inspect evidence before judging. Report issues by severity and distinguish visual, UX, accessibility, responsive, and implementation findings. If a local codebase is available, run `scripts/wavy_audit.py PATH` as supporting evidence; never treat static results as complete.

### Implement fixes

An audit request alone does not authorize code changes. When the user asks to modify or apply the design, implement the approved scope, validate it, render key screens, and compare before/after states.

## Standard workflow

1. **Ground the task.** Identify product, primary users, primary task, surfaces, technology, evidence, theme requirements, and whether behavior may change.
2. **Inspect before changing.** Check repository instructions, dirty files, framework, CSS architecture, component and chart libraries, fonts, routing, tests, and existing tokens.
3. **Map the current system.** Inventory app shell, navigation, page templates, type, colors, spacing, radii, elevations, buttons, inputs, tables, charts, overlays, states, motion, and breakpoints.
4. **Choose a conversion strategy.** Prefer token-first migration. Never mechanically replace every color or radius without semantic mapping.
5. **Create the shared foundation.** Install or map semantic tokens from `assets/wavy-tokens.css` or `assets/wavy-tokens.json`.
6. **Transform the shell spatially.** Replace edge-bound navigation with the WAVY floating-island architecture when applicable. Implement collapsed, expanded, active, hover, focus, mobile, and reduced-motion states before styling pages.
7. **Build primitives.** Apply button, field, card, island, navigation, table, modal, tooltip, badge, segmented-control, and focus patterns before page composition.
8. **Compose product patterns.** Use the shared shell with context-specific density for Dashboard, CRM, Studio, and future modules.
9. **Apply motion last.** First ensure structure, states, responsiveness, and keyboard behavior work. Then add the Fluid Current motion language.
   For gesture-driven or interruptible surfaces, design interaction behavior together with the component rather than adding canned animation afterward.
10. **Validate.** Run relevant build/tests/lint, the static WAVY audit, responsive checks, keyboard checks, contrast review, reduced-motion checks, and visual comparison. Reject a flat recolor as incomplete.
11. **Report.** Summarize changed surfaces, preserved behavior, verification, remaining risks, and decisions required.

## Non-negotiable acceptance gates

- One semantic token system drives light and dark themes.
- Light canvas is white or near-white, never beige by default.
- Main dark surfaces use layered charcoals; pure black is reserved for exceptional contrast.
- Primary WAVY gradient is anchored by `#FF831E` and `#DA2F1E`.
- Body and secondary text remain readable.
- Glass does not sit behind dense copy, message bodies, long forms, or data tables.
- Navigation has accessible names, clear active state, visible focus, and usable responsive modes.
- Desktop primary navigation is visibly detached from viewport edges by 12–20px, rounded as an island, and supports click expansion unless an explicit constraint is documented.
- Collapsed navigation is 68–76px wide; expanded navigation is 232–264px wide; icon anchors do not jump during expansion.
- At least one contextual control cluster per complex screen is composed as a floating island when useful; do not convert every card into glass.
- Glass surfaces visibly use transparency, blur, edge highlight, and elevation. A merely dark card with a border does not qualify as glass.
- Cards have semantic hierarchy; avoid indiscriminate cards-inside-cards.
- Charts use accessible colors, labels/tooltips, and never communicate meaning by color alone.
- Motion explains state change and remains subtle; reduced-motion disables nonessential animation.
- Press feedback begins immediately; no component locks input while a transition finishes.
- Reversible panels, sheets, popovers, and navigation return along the same spatial path and originate from their trigger.
- Typography uses size-aware tracking and leading; headings, body, labels, and numeric UI are not scaled versions of one identical setting.
- Reduced transparency and increased contrast receive usable fallbacks in addition to reduced motion.
- Every important screen answers where the user is, what they can do, and how to return or exit.
- Key layouts work at 360, 768, 1024, 1440, and wide desktop or agreed breakpoints.
- Touch targets aim for at least 44×44 CSS pixels; icon-only controls include accessible names.
- Loading, empty, error, success, disabled, hover, active, focus, selected, and restricted states are designed.

## Resource routing

- Brand concept and visual principles: [foundations.md](references/foundations.md)
- Complete visual specification: [tokens.md](references/tokens.md)
- Component anatomy and states: [components.md](references/components.md)
- Mandatory floating-island shell, expansion behavior, and implementation: [islands-navigation.md](references/islands-navigation.md)
- Fluid response, springs, spatial continuity, typography craft, and adaptive accessibility: [interaction-craft.md](references/interaction-craft.md)
- Dashboard, CRM, charts, AI, and responsive patterns: [dashboard-crm.md](references/dashboard-crm.md)
- Existing-product conversion: [migration.md](references/migration.md)
- Audit scorecard and report: [audit.md](references/audit.md)
- CSS/React/Tailwind integration: [implementation.md](references/implementation.md)
- Drop-in CSS variables: `assets/wavy-tokens.css`
- Machine-readable tokens: `assets/wavy-tokens.json`
- Static audit helper: `scripts/wavy_audit.py`

## Scope discipline

Do not redesign unrelated areas during a scoped change. Do not replace a functioning chart, table, form, or component library solely for aesthetics if it can be themed safely. Do not add dependencies without a clear benefit and authorization consistent with the task. Prefer incremental, reviewable changes.
