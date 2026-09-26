/**
 * Warp Charge multiplier clock — pure, frame-rate independent.
 * m(t) = 2^(t_ms / 12000): doubles every 12 seconds.
 */

export const DOUBLE_MS = 12_000;
export const FLIGHT_CAP = 5_000; // must match fair.MAX_CRASH

/** Raw multiplier at elapsed flight time (unrounded). */
export function multiplierAt(elapsedMs: number): number {
  return Math.pow(2, Math.max(0, elapsedMs) / DOUBLE_MS);
}

/** Flight time (ms) at which a given multiplier is reached. */
export function timeForMultiplier(m: number): number {
  return DOUBLE_MS * Math.log2(m);
}

/** Maximum flight duration before the cap forces a crash. */
export const MAX_FLIGHT_MS = timeForMultiplier(FLIGHT_CAP);

/** Truncate to 2 decimals (settlement & display per spec). */
export function trunc2(x: number): number {
  return Math.floor(x * 100) / 100;
}

/** Display string "x12.34". */
export function formatMultiplier(m: number): string {
  return `x${trunc2(m).toFixed(2)}`;
}
