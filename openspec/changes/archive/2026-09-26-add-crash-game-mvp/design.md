# Design: add-crash-game-mvp

## Context

Greenfield client-only web game. Two hard requirements shape everything: (1) cinematic 3D warp flight, (2) pixel-precise 2D HUD. Pixi.js v8 is WebGL/WebGPU-native but poor at true 3D; Three.js is the reverse. The WH40K assets (hive-city plate, gothic torpedo with baked flame) are pre-rendered, so 3D mostly means camera work, particles, and bloom — not modeled geometry.

## Goals / Non-Goals

**Goals**
- Single-page Vite app, TypeScript strict, no framework needed for MVP.
- Deterministic, unit-testable round engine decoupled from renderers.
- 60 fps on a mid-range laptop; graceful mobile portrait.

**Non-Goals**
- Real-money wagering, backend/RNG authority, accounts, payments.
- Multiplayer bots/social feed (fake "others extract" feed can come later).
- WebGPU-only features (Pixi runs WebGL fallback transparently).

## Decisions

### D1. Two stacked canvases (Three below, Pixi above) — chosen over Pixi-only or Three-only
The torpedo is a pre-rendered sprite with baked flame; real 3D adds only starfield/embers/bloom. Pixi v8 can host the HUD with filter-based bloom cheaply and its display list fits HUD layout. Alternative rejected: single Three.js canvas with HTML/CSS HUD — loses Pixi particles + filter pipeline; single Pixi canvas — no real bloom-on-scene and awkward starfield depth.

### D2. Engine is renderer-agnostic and time-based
`CrashEngine` exposes `subscribe(phase|tick|settled)`; multipliers derive from `performance.now()` timestamps, so background-tab throttling cannot cheat or stall settlement (on tab return, elapsed time is applied at once; if it crossed the crash point, the round settles as crashed).

### D3. Provably-fair via SHA-256 chain (WebCrypto)
Seed chain: `S0 = random`, `Si = SHA-256(S(i-1))`; round `n` uses `S(N-n)` + nonce so the chain hash can be pre-committed in UI before play. Formula `crash = floor(97/(1-r))/100` (3% edge), `r` from first 52 bits. Pure function in `engine/fair.ts`, unit-testable with `crypto.subtle` mock or Node's `crypto`.

### D4. Arc as pure function of flight time
Torpedo position `p(t)` = normalized crash-curve arc (bottom-left → top-right, ease-out on Y, linear-ish on X), sampled by both renderers each frame — identical in 3D camera space (unprojected to a plane) and Pixi screen space. No integration, no drift.

### D5. Rocket asset used in both layers
Three.js: textured billboard-plane (alpha map) + additive flame quad + bloom — billboard avoids needing a real model while parallaxing correctly. Pixi: same texture only for the small "torpedo icon" in history/HUD.

### D6. UI via Pixi for game surfaces, plain DOM for text-dense panels
Bet form/verification panel are DOM (accessibility, inputs, i18n) themed by CSS; HUD counters, toasts, history strip, banners are Pixi (particles/filters). A thin `ui/Bridge` syncs engine state into both.

## Risks / Trade-offs

- [Dual canvases cost GPU memory] → cap DPR at 2, pause renderers on `visibilitychange`.
- [Client-side RNG is demo-grade] → spec states demo-only; formula isolated for future server authority.
- [Bloom overdraw on mobile] → quality tier toggle (auto if `devicePixelRatio*width < threshold`).
- [Asset names are opaque hashes] → copy to `public/img/sky-hive.png`, `public/img/torpedo.png` at build setup, keep originals untouched in `assets/`.

## Migration Plan

N/A (greenfield). Archive will promote the three capability specs into `openspec/specs/`.

## Open Questions

- None blocking MVP; future: sound design, session feed of simulated players.
