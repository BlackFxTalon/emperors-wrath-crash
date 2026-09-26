# dual-renderer-presentation — Delta

## Purpose

Keeps the HUD informative on narrow screens: history must stay reachable and no DOM overlay may hide game text.

## ADDED Requirements

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
