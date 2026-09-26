# dual-renderer-presentation — Delta

## ADDED Requirements

### Requirement: Russian localization and Cyrillic typography

All HUD text (captions, banners, status lines, history, toasts, loading screen) SHALL be in Russian with a grimdark tone, and the typeface stack SHALL render Cyrillic natively (display face for banners and titles, serif face for numerals and hints) without falling back to system defaults.

#### Scenario: Cyrillic banner renders in the display face

- **WHEN** the phase banner «ГНЕВ ВОСХОДИТ» renders during flight
- **THEN** it uses the Cyrillic-capable display typeface and fits the viewport

## MODIFIED Requirements

### Requirement: Grimdark art direction

Visuals SHALL follow the WH40K palette (blood red `#8a0303`, bone gold `#c9a227`, void black `#0a0908`, purity white), gothic serif typography with native Cyrillic support for Russian text, and bloom/emissive treatment on the warp flame; no cartoonish elements.

#### Scenario: Palette compliance

- **WHEN** any HUD or 3D accent color is applied
- **THEN** it derives from the defined palette tokens

#### Scenario: Cyrillic text renders in themed faces

- **WHEN** Russian HUD text is displayed
- **THEN** it renders in the themed Cyrillic-capable faces, not a generic system fallback
