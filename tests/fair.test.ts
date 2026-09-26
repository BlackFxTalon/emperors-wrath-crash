import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import {
  crashFromDigest,
  digestInput,
  digestToR,
  MAX_CRASH,
  MIN_CRASH,
  ShaRoundFair,
  sha256Hex,
} from '../src/engine/fair';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

describe('crashFromDigest', () => {
  it('returns 1.00 when r < 0.03 (instant warp rift)', () => {
    // head 0x0700... = 0.0273... < 0.03
    const digest = '07' + '00'.repeat(31);
    expect(crashFromDigest(digest)).toBe(1.0);
  });

  it('clamps to the 5000x cap', () => {
    expect(crashFromDigest('ff'.repeat(32))).toBe(MAX_CRASH);
  });

  it('never falls below 1.00', () => {
    expect(crashFromDigest('00'.repeat(32))).toBe(MIN_CRASH);
  });

  it('matches the documented formula on a known vector', () => {
    const seed = 'cafebabe';
    const nonce = 42;
    const digest = sha256(digestInput(seed, nonce));
    const r = parseInt(digest.slice(0, 13), 16) / 2 ** 52;
    const expected = Math.min(MAX_CRASH, Math.max(MIN_CRASH, Math.floor(97 / (1 - r)) / 100));
    expect(crashFromDigest(digest)).toBe(expected);
  });
});

describe('distribution sanity (10 000 rounds)', () => {
  const N = 10_000;
  const points: number[] = [];
  for (let i = 0; i < N; i++) points.push(crashFromDigest(sha256(`spec-seed:${i}`)));

  it('median crash point is below 2.50x', () => {
    const sorted = [...points].sort((a, b) => a - b);
    expect(sorted[N / 2]).toBeLessThan(2.5);
  });

  it('about 3% of rounds crash instantly at 1.00x', () => {
    const instant = points.filter((p) => p === 1.0).length / N;
    expect(instant).toBeGreaterThan(0.015);
    expect(instant).toBeLessThan(0.06);
  });
});

describe('digestToR', () => {
  it('maps hex to [0, 1)', () => {
    expect(digestToR('00'.repeat(32))).toBe(0);
    expect(digestToR('ff'.repeat(32))).toBeLessThan(1);
    expect(digestToR('ff'.repeat(32))).toBeGreaterThan(0.99);
  });
});

describe('ShaRoundFair', () => {
  it('commit → crash → reveal → verify round-trips', async () => {
    const fair = new ShaRoundFair();
    const commit = await fair.nextCommit();
    const played = await fair.crashPoint(commit);
    const seed = await fair.reveal(commit);

    expect(commit.commitHash).toMatch(/^[0-9a-f]{64}$/);
    expect(seed).toMatch(/^[0-9a-f]{64}$/);
    expect(await fair.verify(seed, commit)).toBe(played);
  });

  it('advances the chain: successive rounds get distinct commits', async () => {
    const fair = new ShaRoundFair();
    const a = await fair.nextCommit();
    await fair.reveal(a);
    const b = await fair.nextCommit();
    expect(b.commitHash).not.toBe(a.commitHash);
    expect(b.nonce).toBe(a.nonce + 1);
  });

  it('sha256Hex agrees with node crypto', async () => {
    expect(await sha256Hex('emperor')).toBe(sha256('emperor'));
  });
});
