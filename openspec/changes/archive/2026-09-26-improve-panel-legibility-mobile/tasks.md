# Tasks: improve-panel-legibility-mobile

## 1. Typography & CSS

- [x] 1.1 Introduce font-size tokens; raise desktop sizes (labels 15px, balance 22px, inputs/chips/button, hint 13.5px)
- [x] 1.2 Mobile bottom sheet: full-width grid layout, ≥44px targets, chips row, 52px action button, safe-area insets, `touch-action: manipulation`

## 2. HUD scaling

- [x] 2.1 `Hud.layoutPositions`: raise floors (multiplier 0.62, caption/status 0.72, banner 0.55) and scale banner/caption/status fonts with viewport

## 3. Validation

- [x] 3.1 `openspec validate improve-panel-legibility-mobile --strict`; unit tests green
- [x] 3.2 Screenshots 1280×800 + 390×844 (betting & flight); smoke green
- [x] 3.3 Archive after green run
