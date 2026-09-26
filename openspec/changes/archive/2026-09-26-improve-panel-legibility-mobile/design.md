# Design: improve-panel-legibility-mobile

## Context

The sanctum panel was styled desktop-first at 300 px with 11–13 px italic type; the ≤720 px media query merely squeezed it and hid the chips. Playtest flagged the labels as unreadable and the mobile layout as an afterthought.

## Goals / Non-Goals

**Goals**
- One scale system: desktop is comfortable, mobile is touch-first — no separate "mobile theme".
- Zero JS for layout (pure CSS media queries + safe areas); HUD scaling stays in `Hud.layoutPositions`.

**Non-Goals**
- Landscape-phone special-casing (media query covers it; the scene crops gracefully).
- Re-skinning the 3D scene or re-theming colors.

## Decisions

### D1. Bottom sheet via CSS only
`@media (max-width: 720px)` turns `#bet-panel` into a fixed full-width sheet with a 2-column grid (bet | auto) and a full-width action row. Chips move under the input in a single scrollable row (`overflow-x: auto`, no scrollbar).

### D2. Typography tokens instead of per-rule sizes
Introduce `--fs-label: 15px; --fs-hint: 13.5px; --fs-balance: 22px;` and reference them; the mobile query overrides the tokens once. Avoids 10 scattered hard-coded px values drifting again.

### D3. HUD floors raised, not a new layout
`layoutPositions` keeps one proportional scale `s` but with higher floors (multiplier 0.62, caption/status 0.72, banner 0.55) and slightly larger base sizes for status line on small screens. Portrait still uses the same centered composition.

### D4. Safe areas + input ergonomics
`padding-bottom: calc(... + env(safe-area-inset-bottom))` on the sheet; `touch-action: manipulation` on buttons/inputs; numeric `inputmode` already set in markup; 16 px input font on mobile prevents iOS focus-zoom.

## Risks / Trade-offs

- [Sheet may cover more scene on small phones] → compact rows (bet/auto side-by-side) keep it ≈200 px tall; the scene reads behind it.
- [Token refactor touches many rules] → mechanical, verified by screenshots at 1280/390.

## Migration Plan

Additive CSS; no stored state.

## Open Questions

None.
