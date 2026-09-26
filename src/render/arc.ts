/**
 * Shared crash-game arc — a pure function of flight time, used identically
 * by the Three.js scene (world space) and the Pixi HUD (screen space).
 * Normalized coordinates: x ∈ [0,1] left→right, y ∈ [0,1] top→bottom.
 */

export interface Vec2 {
  x: number;
  y: number;
}

const START: Vec2 = { x: 0.1, y: 0.84 }; // launch cradle, bottom-left
const CTRL: Vec2 = { x: 0.62, y: 0.74 }; // bends the trajectory upward late
const END: Vec2 = { x: 0.88, y: 0.12 }; // the sky rift, top-right

/** Bezier parameter: eases out so the torpedo approaches the rift and hovers. */
export function arcParam(elapsedSec: number): number {
  return 1 - Math.exp(-Math.max(0, elapsedSec) / 9);
}

/** Position on the flight arc at elapsed flight time (seconds). */
export function arcAt(elapsedSec: number): Vec2 {
  const q = arcParam(elapsedSec);
  const u = 1 - q;
  return {
    x: u * u * START.x + 2 * u * q * CTRL.x + q * q * END.x,
    y: u * u * START.y + 2 * u * q * CTRL.y + q * q * END.y,
  };
}

/** Launch cradle position (idles during BETTING). */
export function launchPosition(): Vec2 {
  return { ...START };
}

/** Screen-space tangent angle (radians, y-down) at elapsed time — for sprite tilt. */
export function arcAngle(elapsedSec: number): number {
  const d = 0.05;
  const a = arcAt(Math.max(0, elapsedSec - d));
  const b = arcAt(elapsedSec + d);
  return Math.atan2(b.y - a.y, b.x - a.x);
}
