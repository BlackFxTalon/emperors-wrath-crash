/** Round phase. BETTING → FLYING → CRASHED → BETTING … */
export type Phase = 'BETTING' | 'FLYING' | 'CRASHED';

export interface Bet {
  amount: number;
  /** Auto-extract multiplier target, or null for manual only. */
  autoTarget: number | null;
  settled: boolean;
  /** Multiplier the bet cashed out at, or null while flying/lost. */
  cashedAt: number | null;
  payout: number;
}

export interface TickEvent {
  phase: Phase;
  /** Current multiplier (FLYING) or last crashed multiplier (CRASHED). */
  multiplier: number;
  /** Seconds left in BETTING. */
  countdown: number | null;
  bet: Readonly<Bet> | null;
}

export interface PhaseEvent {
  phase: Phase;
  /** Absolute engine-time the phase ends (BETTING/CRASHED). */
  endsAt: number | null;
}

export interface ExtractionEvent {
  multiplier: number;
  payout: number;
  auto: boolean;
}

export interface CrashEvent {
  crashPoint: number;
  /** True if an armed bet was lost in this crash. */
  lostBet: boolean;
}

export interface RevealedEvent {
  commitHash: string;
  nonce: number;
  seed: string;
  crashPoint: number;
}

export type RevealedInfo = RevealedEvent;

export interface CommitEvent {
  commitHash: string;
  nonce: number;
}

export type EngineEvents = {
  tick: TickEvent;
  phase: PhaseEvent;
  armed: { amount: number; autoTarget: number | null };
  betCancelled: { refund: number };
  extraction: ExtractionEvent;
  crash: CrashEvent;
  revealed: RevealedEvent;
  commit: CommitEvent;
  balance: { value: number };
  rejected: { reason: string };
};

export interface PhaseDurations {
  bettingMs: number;
  crashedMs: number;
}

export const DEFAULT_PHASES: PhaseDurations = { bettingMs: 8_000, crashedMs: 4_000 };
