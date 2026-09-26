# Proposal: fix-round-isolation-and-mobile-hud

## Why

Playtesting on a phone exposed three defects:

1. **Critical (gameplay):** after the first crash, the round engine kept flying with the *first* round's crash point and commit — every subsequent round crashed at the same value (observed: four consecutive x1.16 rounds). Root cause: the next-round preparation (`prep`) resolved into a discarded promise; `launch()` kept reusing the stale preparation object. This makes the game unwinnable and breaks provably-fair round isolation.
2. **HUD:** the history strip hard-clips chips beyond ~260 px — on phones only ~4 past multipliers are ever visible.
3. **HUD:** Pixi banners/status text anchor to the full viewport and render behind (or clipped by) the mobile bottom sheet.

## What Changes

- **Engine:** `doCrash` consumes the round preparation (`prep = null`) and the reveal→prepare chain assigns the *new* preparation into the engine; phases hold until it is ready. Regression test with a nonce-varying fair provider asserts successive rounds use distinct crash points.
- **HUD history:** compact chips, cap 12, horizontally drag-pannable strip (newest first).
- **HUD layout:** a bottom inset (fed from the DOM sheet via `ResizeObserver`) shrinks the usable stage area — banners, status and toasts anchor above the sheet instead of behind it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `crash-round-engine`: ADDED requirement "Round preparation isolation".
- `dual-renderer-presentation`: ADDED requirements "History strip completeness" and "No HUD occlusion by DOM overlays".

## Impact

- `src/engine/CrashEngine.ts` (+ regression test), `src/render/pixi/Hud.ts`, `src/main.ts` (ResizeObserver bridge).
- No asset, build or dependency changes.
