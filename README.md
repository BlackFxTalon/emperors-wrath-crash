# Emperor's Wrath — Warp Charge Crash

iGaming crash-game MVP in a Warhammer 40,000 grimdark style. A gothic torpedo climbs
into the burning sky while the **Warp Charge** (multiplier) rises — extract your soul
(cash out) before the **Warp Rift** tears it apart.

Built with **Three.js** (3D scene, bottom layer) + **Pixi.js v8** (HUD, top layer),
Vite and strict TypeScript. Spec-driven development via [OpenSpec](./openspec/).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle in dist/
npm run preview    # serve the build
npm test           # engine unit tests (vitest)
npm run spec:validate
node tests/smoke.mjs   # headless full-round smoke test (builds required)
```

## How to play

1. During **BETTING** (8 s countdown) set a bet and press **ARM TORPEDO**.
2. During **FLYING** the multiplier grows exponentially: `m(t) = 2^(t/12s)`.
3. Press **EXTRACT** (or let auto-extract trigger) to lock `bet × multiplier`.
4. At the hidden crash point the torpedo is consumed by the Warp — unsettled bets are lost.

Demo credits only. Balance persists in `localStorage`.

## Provably fair (demo)

Before each round the engine commits a SHA-256 hash; after the crash the seed is revealed:

```
r     = first 52 bits of SHA-256(serverSeed + ":" + nonce) / 2^52   — uniform [0, 1)
crash = clamp( floor(97 / (1 − r)) / 100, 1.00, 5000.00 )
```

3 % house edge, ≈ 3 % of rounds crash instantly at x1.00, `P(crash ≥ x) ≈ 0.97 / x`.
Seed chain: `S(n+1) = SHA-256(S(n))`, so the whole session is verifiable offline.
**Demo-grade only** — a production title must move RNG authority to a server.

The **INTEGRITY** panel (bottom right) shows the next round's commitment and the
last played round's seed with a recomputed crash point.

## Architecture

```
src/
  engine/        renderer-agnostic round engine (state machine, fair RNG, multiplier clock)
  render/three/  Three.js scene: hive-city backdrop, starfield, torpedo, warp trail, crash FX
  render/pixi/   Pixi HUD: multiplier counter, banners, history strip, toasts, vignette
  ui/            DOM panels (betting, balance persistence, integrity) + engine bridge
tests/           vitest unit tests + Playwright smoke test
```

The flight path is a pure function of flight time (`src/render/arc.ts`) shared by both
renderers, so the 3D scene and the HUD can never drift apart. The Pixi ticker is the
single RAF clock that also steps the engine.

## WH40K glossary

| Term | Meaning |
| --- | --- |
| Warp Charge | the multiplier |
| Throne Gelt | demo credits |
| Arm the torpedo | place a bet |
| Extraction | cash out |
| Warp Rift | the crash |
| Launch Sanctum | betting panel |
| Omnitssiah's Seal | provably-fair panel |

The Emperor protects.
