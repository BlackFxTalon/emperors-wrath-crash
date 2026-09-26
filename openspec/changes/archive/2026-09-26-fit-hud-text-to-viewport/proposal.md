# Proposal: fit-hud-text-to-viewport

## Why

On phone widths the phase banner "THE WRATH ASCENDS" overflows the viewport and clips on both sides (letter-spacing makes Cinzel wider than the screen). The same risk exists for status line, captions and toasts.

## What Changes

- Every single-line HUD text (banner, banner sub, caption, status line, toasts) SHALL scale itself down to never exceed the viewport width minus margins.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dual-renderer-presentation`: ADDED requirement "Text fits the viewport".
