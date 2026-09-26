# crash-round-engine — Delta

## Purpose

Guarantees that no round can ever fly on a previous round's preparation.

## ADDED Requirements

### Requirement: Round preparation isolation

Each round's crash point and commitment SHALL derive exclusively from that round's own committed seed and nonce. Launching a round SHALL require the *new* round's preparation to be resolved; until then the engine SHALL hold in its current phase rather than launch on stale preparation. Successive rounds in one session SHALL NOT reuse identical (commit, crash point) pairs.

#### Scenario: Successive rounds use distinct crash points

- **WHEN** a session plays five full rounds with a fair provider whose crash point varies per nonce
- **THEN** the five crash points are not all identical and each matches the value derived from its own round nonce

#### Scenario: Launch waits for fresh preparation

- **WHEN** the crashed-phase timer ends before the next round's preparation has resolved
- **THEN** the engine holds in `CRASHED` and enters `BETTING` only once the fresh preparation is assigned
