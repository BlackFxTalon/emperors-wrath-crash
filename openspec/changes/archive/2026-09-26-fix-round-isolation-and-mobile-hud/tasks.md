# Tasks: fix-round-isolation-and-mobile-hud

## 1. Engine

- [x] 1.1 `doCrash`: capture commit/crash point, null `prep`; reveal→prepare chain assigns resolved prep into the engine
- [x] 1.2 Regression test: nonce-varying fair, five rounds → distinct crash points; launch holds until fresh prep

## 2. HUD

- [x] 2.1 History: compact chips (12px), cap 12, drag-pan with clamped offset
- [x] 2.2 `Hud.setBottomInset(px)`; banner/status/toasts anchor within usable area
- [x] 2.3 `main.ts`: ResizeObserver on `#bet-panel` feeds the inset

## 3. Validation

- [x] 3.1 `openspec validate fix-round-isolation-and-mobile-hud --strict`; all tests green
- [x] 3.2 Mobile screenshots: history strip reachable, banner above sheet
- [x] 3.3 Archive after green run
