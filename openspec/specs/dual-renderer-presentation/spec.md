# dual-renderer-presentation Specification

## Purpose
Renders the game as two stacked canvases — Three.js beneath for the 3D warp-flight scene, Pixi.js above for the 2D HUD — driven by shared phase state and a frame-rate-independent flight arc, in the Warhammer 40K grimdark art direction.

## Requirements

### Requirement: Layered canvases

The app SHALL render Three.js WebGL content on a bottom canvas and Pixi.js v8 content on a transparent top canvas, stacked full-viewport; pointer events SHALL pass through the 3D canvas, and resize SHALL re-project both renderers without visual misalignment of the torpedo flight line vs. HUD anchors.

#### Scenario: Compositing order
- **WHEN** both scenes render a frame
- **THEN** the HUD (Pixi) is never occluded by the 3D scene

#### Scenario: Resize
- **WHEN** the viewport is resized (or rotated on mobile)
- **THEN** both renderers resize to the new viewport with correct aspect ratio and no blank borders

### Requirement: Phase-driven 3D scene

The 3D scene SHALL reflect the round phase: `BETTING` shows the idling torpedo at its launch cradle over the hive-city backdrop with drifting embers; `FLYING` shows the torpedo climbing an accelerating arc leaving a warp-flame trail toward the sky rift; `CRASHED` shows a warp-rift detonation (flash + shockwave + debris) and the torpedo removed.

#### Scenario: Flying arc matches multiplier
- **WHEN** the multiplier grows during `FLYING`
- **THEN** torpedo screen-position follows the standard crash-game arc (bottom-left launch, curving toward top-right) as a pure function of time, not frame-rate

#### Scenario: Crash presentation
- **WHEN** the crash point is reached
- **THEN** within one frame the detonation plays, the trail freezes red, and "WARP RIFT" styling is triggered for HUD

### Requirement: Asset pipeline

The build SHALL load `assets/exec-24e53c03-5929-4076-b107-b82514f5597f.png` as the parallax background plate (Three.js textured plane or scene backdrop) and `assets/exec-544be0c1-1085-401e-ac5c-5c69d5dcf75b.png` as the torpedo sprite/texture; a loading screen SHALL gate the game until both assets are ready, with a fallback color scheme if any asset fails to load.

#### Scenario: Loading gate
- **WHEN** the page opens
- **THEN** a grimdark loading screen ("Communing with the Astronomican…") is shown until assets resolve, then the `BETTING` phase becomes visible

#### Scenario: Missing asset fallback
- **WHEN** an asset fails to load
- **THEN** the game still runs with procedural fallbacks (gradient sky, box torpedo) and a console warning

### Requirement: Grimdark art direction

Visuals SHALL follow the WH40K palette (blood red `#8a0303`, bone gold `#c9a227`, void black `#0a0908`, purity white), gothic serif typography with native Cyrillic support for Russian text, and bloom/emissive treatment on the warp flame; no cartoonish elements.

#### Scenario: Palette compliance
- **WHEN** any HUD or 3D accent color is applied
- **THEN** it derives from the defined palette tokens

#### Scenario: Cyrillic text renders in themed faces

- **WHEN** Russian HUD text is displayed
- **THEN** it renders in the themed Cyrillic-capable faces, not a generic system fallback

### Requirement: History strip completeness

The history strip SHALL keep the newest crash point first, preserve at least the last 12 results for interaction, render compactly enough that several are visible at phone widths, and support horizontal drag-panning to reach older entries.

#### Scenario: Older entries reachable on phone

- **WHEN** more crash points have occurred than fit the viewport width
- **THEN** the strip can be dragged horizontally to reveal them and the newest entry remains at the head

### Requirement: No HUD occlusion by DOM overlays

The Pixi HUD SHALL treat DOM overlay panels (mobile bottom sheet) as reserved area: banners, status line and toasts SHALL anchor within the remaining stage area so they are never rendered behind an opaque overlay.

#### Scenario: Banner above the mobile sheet

- **WHEN** the bottom sheet occupies part of the viewport on a phone
- **THEN** the phase banner and status line render fully above it, with no clipped or occluded text

### Requirement: Text fits the viewport

Every single-line HUD text (phase banner, banner sub-line, counter caption, status line, toasts) SHALL measure itself against the available width and scale down so that it never exceeds the viewport minus a small margin, regardless of font size or letter spacing.

#### Scenario: Banner on a narrow phone

- **WHEN** the phase banner renders at a 390 px viewport
- **THEN** its rendered width is at most the viewport minus margins, with no clipping on either side

### Requirement: Russian localization and Cyrillic typography

All HUD text (captions, banners, status lines, history, toasts, loading screen) SHALL be in Russian with a grimdark tone, and the typeface stack SHALL render Cyrillic natively (display face for banners and titles, serif face for numerals and hints) without falling back to system defaults.

#### Scenario: Cyrillic banner renders in the display face

- **WHEN** the phase banner «ГНЕВ ВОСХОДИТ» renders during flight
- **THEN** it uses the Cyrillic-capable display typeface and fits the viewport
