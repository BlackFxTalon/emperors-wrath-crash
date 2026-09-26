# player-betting-ui Specification

## Purpose
Lets the player arm a bet before launch, extract during flight (manually or by auto-threshold), manage a persistent demo balance, and verify each round's fairness, with grimdark-themed inline feedback.

## Requirements

### Requirement: Bet placement

The UI SHALL allow the player to set a bet amount (input + quick chips) during `BETTING` and queue exactly one bet per round; bet requests during `FLYING`/`CRASHED` SHALL be rejected with an inline grimdark message ("The torpedo has already launched, Guardsman.").

#### Scenario: Valid bet accepted
- **WHEN** the player commits a bet ≤ balance during `BETTING`
- **THEN** balance is debited immediately and the bet is shown as armed for the round

#### Scenario: Insufficient funds
- **WHEN** the player commits a bet exceeding the balance
- **THEN** the bet is rejected and the balance remains unchanged

### Requirement: Cash-out control

During `FLYING` with an active bet, a prominent EXTRACT button SHALL cash out at the current multiplier; an optional auto-extract threshold (e.g., 2.00x) SHALL be settable before launch and SHALL trigger without frame-timing drift beyond one animation frame.

#### Scenario: Manual extraction
- **WHEN** the player presses EXTRACT during flight
- **THEN** the payout toast ("SOUL SAVED — x2.31") appears and the button becomes disabled for the rest of the flight

#### Scenario: Auto extraction
- **WHEN** the current multiplier reaches the auto-extract threshold while flying
- **THEN** cash-out settles within one frame of the threshold crossing

### Requirement: Balance and feedback

The UI SHALL maintain a demo credit balance (default 1 000.00), persist it in `localStorage`, and show win/lose toasts plus a history strip of the last ~20 crash points (color-coded: ≥10x gold, ≥2x red, <2x grey).

#### Scenario: Balance persistence
- **WHEN** the page is reloaded
- **THEN** the last balance is restored from `localStorage`

#### Scenario: History strip
- **WHEN** a round crashes
- **THEN** its crash multiplier is prepended to the history strip with phase-appropriate styling

### Requirement: Provably-fair disclosure

Each round the UI SHALL display the truncated round hash and provide a way to open a verification panel showing `serverSeed`, `nonce`, and the formula so the crash point can be recomputed manually.

#### Scenario: Verification panel
- **WHEN** the player opens the integrity panel for a finished round
- **THEN** seed, nonce, and recomputed crash point are shown and match the round result

### Requirement: Action control state feedback

The action control SHALL display a phase-appropriate primary label at all times: a live countdown during `BETTING` with no armed bet (e.g. "ARM TORPEDO · 5.2s"), the armed stake during `BETTING` with a bet ("RECALL TORPEDO · 100.00"), the live multiplier during `FLYING` with an active bet, and a short state noun otherwise. Whenever the control cannot accept a useful input, a one-line hint SHALL be rendered adjacent to it stating the reason and the player's stake outcome. The sanctum panel SHALL carry a visible phase accent (idle = gold, flight = pulsing red, crashed = dark red) readable in peripheral vision.

#### Scenario: Countdown on the idle button

- **WHEN** the round is in `BETTING` with no bet armed
- **THEN** the button label includes the seconds remaining until launch, updating at least once per second

#### Scenario: Reason hint while inert

- **WHEN** the button is disabled after the player extracted, after launching without a bet, or after a crash
- **THEN** the hint line names the cause and, where applicable, the player's locked payout or loss

#### Scenario: Phase accent

- **WHEN** the phase changes between `BETTING`, `FLYING`, and `CRASHED`
- **THEN** the panel accent switches to the matching phase style without requiring the player's attention

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
