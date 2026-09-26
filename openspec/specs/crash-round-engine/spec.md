# crash-round-engine Specification

## Purpose
Owns the complete crash-round lifecycle: betting window, exponential multiplier flight, provably-fair crash point generation, and cash-out settlement — deterministic and independent of any rendering layer.

## Requirements

### Requirement: Round state machine

The system SHALL drive every round through the phases `BETTING → FLYING → CRASHED`, then return to `BETTING`, with no phase skippable and no deadlock on error.

#### Scenario: Normal round flow
- **WHEN** a round completes its crashed phase and the settle delay elapses
- **THEN** a new `BETTING` phase starts with a fresh countdown
- **AND** phase transitions are broadcast to UI and renderer subscribers in order

#### Scenario: Betting phase lockout
- **WHEN** the betting countdown reaches zero while at least one bet is placed
- **THEN** the round enters `FLYING` and further bets are rejected until the next round

### Requirement: Multiplier curve

While in `FLYING`, the Warp Charge multiplier SHALL grow monotonically from `1.00` following the exponential curve `m(t) = 2^(t_ms/12000)` (doubling every 12 s, ≈ +5.95% per second), and SHALL be observable at any frame time.

#### Scenario: Monotonic growth
- **WHEN** the flight is running for two consecutive frames
- **THEN** the multiplier is greater than or equal to the previous frame's value

#### Scenario: Display rounding
- **WHEN** the multiplier is rendered or settled
- **THEN** it is truncated to 2 decimal places

### Requirement: Provably-fair crash point (demo)

The crash point SHALL be derived before flight from `H = SHA-256(serverSeed + ":" + nonce)` by taking the first 52 bits of `H` as a uniform float `r` and computing `crash = floor(97 / (1 - r)) / 100`, clamped to a minimum of `1.00` and a maximum cap of `5000.00`; `houseEdge = 0.03`. The server seed hash chain SHALL be disclosed so any round can be re-verified offline.

#### Scenario: Distribution sanity
- **WHEN** 10 000 rounds are simulated with distinct nonces
- **THEN** the median crash point is below 2.50x and at least ~3% of rounds crash at exactly 1.00x

#### Scenario: Round verification
- **WHEN** a round's `serverSeed`, `nonce`, and disclosed hash are re-hashed offline
- **THEN** the recomputed crash point equals the played crash point

### Requirement: Cash-out settlement

The engine SHALL settle a player's cash-out at the first frame where the current multiplier is greater than or equal to the requested target; payout SHALL equal `bet * multiplier` truncated to 2 decimals and SHALL be credited before the crash of that round is applied to the same bet.

#### Scenario: Player extracts in time
- **WHEN** the player presses cash-out (or auto-extract triggers) while the torpedo still flies
- **THEN** the payout for that bet is locked immediately at the current multiplier
- **AND** a later crash does not alter the locked payout

#### Scenario: No cash-out before crash
- **WHEN** the crash point is reached with an active, unsettled bet
- **THEN** the bet is lost and no payout is credited

### Requirement: Round preparation isolation

Each round's crash point and commitment SHALL derive exclusively from that round's own committed seed and nonce. Launching a round SHALL require the *new* round's preparation to be resolved; until then the engine SHALL hold in its current phase rather than launch on stale preparation. Successive rounds in one session SHALL NOT reuse identical (commit, crash point) pairs.

#### Scenario: Successive rounds use distinct crash points

- **WHEN** a session plays five full rounds with a fair provider whose crash point varies per nonce
- **THEN** the five crash points are not all identical and each matches the value derived from its own round nonce

#### Scenario: Launch waits for fresh preparation

- **WHEN** the crashed-phase timer ends before the next round's preparation has resolved
- **THEN** the engine holds in `CRASHED` and enters `BETTING` only once the fresh preparation is assigned
