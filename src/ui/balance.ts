/** Demo credit balance with localStorage persistence. */

const KEY = 'ew.balance.v1';
const DEFAULT = 1000;

export function loadBalance(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return DEFAULT;
    const v = Number(raw);
    if (!Number.isFinite(v) || v < 0) return DEFAULT;
    return Math.floor(v * 100) / 100;
  } catch {
    return DEFAULT;
  }
}

export function saveBalance(v: number): void {
  try {
    localStorage.setItem(KEY, String(v));
  } catch {
    /* private mode etc. — balance stays session-only */
  }
}
