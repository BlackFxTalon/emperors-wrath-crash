# dual-renderer-presentation — Delta

## Purpose

No HUD line may ever be clipped by the viewport, whatever the screen width.

## ADDED Requirements

### Requirement: Text fits the viewport

Every single-line HUD text (phase banner, banner sub-line, counter caption, status line, toasts) SHALL measure itself against the available width and scale down so that it never exceeds the viewport minus a small margin, regardless of font size or letter spacing.

#### Scenario: Banner on a narrow phone

- **WHEN** the phase banner renders at a 390 px viewport
- **THEN** its rendered width is at most the viewport minus margins, with no clipping on either side
