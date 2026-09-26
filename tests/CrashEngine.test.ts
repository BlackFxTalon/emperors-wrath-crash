import { describe, expect, it, vi } from 'vitest';
import { createCrashEngine } from '../src/engine/CrashEngine';
import type { RoundFair } from '../src/engine/fair';
import { DOUBLE_MS } from '../src/engine/multiplier';

function makeFair(crashPoint: number): RoundFair {
  let n = 0;
  return {
    async nextCommit() {
      return { commitHash: `hash-${n}`, nonce: n++ };
    },
    async crashPoint() {
      return crashPoint;
    },
    async reveal(commit) {
      return `seed-for-${commit.commitHash}`;
    },
    async verify(_seed, _commit) {
      return crashPoint;
    },
  };
}

interface Harness {
  engine: ReturnType<typeof createCrashEngine>;
  time: () => number;
  set: (t: number) => void;
  advance: (ms: number) => void;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function makeHarness(crashPoint: number, balance = 100): Harness {
  let t = 0;
  const engine = createCrashEngine({
    now: () => t,
    fair: makeFair(crashPoint),
    initialBalance: balance,
    phases: { bettingMs: 100, crashedMs: 50 },
  });
  return {
    engine,
    time: () => t,
    set: (v) => {
      t = v;
    },
    advance: (ms) => {
      t += ms;
    },
  };
}

describe('CrashEngine round flow', () => {
  it('BETTING → FLYING → CRASHED → BETTING without deadlock', async () => {
    const h = makeHarness(2.0);
    await h.engine.start();
    expect(h.engine.phase).toBe('BETTING');

    h.advance(100);
    h.engine.update();
    expect(h.engine.phase).toBe('FLYING');

    h.advance(12_000); // raw ≈ 2.0+
    h.engine.update();
    expect(h.engine.phase).toBe('CRASHED');

    h.advance(50);
    await flush(); // reveal + fresh prep resolve on microtasks
    h.engine.update();
    expect(h.engine.phase).toBe('BETTING');
  });

  it('rejects bets during FLYING with grimdark message', async () => {
    const h = makeHarness(2.0);
    await h.engine.start();
    h.advance(100);
    h.engine.update();
    const onRejected = vi.fn();
    h.engine.on('rejected', onRejected);

    h.engine.placeBet(10);
    expect(onRejected).toHaveBeenCalledWith(
      expect.objectContaining({ reason: expect.stringContaining('launched') }),
    );
  });
});

describe('betting & balance', () => {
  it('debits balance when bet is armed', async () => {
    const h = makeHarness(2.0, 100);
    await h.engine.start();
    h.engine.placeBet(30);
    expect(h.engine.balance).toBe(70);
  });

  it('rejects bets exceeding balance and keeps balance intact', async () => {
    const h = makeHarness(2.0, 100);
    await h.engine.start();
    const onRejected = vi.fn();
    h.engine.on('rejected', onRejected);
    h.engine.placeBet(150);
    expect(h.engine.balance).toBe(100);
    expect(onRejected).toHaveBeenCalled();
  });

  it('cancel during BETTING refunds', async () => {
    const h = makeHarness(2.0, 100);
    await h.engine.start();
    h.engine.placeBet(40);
    h.engine.cancelBet();
    expect(h.engine.balance).toBe(100);
    expect(h.engine.phase).toBe('BETTING');
  });
});

describe('cash-out settlement', () => {
  it('credits payout at the current multiplier and survives the later crash', async () => {
    const h = makeHarness(3.0, 100);
    await h.engine.start();
    h.engine.placeBet(50);

    h.advance(100); // launch
    h.engine.update();
    h.advance(DOUBLE_MS); // raw = 2.0 < 3.0
    h.engine.update();
    expect(h.engine.phase).toBe('FLYING');

    h.engine.cashOut();
    expect(h.engine.balance).toBe(50 + 100); // 50 * x2.00
    expect(h.engine.phase).toBe('FLYING');

    h.advance(DOUBLE_MS); // raw would pass 3.0
    h.engine.update();
    expect(h.engine.phase).toBe('CRASHED');
    expect(h.engine.balance).toBe(150); // locked payout untouched
  });

  it('truncates payout to 2 decimals', async () => {
    const h = makeHarness(50, 100);
    await h.engine.start();
    h.engine.placeBet(10);
    h.advance(100);
    h.engine.update();
    h.advance(2_913); // 2^(2913/12000) ≈ 1.1814…
    h.engine.update();
    h.engine.cashOut();
    const extraction = vi.fn();
    // balance check: payout = 10 * trunc2(raw)
    expect(h.engine.balance).toBeGreaterThan(100);
    expect(Number.isInteger(h.engine.balance * 100)).toBe(true);
  });

  it('auto-extracts at the exact threshold within one frame', async () => {
    const h = makeHarness(10, 100);
    await h.engine.start();
    const extractions: number[] = [];
    h.engine.on('extraction', (e) => extractions.push(e.multiplier));

    h.engine.placeBet(10, 1.5);
    h.advance(100);
    h.engine.update();
    h.advance(DOUBLE_MS * Math.log2(1.5) + 16); // just past the threshold
    h.engine.update();

    expect(extractions).toEqual([1.5]);
    expect(h.engine.balance).toBe(90 + 15);
  });

  it('auto-extraction wins at the crash-boundary frame', async () => {
    const h = makeHarness(2.0, 100);
    await h.engine.start();
    h.engine.placeBet(10, 2.0);
    h.advance(100);
    h.engine.update();
    h.advance(DOUBLE_MS + 50); // raw > crash 2.0 AND past threshold
    h.engine.update();
    // threshold crossed first → extraction at exactly 2.0, then crash
    expect(h.engine.balance).toBe(90 + 20);
    expect(h.engine.phase).toBe('CRASHED');
  });
});

describe('crash settlement', () => {
  it('voids an unsettled bet on crash', async () => {
    const h = makeHarness(1.5, 100);
    await h.engine.start();
    let lostBet = false;
    h.engine.on('crash', (e) => {
      lostBet = e.lostBet;
    });
    h.engine.placeBet(25);
    h.advance(100);
    h.engine.update();
    h.advance(DOUBLE_MS * Math.log2(1.5));
    h.engine.update();

    expect(h.engine.phase).toBe('CRASHED');
    expect(lostBet).toBe(true);
    expect(h.engine.balance).toBe(75);
  });

  it('instant crash (1.00x) resolves on the first flying frame', async () => {
    const h = makeHarness(1.0, 100);
    await h.engine.start();
    h.engine.placeBet(10);
    h.advance(100);
    h.engine.update();
    expect(h.engine.phase).toBe('CRASHED');
    expect(h.engine.balance).toBe(90);
  });
});

describe('provably-fair disclosure', () => {
  it('emits commit before round and reveals seed after crash', async () => {
    const h = makeHarness(2.5, 100);
    const commits: string[] = [];
    const revealed: { seed: string; hash: string }[] = [];
    h.engine.on('commit', (c) => commits.push(c.commitHash));
    h.engine.on('revealed', (r) => revealed.push({ seed: r.seed, hash: r.commitHash }));

    await h.engine.start();
    expect(commits.length).toBe(1);

    h.advance(100);
    h.engine.update();
    h.advance(DOUBLE_MS * Math.log2(2.5));
    h.engine.update(); // → CRASHED (revealed not yet emitted — still on microtasks)
    expect(revealed).toEqual([]);

    h.advance(50);
    await flush(); // reveal fires, then fresh prep resolves
    expect(revealed).toEqual([{ seed: 'seed-for-hash-0', hash: 'hash-0' }]);

    h.engine.update(); // → BETTING (second commit emitted)
    await flush();

    expect(revealed).toHaveLength(1);
    expect(commits.length).toBe(2);
    expect(h.engine.lastRevealed()?.crashPoint).toBe(2.5);
  });
});
