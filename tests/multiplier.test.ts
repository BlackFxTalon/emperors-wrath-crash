import { describe, expect, it } from 'vitest';
import { DOUBLE_MS, formatMultiplier, multiplierAt, trunc2 } from '../src/engine/multiplier';

describe('multiplier clock', () => {
  it('starts at 1.00', () => {
    expect(multiplierAt(0)).toBe(1);
  });

  it('doubles every 12 s', () => {
    expect(multiplierAt(DOUBLE_MS)).toBeCloseTo(2, 6);
    expect(multiplierAt(2 * DOUBLE_MS)).toBeCloseTo(4, 6);
  });

  it('is monotonic', () => {
    let prev = 0;
    for (let ms = 0; ms <= 60_000; ms += 16) {
      const m = multiplierAt(ms);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });

  it('truncates to 2 decimals without rounding up', () => {
    expect(trunc2(1.239)).toBe(1.23);
    expect(trunc2(1.2361)).toBe(1.23);
    expect(trunc2(2)).toBe(2);
  });

  it('formats with x prefix', () => {
    expect(formatMultiplier(1)).toBe('x1.00');
    expect(formatMultiplier(12.345)).toBe('x12.34');
  });
});
