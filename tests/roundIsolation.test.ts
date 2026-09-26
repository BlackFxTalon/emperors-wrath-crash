import { describe, expect, it } from 'vitest';
import { createCrashEngine } from '../src/engine/CrashEngine';
import type { RoundFair } from '../src/engine/fair';
import { DOUBLE_MS } from '../src/engine/multiplier';

const flush = () => new Promise((r) => setTimeout(r, 0));

/** Crash point varies per nonce — a stale prep would reuse round 0's value. */
function makeVaryingFair(): RoundFair {
  let n = 0;
  return {
    async nextCommit() {
      return { commitHash: `hash-${n}`, nonce: n++ };
    },
    async crashPoint(commit) {
      return 1 + commit.nonce * 0.5; // 1.00, 1.50, 2.00 …
    },
    async reveal(commit) {
      return `seed-for-${commit.commitHash}`;
    },
    async verify(_seed, commit) {
      return 1 + commit.nonce * 0.5;
    },
  };
}

describe('round preparation isolation (regression)', () => {
  it('successive rounds use distinct crash points — never a stale prep', async () => {
    let t = 0;
    const engine = createCrashEngine({
      now: () => t,
      fair: makeVaryingFair(),
      initialBalance: 1000,
      phases: { bettingMs: 10, crashedMs: 10 },
    });
    const crashes: number[] = [];
    engine.on('crash', (c) => crashes.push(c.crashPoint));

    await engine.start();
    for (let round = 0; round < 5; round++) {
      t += 10;
      engine.update(); // → FLYING
      for (let i = 0; i < 3000 && engine.phase === 'FLYING'; i++) {
        t += 50;
        engine.update();
      }
      expect(engine.phase).toBe('CRASHED');
      t += 10;
      await flush(); // reveal + fresh prep resolve on microtasks
      engine.update(); // → BETTING only once fresh prep is in
      expect(engine.phase).toBe('BETTING');
    }

    expect(crashes).toHaveLength(5);
    const unique = new Set(crashes);
    expect(unique.size).toBe(5); // the x1.16 bug: all rounds shared one crash point
  });

  it('holds the phase when preparation has not resolved yet', async () => {
    let t = 0;
    const engine = createCrashEngine({
      now: () => t,
      fair: makeVaryingFair(),
      initialBalance: 100,
      phases: { bettingMs: 10, crashedMs: 10 },
    });
    await engine.start();
    t += 10;
    engine.update(); // → FLYING
    t += 10;
    engine.update(); // crash (point 1.00 → instant)
    expect(engine.phase).toBe('CRASHED');
    t += 10;
    engine.update(); // prep not resolved yet — must HOLD, not enter BETTING
    expect(engine.phase).toBe('CRASHED');
    await flush();
    engine.update();
    expect(engine.phase).toBe('BETTING');
  });
});
