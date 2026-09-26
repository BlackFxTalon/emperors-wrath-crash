# Design: clarify-action-control-state

## Context

The betting panel already receives every engine event (`tick` with countdown, `phase`, `extraction`, `crash`, `armed`, `betCancelled`). The confusion is purely presentational — no engine changes needed.

## Goals / Non-Goals

**Goals**
- Zero-ambiguity button: label says what it does now; hint says why it does nothing.
- Phase readable peripherally (panel accent), not just by reading text.

**Non-Goals**
- Sound/haptics, tutorial overlay, i18n.
- Changes to the Pixi HUD (banners already carry phase).

## Decisions

### D1. Derive everything in `BettingPanel` from existing events — chosen over new engine API
`tick` already carries `countdown`, `multiplier`, and full bet state; `extraction` carries multiplier + payout. Storing two small fields (`lastExtraction`, `lostStake`) in the panel avoids touching the tested engine.

### D2. Countdown lives in the button label, not a separate element
The button is the attention magnet during BETTING; a separate timer splits focus. Label format: `ARM TORPEDO · 7.4s`. When a bet is armed the countdown yields priority: `RECALL TORPEDO · 100.00` (the recall decision matters more; the countdown remains visible via the status line on the HUD).

### D3. Panel accent via `data-phase` attribute + CSS
`#bet-panel[data-phase="FLYING"]` toggles a red inset glow + animated border pulse; CRASHED darkens gold accents. Pure CSS keeps JS to a `setAttribute`.

### D4. Hint is a persistent element, not toasts
The `#bet-message` line already exists (error/rejection path). A separate always-present `#action-hint` line under the button carries the *state* explanation; rejections keep using `#bet-message` so errors never overwrite state hints.

## Risks / Trade-offs

- [Label churn every tick during flight] → EXTRACT label updates only when the 2-decimal multiplier string changes.
- [Accent pulse may distract] → animation is a slow 1.6 s ease, low amplitude, disabled under `prefers-reduced-motion`.

## Migration Plan

None — additive UI.

## Open Questions

None.
