# Proposal: localize-ui-ru

## Why

The product's audience is Russian-speaking; all user-facing strings are currently English, and the gothic typefaces in use (Cinzel, IM Fell English) have no Cyrillic — Russian text would silently fall back to system fonts and break the art direction.

## What Changes

- All user-facing strings (HUD, banners, toasts, launch sanctum, integrity panel, loading screen) become Russian in a grimdark WH40K tone.
- Typography switches to Cyrillic-capable faces that keep the imperial look: Ruslan Display (display/banners/button), Cormorant (numerals, labels, hints) — Google Fonts, cyrillic subsets.
- Engine rejection reasons become stable codes (`window_closed`, `insufficient`, …); the betting panel maps codes to Russian copy. This keeps the domain layer language-free.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `player-betting-ui`: ADDED requirement "Russian localization"; MODIFIED requirements "Bet placement", "Cash-out control" (example strings now Russian).
- `dual-renderer-presentation`: ADDED requirement "Russian localization and Cyrillic typography"; MODIFIED requirement "Grimdark art direction".

## Impact

- `index.html` (lang, title, fonts, static labels), `src/style.css` (font tokens), `src/render/pixi/Hud.ts`, `src/ui/bettingPanel.ts`, `src/ui/integrityPanel.ts`, `src/engine/CrashEngine.ts` (reason codes) + test updates, `README.md` (Russian).
