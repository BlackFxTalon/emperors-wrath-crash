# Proposal: clarify-action-control-state

## Why

Playtesting showed the action button's six states confuse players: it is never clear *why* the button is inert (already extracted / no bet armed / round over) or that a launch window is counting down. Each moment of confusion is a missed bet — the core loop's most painful failure.

## What Changes

- The action button label always carries phase context: a live countdown during BETTING ("ARM TORPEDO · 5.2s"), stake info when armed, current multiplier during flight.
- A one-line hint appears under the button whenever it cannot accept a useful input, explaining why ("You extracted at x1.53 — payout locked", "No bet was armed for this flight", "Torpedo lost — next window opens soon").
- The Launch Sanctum panel carries a phase accent: gold while waiting, pulsing red during flight, dark after the rift — visible in peripheral vision.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `player-betting-ui`: new requirement "Action control state feedback" (the button/panel must self-explain its state at all times).

## Impact

- `src/ui/bettingPanel.ts` (labels, hint element, phase data-attribute), `index.html` (hint element), `src/style.css` (phase accents, hint styles).
- No engine changes — everything derives from existing `tick`/`phase`/`extraction`/`crash` events.
