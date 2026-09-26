import {
  type RoundCommit,
  type RoundFair,
  ShaRoundFair,
} from './fair';
import { MAX_FLIGHT_MS, multiplierAt, trunc2 } from './multiplier';
import {
  type Bet,
  type EngineEvents,
  type Phase,
  type PhaseDurations,
  type RevealedInfo,
  DEFAULT_PHASES,
} from './types';

type Emit<K extends keyof EngineEvents> = (payload: EngineEvents[K]) => void;

/** Minimal typed emitter. */
export class Emitter {
  private listeners = new Map<string, Set<Emit<never>>>();

  on<K extends keyof EngineEvents>(key: K, fn: Emit<K>): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(fn as Emit<never>);
    return () => set.delete(fn as Emit<never>);
  }

  emit<K extends keyof EngineEvents>(key: K, payload: EngineEvents[K]): void {
    const set = this.listeners.get(key);
    if (!set) return;
    for (const fn of set) (fn as unknown as Emit<K>)(payload);
  }
}

export interface EngineDeps {
  /** Injectable clock (defaults to performance.now) — keeps the engine deterministic in tests. */
  now?: () => number;
  fair?: RoundFair;
  initialBalance?: number;
  phases?: PhaseDurations;
}

export interface CrashEngine {
  readonly phase: Phase;
  readonly balance: number;
  readonly multiplier: number;
  /** Elapsed flight time in ms (frozen after crash). */
  readonly flightTimeMs: number;

  /** Subscribe to engine events; returns unsubscribe. */
  on<K extends keyof EngineEvents>(key: K, fn: (payload: EngineEvents[K]) => void): () => void;

  start(): Promise<void>;
  update(now?: number): void;

  placeBet(amount: number, autoTarget?: number | null): void;
  cancelBet(): void;
  cashOut(): void;
  /** Last round's fairness disclosure, if revealed. */
  lastRevealed(): RevealedInfo | null;
}

interface RoundPrep {
  commit: RoundCommit;
  crashPoint: number;
}

