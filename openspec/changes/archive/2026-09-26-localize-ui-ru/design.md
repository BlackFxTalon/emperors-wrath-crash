# Design: localize-ui-ru

## Context

Single-language MVP; strings are scattered across index.html, BettingPanel, IntegrityPanel, Hud and (as human phrases) the engine. Fonts lack Cyrillic.

## Decisions

### D1. Inline Russian strings + engine reason codes — chosen over an i18n framework
One locale, one market: a dictionary layer adds indirection without value yet. The only structural change: engine `rejected` events now carry stable codes; the panel owns the wording. When EN returns, a `strings.ts` map per locale drops in without touching call sites again.

### D2. Ruslan Display (display) + Cormorant (text/numerals) — Cyrillic-capable Google Fonts
Ruslan Display keeps the imperial-eagle WH40K flavor for banners/button/headers. Cormorant (500–700, italic) carries numerals, labels and hints — elegant, readable at 15 px+, full Cyrillic. Cinzel/IM Fell are dropped (no Cyrillic).

### D3. Font-loading gate updated
`waitForFonts` loads the new faces with a Cyrillic probe string before Pixi text creation; fallback chain `Georgia` stays.

## Risks / Trade-offs

- [Ruslan Display is very decorative] — used only for display surfaces (banners, button, headers), never for hints/numbers.
- [Engine test updates] — rejection assertions switch from phrase matching to codes.

## Migration Plan

None (UI-only).

## Open Questions

None.
