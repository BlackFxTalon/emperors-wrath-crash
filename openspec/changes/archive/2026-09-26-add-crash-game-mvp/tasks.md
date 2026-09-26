# Tasks: add-crash-game-mvp

## 1. Project setup

- [x] 1.1 Scaffold Vite + TypeScript (strict) app; add `pixi.js@^8`, `three`, `vitest`; scripts `dev/build/test`
- [x] 1.2 Copy assets to `public/img/` (`sky-hive.png`, `torpedo.png`); `index.html` with stacked canvases `#three` + `#pixi`, grimdark loading screen
- [x] 1.3 Theme foundation: CSS tokens (palette `#8a0303 / #c9a227 / #0a0908 / #f5f0e6`), gothic serif webfont (Cinzel via Google Fonts, offline-safe fallback `Georgia`)

## 2. Crash round engine (renderer-agnostic)

- [x] 2.1 `engine/state.ts`: phase enum + `RoundState` types; `engine/CrashEngine` state machine with `betting(8s) → flying → crashed(4s) → betting`, subscriber events (`phase`, `tick`, `settled`)
- [x] 2.2 `engine/fair.ts`: SHA-256 seed chain + `crashFromSeed(serverSeed, nonce)` (52-bit `r`, `floor(97/(1-r))/100`, clamp ≥1.00, cap 5000x); property tests: distribution sanity, verification round-trip
- [x] 2.3 Multiplier clock: `multiplierAt(elapsedMs) = 1.0024^(ms/100)`, monotonic, frame-rate independent; catch-up settlement on tab return
- [x] 2.4 Bet ledger: arm bet at launch, lock payout at cash-out target, credit wins, void on crash; unit tests for settle ordering (cash-out wins even at crash-boundary frame)

## 3. Three.js scene

- [x] 3.1 Renderer setup: alpha-under layer, DPR cap 2, resize handling, `visibilitychange` pause
- [x] 3.2 Background: hive-city plate as parallax backdrop (subtle camera drift + slow zoom-in during FLYING), starfield points layer
- [x] 3.3 Torpedo: billboard plane with `torpedo.png` (alpha), launch cradle idle (BETTING), arc flight `p(t)` (FLYING)
- [x] 3.4 FX: additive warp-flame trail (ribbon + embers), UnrealBloom, crash detonation (flash, shockwave ring, debris burst), red frozen trail after crash

## 4. Pixi.js HUD

- [x] 4.1 Pixi app init (transparent, top layer), shared `p(t)` mapping to screen space, quality tier detection
- [x] 4.2 Warp Charge counter: giant gothic numerals with gold gradient + pulse scaling with multiplier speed; phase banners ("COMMENCE EXTRACTION" / "WARP RIFT — TORPEDO LOST")
- [x] 4.3 Warp trail glow overlay on Pixi side + embers particle field; crash screen shake + red vignette
- [x] 4.4 History strip (last 20 crash points, color-coded) + win/lose toasts ("SOUL SAVED — x2.31" / "CONSUMED BY THE WARP — x0.00")

## 5. Betting UI (DOM + bridge)

- [x] 5.1 Bet panel: amount input + chips (10/50/100/500), arm/cancel before launch, EXTRACT button during flight, auto-extract input; reject FLYING-phase bets with inline message
- [x] 5.2 Balance service: default 1000.00, `localStorage` persistence, debounce writes
- [x] 5.3 Integrity panel: round hash ticker, server seed + nonce disclosure, formula text with recomputed crash point for last round

## 6. Integration & polish

- [x] 6.1 Wire `Bridge` (engine → Three scene, Pixi HUD, DOM panels); loading gate until assets resolve; fallback gradient/box on asset failure
- [x] 6.2 Responsive pass: portrait layout (HUD scales, bet panel bottom-sheet), min viewport 360px
- [x] 6.3 Performance pass: frame budget check (60 fps mid-tier), particle pooling, renderer warm-up
- [x] 6.4 README: run instructions, provably-fair formula explainer, WH40K term glossary

## 7. Validation

- [x] 7.1 `openspec validate add-crash-game-mvp --strict` green; engine unit tests green
- [x] 7.2 Manual checklist vs scenarios in all three specs (betting lockout, extraction at threshold, crash presentation, resize, persistence)
- [x] 7.3 `openspec archive add-crash-game-mvp` after acceptance
