# player-betting-ui — Delta

## Purpose

Lets the player arm a bet before launch, extract during flight (manually or by auto-threshold), manage a persistent demo balance, and verify each round's fairness, with grimdark-themed inline feedback.

## ADDED Requirements

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
