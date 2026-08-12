# WAVY Design Tokens

Use semantic variables instead of raw values in components. Map an existing system to these roles before replacing styles.

## Brand and themes

- Orange: `#FF831E`; midpoint: `#F45B20`; red: `#DA2F1E`.
- Gradient: `linear-gradient(135deg,#FF831E 0%,#F45B20 48%,#DA2F1E 100%)`.
- Light: canvas `#F5F5F7`, surface `#FFFFFF`, soft `#F8F8FA`, text `#141416`, muted `#68686F`, subtle `#92929A`, border `rgba(15,15,18,.09)`.
- Dark: canvas `#0C0C0E`, surface `#111113`, soft `#141416`, raised `#17171A`, elevated `#1D1D21`, text `#F7F7F8`, muted `#A1A1AA`, subtle `#71717A`, border `rgba(255,255,255,.10)`.
- Starting status colors: success `#22C55E`, warning `#F59E0B`, danger `#EF4444`, info `#3B82F6`; verify contrast in context.

## Typography

Use `Geist, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`. Use tabular figures for KPIs.

| Role | Size/line | Weight |
|---|---|---|
| display | 36/44 desktop, 30/38 compact | 600–650 |
| page title | 28/36 | 600 |
| section | 20/28 | 600 |
| card | 16/24 | 600 |
| body | 14/21 or 15/23 | 400–450 |
| table | 13/20 or 14/20 | 400–500 |
| label/meta | 12/16 | 400–600 |

## Geometry

Use 4px spacing: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80. Standard controls 40px; prominent controls and touch targets 44px.

Radii: chip 10px, field/button 12px, large control 14px, card 16px, feature 20px, island/modal 24px, pill 999px.

## Glass

Dark: `rgba(24,24,28,.72)`, border `rgba(255,255,255,.11)`, blur 20px, shadow `0 18px 50px rgba(0,0,0,.32)`.

Light: `rgba(255,255,255,.78)`, border `rgba(255,255,255,.84)`, blur 22px, shadow `0 16px 45px rgba(24,24,30,.10)`.

Always provide opaque fallback. Avoid blur behind dense or scrolling content.

## Motion and responsive

Press 80–120ms; hover 120–160ms; tabs 180–240ms; modal 220–300ms; navigation 240–320ms; panel 280–360ms; chart 400–600ms. Use `cubic-bezier(.2,.8,.2,1)` or `cubic-bezier(.16,1,.3,1)`. Prefer transform/opacity and support reduced motion.

Use project breakpoints when established. Otherwise start with 480, 768, 1024, 1280, 1536px and test 360, 768, 1024, 1440, and wide desktop.
