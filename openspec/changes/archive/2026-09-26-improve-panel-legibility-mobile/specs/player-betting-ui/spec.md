# player-betting-ui — Delta

## Purpose

Makes the launch sanctum comfortably readable on desktop and fully ergonomic on touch phones.

## ADDED Requirements

### Requirement: Readability and touch ergonomics

The sanctum's text (labels, balance, hint, message) SHALL be at least 13.5 px, with primary labels at 15 px on desktop. On viewports ≤720 px the sanctum SHALL become a full-width bottom sheet in which every interactive control has a ≥44 px touch target, the primary action button is ≥52 px tall with ≥18 px label, quick-bet chips remain reachable in a horizontally scrollable row, and viewport safe-area insets are respected. Interactive controls SHALL opt out of double-tap zoom delays.

#### Scenario: Comfortable reading on desktop

- **WHEN** the game is viewed at a 1280×800 desktop viewport
- **THEN** the primary labels (Throne Gelt / Bet / Auto-extract) render at ≥15 px and the balance at ≥20 px

#### Scenario: Phone bottom sheet

- **WHEN** the viewport is ≤720 px wide
- **THEN** the sanctum spans the full viewport width, every button and input is at least 44 px tall, and the primary action button is at least 52 px tall with an 18 px label

#### Scenario: Notched-phone safety

- **WHEN** the phone reports safe-area insets (home indicator / notch)
- **THEN** the sheet and integrity toggle keep their content clear of them