export function createCrashEngine(deps: EngineDeps = {}): CrashEngine {
  const now = deps.now ?? (() => performance.now());
  const phases = deps.phases ?? DEFAULT_PHASES;
  let fairPromise: Promise<RoundFair> | null = null;
  const fairOf = (): Promise<RoundFair> => {
    if (!fairPromise) fairPromise = deps.fair ? Promise.resolve(deps.fair) : Promise.resolve(new ShaRoundFair());
    return fairPromise;
  };

  const emitter = new Emitter();
  const on = emitter.on.bind(emitter);

  let phase: Phase = 'BETTING';
  let balance = deps.initialBalance ?? 1000;
  let phaseEndsAt = 0;
  let flightStartedAt = 0;
  let currentMultiplier = 1;
  let crashedAtMultiplier = 1;
  let lastFlightTimeMs = 0;

  let bet: Bet | null = null;
  let prep: RoundPrep | null = null;
  let prepPromise: Promise<RoundPrep | null> | null = null;
  let revealed: RevealedInfo | null = null;

  function setBalance(v: number): void {
    balance = trunc2(v);
    emitter.emit('balance', { value: balance });
  }

  function broadcastTick(): void {
    const countdown = phase === 'BETTING' ? Math.max(0, (phaseEndsAt - now()) / 1000) : null;
    emitter.emit('tick', {
      phase,
      multiplier: phase === 'FLYING' ? currentMultiplier : crashedAtMultiplier,
      countdown,
      bet,
    });
  }

  async function prepareNextRound(): Promise<RoundPrep> {
    const fair = await fairOf();
    const commit = await fair.nextCommit();
    const crashPoint = await fair.crashPoint(commit);
    emitter.emit('commit', { commitHash: commit.commitHash, nonce: commit.nonce });
    return { commit, crashPoint };
  }

  async function start(): Promise<void> {
    prep = await prepareNextRound();
    prepPromise = null;
    enterBetting(now());
    broadcastTick();
  }

  function enterBetting(t: number): void {
    phase = 'BETTING';
    phaseEndsAt = t + phases.bettingMs;
    bet = null;
    currentMultiplier = 1;
    emitter.emit('phase', { phase, endsAt: phaseEndsAt });
  }

  function launch(): void {
    phase = 'FLYING';
    flightStartedAt = now();
    currentMultiplier = 1;
    phaseEndsAt = 0;
    // Commit is already disclosed; crash point locked in prep.
    emitter.emit('phase', { phase: 'FLYING', endsAt: null });
    if (bet) emitter.emit('armed', { amount: bet.amount, autoTarget: bet.autoTarget });
  }

  function settleAt(multiplier: number, auto: boolean): void {
    if (!bet || bet.settled) return;
    const m = trunc2(multiplier);
    bet.settled = true;
    bet.cashedAt = m;
    bet.payout = trunc2(bet.amount * m);
    setBalance(balance + bet.payout);
    emitter.emit('extraction', { multiplier: m, payout: bet.payout, auto });
  }

  function doCrash(): void {
    const crashPoint = prep?.crashPoint ?? currentMultiplier;
    const commit = prep?.commit;
    crashedAtMultiplier = crashPoint;
    currentMultiplier = crashPoint;
    const lostBet = bet !== null && !bet.settled;
    if (bet && !bet.settled) bet.settled = true; // bet consumed by the rift
    lastFlightTimeMs = now() - flightStartedAt;
    phase = 'CRASHED';
    prep = null; // round consumed — launch() must never see this preparation again
    phaseEndsAt = now() + phases.crashedMs;
    emitter.emit('crash', { crashPoint, lostBet });
    emitter.emit('phase', { phase, endsAt: phaseEndsAt });

    // Reveal seed, THEN prepare the next round — strictly in that order,
    // so the seed chain advances before the next commit is derived.
    // The resolved preparation is assigned back into the engine; until then
    // phase transitions hold (launch() requires prep).
    if (commit) {
      prepPromise = fairOf()
        .then((fair) => fair.reveal(commit))
        .then((seed) => {
          revealed = { commitHash: commit.commitHash, nonce: commit.nonce, seed, crashPoint };
          emitter.emit('revealed', revealed);
          return null as RoundPrep | null;
        })
        .then(() => prepareNextRound())
        .then((p) => {
          prep = p;
          return p;
        })
        .catch((err) => {
          console.error('[engine] reveal/prep chain failed', err);
          return null;
        });
    }
  }

  function update(nowArg?: number): void {
    const t = nowArg ?? now();
    // Allow at most a couple of same-frame transitions (e.g. BETTING→FLYING→CRASHED on an instant 1.00x).
    for (let i = 0; i < 3 && step(t); i++) {
      /* transition happened, re-evaluate */
    }
  }

  /** One phase step; returns true when a phase transition occurred. */
  function step(t: number): boolean {
    switch (phase) {
      case 'BETTING': {
        if (t >= phaseEndsAt) {
          if (prep) {
            launch();
            return true;
          }
          return false; // prep not ready (extremely rare) — hold at BETTING end
        }
        broadcastTick();
        return false;
      }
      case 'FLYING': {
        const raw = multiplierAt(t - flightStartedAt);
        const crashPoint = prep?.crashPoint ?? MAX_FLIGHT_MS;
        // Auto-extraction first: crossing the threshold settles before any crash check.
        if (bet && !bet.settled && bet.autoTarget !== null && raw >= bet.autoTarget) {
          settleAt(bet.autoTarget, true);
        }
        currentMultiplier = trunc2(Math.min(raw, crashPoint));
        if (raw >= crashPoint) {
          doCrash();
          return true;
        }
        broadcastTick();
        return false;
      }
      case 'CRASHED': {
        if (t >= phaseEndsAt) {
          if (prep) {
            enterBetting(t);
            return true;
          }
          return false;
        }
        broadcastTick();
        return false;
      }
    }
  }

  function placeBet(amount: number, autoTarget: number | null = null): void {
    if (phase !== 'BETTING') {
      emitter.emit('rejected', { reason: 'window_closed' });
      return;
    }
    const clean = trunc2(amount);
    if (!Number.isFinite(clean) || clean < 1) {
      emitter.emit('rejected', { reason: 'min_bet' });
      return;
    }
    if (clean > balance) {
      emitter.emit('rejected', { reason: 'insufficient' });
      return;
    }
    if (bet) {
      emitter.emit('rejected', { reason: 'already_armed' });
      return;
    }
    const target =
      autoTarget !== null && Number.isFinite(autoTarget) && trunc2(autoTarget) >= 1.01
        ? trunc2(autoTarget)
        : null;
    bet = { amount: clean, autoTarget: target, settled: false, cashedAt: null, payout: 0 };
    setBalance(balance - clean);
    emitter.emit('armed', { amount: clean, autoTarget: target });
  }

  function cancelBet(): void {
    if (phase !== 'BETTING' || !bet || bet.settled) {
      emitter.emit('rejected', { reason: 'nothing_to_recall' });
      return;
    }
    const refund = bet.amount;
    bet = null;
    setBalance(balance + refund);
    emitter.emit('betCancelled', { refund });
  }

  function cashOut(): void {
    if (phase !== 'FLYING' || !bet || bet.settled) {
      emitter.emit('rejected', {
        reason: phase === 'FLYING' ? 'already_extracted' : 'no_stake',
      });
      return;
    }
    const raw = multiplierAt(now() - flightStartedAt);
    const crashPoint = prep?.crashPoint ?? raw;
    if (raw >= crashPoint) {
      doCrash(); // raced the warp rift — lost
      return;
    }
    settleAt(raw, false);
  }

  return {
    get phase() {
      return phase;
    },
    get balance() {
      return balance;
    },
    get multiplier() {
      return phase === 'FLYING' ? currentMultiplier : crashedAtMultiplier;
    },
    /** Elapsed flight time in ms; freezes at the crash moment after CRASHED. */
    get flightTimeMs() {
      return phase === 'FLYING' ? now() - flightStartedAt : lastFlightTimeMs;
    },
    on,
    start,
    update,
    placeBet,
    cancelBet,
    cashOut,
    lastRevealed: () => revealed,
  };
}
