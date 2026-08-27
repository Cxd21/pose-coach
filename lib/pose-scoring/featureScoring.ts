/**
 * Pure difference→similarity math. No dependency on pose-specific types —
 * just numbers and 2D points — so this is easy to test in isolation.
 */

export interface Point2D {
  x: number;
  y: number;
}

/** Absolute angular difference between two degree values, correctly wrapped (e.g. 350° vs 10° → 20°, not 340°). */
export function angularDifferenceDegrees(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** Straight-line 2D distance between two points (z is intentionally ignored — see angles.ts for why). */
export function euclideanDistance2D(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Converts a raw difference into a 0-100 similarity score via simple linear
 * falloff: 0 difference → 100, `tolerance` (or more) difference → 0.
 * This is the one formula the whole scoring system is built on — no
 * hidden curves or weighting beyond what's passed in.
 */
export function similarityFromDifference(difference: number, tolerance: number): number {
  if (tolerance <= 0) return difference === 0 ? 100 : 0;
  const ratio = difference / tolerance;
  return Math.max(0, Math.min(100, 100 * (1 - ratio)));
}
