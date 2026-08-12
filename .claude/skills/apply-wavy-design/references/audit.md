# WAVY Design Audit

## Evidence

Prefer live flow/screenshots, then rendered local app, Figma/user screenshots, then code/static analysis. Code alone cannot prove fidelity, contrast, clipping, motion, or keyboard behavior. State limits.

## Scorecard

Score each category 0–5 and weight: brand/themes 15; hierarchy 15; components 15; charts 10; navigation/workflow 15; responsive 10; accessibility 15; motion/feedback 5.

- 90–100: WAVY ready.
- 75–89: strong with targeted corrections.
- 60–74: recognizable but inconsistent.
- 40–59: partial skin; structural migration needed.
- Below 40: disconnected.

A critical accessibility/workflow failure remains a blocker regardless of average.

## Checklist

- Correct theme layers, white light mode, charcoal dark mode, restrained gradient/glass/glow.
- Obvious primary task, clear global/local navigation, correct density, no nested-card excess.
- Consistent typography, tabular data, radius hierarchy, full interaction/state coverage.
- Correct chart type, units/period, accessible encoding, distinct missing/zero states.
- Clear active filters/actions, preserved input on error, honest loading/AI status.
- Key widths without clipping; logical visible keyboard focus; sufficient targets; reduced motion.

## Severity

Critical blocks tasks or creates serious accessibility/data/destructive risk. High materially slows primary workflow or breaks major consistency. Medium is localized usability/state inconsistency. Low is polish.

Prioritize by impact × frequency × reach × implementation leverage.

## Report

Lead with verdict, score, evidence, and limits. Then release blockers, highest-impact changes, category scorecard, and numbered findings. Each finding must contain severity, evidence, current behavior, violated WAVY rule, exact recommendation, and acceptance test.

If implementing, sequence foundations → shell → primitives → patterns → charts/states → motion/QA.
