# Proposal: improve-panel-legibility-mobile

## Why

The Launch Sanctum labels (Throne Gelt / Bet / Auto-extract) render at 11–13 px italic — hard to read even on desktop (flagged in playtest). On phones the panel is just a squeezed desktop layout: tiny inputs, chips hidden, no touch ergonomics, no safe-area handling.

## What Changes

- Desktop typography pass: labels 13→15 px (less italic-heavy), balance 18→22 px, inputs/chips/button scaled up to comfortable sizes; panel +12 px wider.
- Real mobile layout (≤720 px): full-width bottom sheet, ≥44 px touch targets, chips visible in a scrollable row, auto-extract row compacted, 54 px primary action button, larger hint text, `env(safe-area-inset-*)` support, `touch-action: manipulation`.
- Pixi HUD scaling floors raised so the Warp Charge counter, status line and banners stay readable on narrow portrait screens.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `player-betting-ui`: ADDED requirement "Readability and touch ergonomics".

## Impact

- `src/style.css` (typography, bottom-sheet layout, safe areas), `index.html` (minor: chips row wrapper), `src/render/pixi/Hud.ts` (scale floors).
- No engine or gameplay changes.
