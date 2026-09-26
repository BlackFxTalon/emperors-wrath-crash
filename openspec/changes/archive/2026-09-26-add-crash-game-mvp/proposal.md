# Proposal: add-crash-game-mvp

## Why

We want a playable iGaming crash-game MVP ("Emperor's Wrath") that demonstrates a full round loop — bet → flight → cash-out or warp-rift crash — rendered in a cinematic Warhammer 40K grimdark style. It will serve as the visual/technical foundation for a production title.

## What Changes

- Add a Vite + TypeScript web app with a dual-renderer architecture: Three.js (bottom canvas, 3D) + Pixi.js v8 (top transparent canvas, 2D HUD & particles).
- Add a client-side crash round engine: state machine (BETTING → FLYING → CRASHED → SETTLED), exponential multiplier growth, SHA-256 hash-chain provably-fair crash point (demo, no server).
- Add 3D presentation: parallax starfield over the gothic hive-city background, gothic torpedo flying an ascending arc with warp-flame trail and bloom.
- Add 2D HUD: giant Warp Charge (multiplier) counter, round-phase banners, win/lose toasts, past-rounds history strip — all grimdark styled (blood red / bone gold on void black, gothic serif).
- Add betting UI: balance (demo credits), bet amount, auto-extraction threshold, cash-out button, provably-fair hash disclosure per round.
- Wire existing assets: `assets/exec-24e53c03-…png` (background) and `assets/exec-544be0c1-…png` (torpedo).

## Capabilities

### New Capabilities

- `crash-round-engine`: deterministic round lifecycle, multiplier curve, provably-fair crash point, cash-out settlement.
- `dual-renderer-presentation`: layered Three.js/Pixi.js rendering, scene states per round phase, asset pipeline.
- `player-betting-ui`: bet placement, balance, auto-extraction, HUD feedback, round history.

### Modified Capabilities

None (greenfield).

## Impact

- New `src/` tree (engine, render, ui modules), `index.html`, Vite config, package.json deps: `pixi.js@^8`, `three`, `vite`, `typescript`.
- No backend; all RNG client-side (demo-only, documented).
