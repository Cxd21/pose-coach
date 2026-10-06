/**
 * Pure 2D angle math. No dependency on MediaPipe or any app-specific
 * types — just plain {x, y} points — so this is easy to unit test in
 * isolation and easy to reuse elsewhere (e.g. for the hand/face landmarks
 * in a later milestone).
 *
 * We deliberately work in 2D (x, y) rather than 3D (x, y, z). MediaPipe's
 * z is a rough relative-depth estimate — reliable enough as a supplementary
 * signal, but not precise enough to trust for angle math, especially from
 * single 2D reference photos rather than depth-sensed video. Using x/y
 * only also means these angles are naturally invariant to translation,
 * uniform scaling, AND in-image-plane rotation (camera roll) — rotating
 * the whole coordinate system doesn't change the angle between two vectors
 * within it.
 */

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Angle in degrees at vertex `b`, between rays b→a and b→c. Range [0, 180].
 * Returns NaN if either ray has zero length (degenerate/overlapping points).
 */
export function angleBetween(a: Point2D, b: Point2D, c: Point2D): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 === 0 || mag2 === 0) return NaN;

  const dot = v1.x * v2.x + v1.y * v2.y;
  const cos = Math.min(1, Math.max(-1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Angle in degrees of the vector b→a relative to "straight up" (0, -1) in
 * image space, useful for lean/tilt (e.g. torso lean, head tilt). 0° means
 * `a` is directly above `b`. Returns NaN if b→a has zero length.
 */
export function angleFromVertical(a: Point2D, b: Point2D): number {
  const v = { x: a.x - b.x, y: a.y - b.y };
  const mag = Math.hypot(v.x, v.y);
  if (mag === 0) return NaN;
  return (Math.atan2(v.x, -v.y) * 180) / Math.PI;
}
