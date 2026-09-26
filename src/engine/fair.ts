/**
 * Provably-fair crash point generation (demo-grade, client-side).
 *
 * Formula (see specs/crash-round-engine):
 *   r     = first 52 bits of SHA-256(serverSeed + ":" + nonce) / 2^52   — uniform [0, 1)
 *   crash = clamp(floor(97 / (1 - r)) / 100, 1.00, 5000.00)
 *
 * 3% instant-crash chance (r < 0.03 → crash 1.00), 3% house edge,
 * P(crash ≥ x) ≈ 0.97 / x. Seed chain: each round's seed is committed
 * by hash BEFORE the round and revealed AFTER it; the next round's seed
 * is SHA-256 of the current one, so disclosed history is verifiable.
 */

export const HOUSE_EDGE_FACTOR = 97; // = 1 - 0.03
export const MIN_CRASH = 1.0;
export const MAX_CRASH = 5000.0;
export const BITS = 52;
export const HEX_CHARS = BITS / 4; // 13 hex chars = 52 bits

/** The string that gets hashed for a given round. */
export function digestInput(seed: string, nonce: number): string {
  return `${seed}:${nonce}`;
}

/** Pure: digest hex → uniform r in [0, 1). */
export function digestToR(digestHex: string): number {
  const head = digestHex.slice(0, HEX_CHARS);
  const int = BigInt('0x' + head);
  return Number(int) / 2 ** BITS;
}

/** Pure: digest hex → crash point, clamped to [1.00, 5000.00]. */
export function crashFromDigest(digestHex: string): number {
  const r = digestToR(digestHex);
  const raw = Math.floor(HOUSE_EDGE_FACTOR / (1 - r)) / 100;
  return Math.min(MAX_CRASH, Math.max(MIN_CRASH, raw));
}

export function sha256Hex(message: string): Promise<string> {
  return crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(message))
    .then((buf) => BufferLikeHex(buf));
}

function BufferLikeHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomSeedHex(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** A per-round fairness commitment. */
export interface RoundCommit {
  commitHash: string;
  nonce: number;
}

export interface RoundFair {
  /** Commitment disclosed BEFORE the round starts. */
  nextCommit(): Promise<RoundCommit>;
  /** Crash point derived from a commit (used internally at launch). */
  crashPoint(commit: RoundCommit): Promise<number>;
  /** Seed preimage revealed AFTER the round settles. */
  reveal(commit: RoundCommit): Promise<string>;
  /** Offline verification helper. */
  verify(seed: string, commit: RoundCommit): Promise<number>;
}

/** WebCrypto-backed provider used in the browser. */
export class ShaRoundFair implements RoundFair {
  private pendingSeed: string | null = null;
  private nonceCounter = 0;

  async nextCommit(): Promise<RoundCommit> {
    if (!this.pendingSeed) this.pendingSeed = await sha256Hex(randomSeedHex());
    const commitHash = await sha256Hex(this.pendingSeed);
    return { commitHash, nonce: this.nonceCounter };
  }

  async crashPoint(commit: RoundCommit): Promise<number> {
    const seed = this.pendingSeed;
    if (!seed) throw new Error('no pending seed');
    return crashFromDigest(await sha256Hex(digestInput(seed, commit.nonce)));
  }

  /** Reveals the seed and advances the chain: S(n+1) = SHA-256(S(n)). */
  async reveal(_commit: RoundCommit): Promise<string> {
    const seed = this.pendingSeed;
    if (!seed) throw new Error('nothing to reveal');
    this.pendingSeed = await sha256Hex(seed);
    this.nonceCounter += 1;
    return seed;
  }

  async verify(seed: string, commit: RoundCommit): Promise<number> {
    return crashFromDigest(await sha256Hex(digestInput(seed, commit.nonce)));
  }
}
