export interface Point2D {
  x: number;
  y: number;
}

export function angularDifferenceDegrees(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export function euclideanDistance2D(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function similarityFromDifference(difference: number, tolerance: number): number {
  if (tolerance <= 0) return difference === 0 ? 100 : 0;
  const ratio = difference / tolerance;
  return Math.max(0, Math.min(100, 100 * (1 - ratio)));
}
