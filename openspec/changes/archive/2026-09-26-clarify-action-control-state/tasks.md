# Tasks: clarify-action-control-state

## 1. Markup & styles

- [ ] 1.1 `index.html`: add `#action-hint` line under `#action-button`; give `#bet-panel` a `data-phase` attribute hook
- [ ] 1.2 `src/style.css`: phase accents for `data-phase="BETTING|FLYING|CRASHED"` (gold idle / red pulse flight / dark crashed), `#action-hint` typography, `prefers-reduced-motion` guard

## 2. Panel logic

- [ ] 2.1 `src/ui/bettingPanel.ts`: track `lastExtraction` (multiplier, payout) and `lostStake` from engine events; set `data-phase` on panel
- [ ] 2.2 Label matrix per state (countdown on idle button, stake on recall, live multiplier on extract, state nouns otherwise) with 2-decimal change gating for EXTRACT
- [ ] 2.3 Hint copy per inert state (extracted+locked payout / no stake / rift+loss) — always present when disabled

## 3. Validation

- [ ] 3.1 `openspec validate clarify-action-control-state --strict` green; unit tests untouched-green
- [ ] 3.2 Smoke: assert hint exists and is populated while button inert during flight without bet; screenshot desktop + mobile
- [ ] 3.3 `openspec archive clarify-action-control-state` after green run
