# player-betting-ui — Delta

## Purpose

Makes the launch-sanctum action control self-explanatory: the player always knows what the button will do and why it is inert.

## ADDED Requirements

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
