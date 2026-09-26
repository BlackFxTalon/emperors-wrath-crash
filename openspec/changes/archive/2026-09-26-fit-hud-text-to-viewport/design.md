# Design: fit-hud-text-to-viewport

## Context

Pixi Text does not auto-fit: with a fixed 10 px letter-spacing, Cinzel 900 at ~30 px renders "THE WRATH ASCENDS" ≈ 550 px — wider than a 390 px phone. Font-size floors alone cannot guarantee fit because letter-spacing scales differently.

## Decisions

### D1. Uniform horizontal+vertical scale after layout — chosen over shrinking letter-spacing or font search
After setting font size, measure `text.width`; if it exceeds `W − margin`, set `text.scale = maxW / width`. One helper `fitToWidth(text, maxW)`, applied to banner, banner sub, caption, status line and toast texts. Uniform scale preserves the grimdark look; letter-spacing surgery per style would need per-style knowledge for no visual gain.

### D2. Fit applied in `layoutPositions` every frame
Measurement is a cached width read (Pixi recomputes only when style/text changes), and `scale` assignment is cheap. Toast texts fit once at creation.

## Risks / Trade-offs

- [Slight vertical shrink on very long strings] — uniform scale keeps glyphs undistorted; acceptable.
