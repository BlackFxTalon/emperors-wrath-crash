# player-betting-ui — Delta

## ADDED Requirements

### Requirement: Russian localization

All sanctum-facing text (labels, button labels, hints, rejection messages, toasts) SHALL be in Russian with a grimdark Warhammer 40K tone; rejection reasons SHALL travel as stable codes from the engine and be worded in the UI layer.

#### Scenario: Rejection in Russian

- **WHEN** the player attempts to bet during flight
- **THEN** the panel shows the Russian inline message mapped from the engine's rejection code

## MODIFIED Requirements

### Requirement: Bet placement

The UI SHALL allow the player to set a bet amount (input + quick chips) during `BETTING` and queue exactly one bet per round; bet requests during `FLYING`/`CRASHED` SHALL be rejected with an inline Russian grimdark message (e.g. «Торпеда уже стартовала, гвардеец.»).

#### Scenario: Valid bet accepted

- **WHEN** the player commits a bet ≤ balance during `BETTING`
- **THEN** balance is debited immediately and the bet is shown as armed for the round

#### Scenario: Insufficient funds

- **WHEN** the player commits a bet exceeding the balance
- **THEN** the bet is rejected and the balance remains unchanged

### Requirement: Cash-out control

During `FLYING` with an active bet, a prominent EXTRACT button SHALL cash out at the current multiplier; an optional auto-extract threshold (e.g., 2.00x) SHALL be settable before launch and SHALL trigger without frame-timing drift beyond one animation frame.

#### Scenario: Manual extraction

- **WHEN** the player presses cash-out (or auto-extract triggers) while the torpedo still flies
- **THEN** the payout toast («ДУША СПАСЕНА — x2.31») appears and the button becomes disabled for the rest of the flight

#### Scenario: Auto extraction

- **WHEN** the current multiplier reaches the auto-extract threshold while flying
- **THEN** cash-out settles within one frame of the threshold crossing
