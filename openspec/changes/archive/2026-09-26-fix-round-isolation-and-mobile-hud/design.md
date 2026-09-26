# Design: fix-round-isolation-and-mobile-hud

## Context

`prep` (the next round's commit + crash point) is produced asynchronously. The reveal-chain fix serialized reveal→prepare, but the resolved preparation was never assigned back into the engine — `launch()` kept seeing the stale object. Mobile HUD issues are layout-level.

## Goals / Non-Goals

**Goals**
- Engine: impossible to launch on stale preparation, enforced by a regression test with a nonce-varying fair.
- HUD: nothing important hidden on phones.

**Non-Goals**
- Server-authoritative RNG (already a documented non-goal).
- Persisting history beyond a session.

## Decisions

### D1. `prep = null` on consumption, chain assigns fresh prep — chosen over "prepVersion" guards
`doCrash` reads commit/crash point, then nulls `prep`. The reveal chain ends with `prepareNextRound().then((p) => (prep = p))`. Phase transitions already gate on `prep` being non-null, so stale launch becomes structurally impossible. Simpler than version counters; the regression test proves behavior.

### D2. Bottom inset via ResizeObserver → `Hud.setBottomInset(px)`
The DOM sheet's height is the source of truth; observing it (not polling) keeps per-frame work at zero. `layoutPositions` subtracts the inset from stage height for banner/status/toast anchors.

### D3. History: drag-pan, not pagination
Chips compact to 12 px font; strip holds 12 and pans by pointer drag with clamped offset. Newest stays at the head, matching crash-games conventions.

## Risks / Trade-offs

- [Drag on strip may conflict with page scroll] → page doesn't scroll (fixed layout); strip captures pointer only.
- [Holding CRASHED a few extra ms when prep is slow] → reveal+sha256 is single-digit ms in practice.

## Migration Plan

None.

## Open Questions

None.
