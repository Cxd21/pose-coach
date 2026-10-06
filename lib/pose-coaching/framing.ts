/**
 * Framing/composition check: measures whether the live user is actually
 * standing where the fixed reference guide is drawn on screen.
 *
 * This is intentionally SEPARATE from pose similarity scoring
 * (lib/pose-scoring), which is deliberately position/scale-invariant — two
 * different people at two different distances from the camera should still
 * be able to match a pose's *shape*. But a fixed composition guide only
 * does its job (helping the photographer judge headroom, left/right
 * placement, how much of the body is in frame) if the subject is actually
 * standing roughly where it's drawn. Without this check, someone could
 * have a geometrically perfect pose while standing entirely outside the
 * guide, off to one side of the frame — technically "correct" by pose
 * shape alone, but a poorly composed photo.
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FramingMatch {
  /** Fraction (0-1) of the guide's box area actually covered by the user's body bounding box. */
  coverage: number;
  /** User's box height relative to the guide's box height. <1 = user appears smaller (too far back), >1 = larger (too close). */
  sizeRatio: number;
  /** True once `coverage` clears the "well framed" bar. */
  isWellFramed: boolean;
  /**
   * Rough direction to nudge the user so their body bounding box centers
   * on the guide's box, in normalized units (positive x = move screen-
   * right, positive y = move down). Null once framing is already good.
   */
  direction: { x: number; y: number } | null;
}

const WELL_FRAMED_COVERAGE = 0.5;
/** sizeRatio outside this band means the user is too far back or too close, even if coverage alone looks fine. */
const MIN_SIZE_RATIO = 0.65;
const MAX_SIZE_RATIO = 1.5;

/** Axis-aligned bounding box of a set of points, ignoring any below `minVisibility`. */
export function boundingBoxOfPoints(
  points: { x: number; y: number; visibility?: number }[],
  minVisibility = 0.3
): Box | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let count = 0;

  for (const p of points) {
    if (p.visibility !== undefined && p.visibility < minVisibility) continue;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    count++;
  }

  if (count === 0) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function intersectionArea(a: Box, b: Box): number {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.width, b.x + b.width);
  const y1 = Math.min(a.y + a.height, b.y + b.height);
  return Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
}

/**
 * Compares the user's on-screen body bounding box against the guide's
 * fixed box (both in the same pixel space — typically the video canvas).
 */
export function computeFramingMatch(userBox: Box, guideBox: Box): FramingMatch {
  const guideArea = guideBox.width * guideBox.height;
  const coverage = guideArea > 0 ? intersectionArea(userBox, guideBox) / guideArea : 0;
  const sizeRatio = guideBox.height > 0 ? userBox.height / guideBox.height : 1;
  // Coverage alone isn't enough: someone standing very close fills (and
  // exceeds) the guide's area trivially, which would otherwise read as
  // "well framed" despite being cropped far too tight. Size ratio catches
  // that the same way it catches standing too far back.
  const isWellFramed =
    coverage >= WELL_FRAMED_COVERAGE && sizeRatio >= MIN_SIZE_RATIO && sizeRatio <= MAX_SIZE_RATIO;

  let direction: { x: number; y: number } | null = null;
  if (!isWellFramed) {
    const userCenterX = userBox.x + userBox.width / 2;
    const userCenterY = userBox.y + userBox.height / 2;
    const guideCenterX = guideBox.x + guideBox.width / 2;
    const guideCenterY = guideBox.y + guideBox.height / 2;
    // Normalize by guide size so the direction magnitude is comparable
    // regardless of camera resolution.
    direction = {
      x: (guideCenterX - userCenterX) / guideBox.width,
      y: (guideCenterY - userCenterY) / guideBox.height,
    };
  }

  return { coverage, sizeRatio, isWellFramed, direction };
}
