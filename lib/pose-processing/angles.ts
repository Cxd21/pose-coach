export interface Point2D {
  x: number;
  y: number;
}

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

export function angleFromVertical(a: Point2D, b: Point2D): number {
  const v = { x: a.x - b.x, y: a.y - b.y };
  const mag = Math.hypot(v.x, v.y);
  if (mag === 0) return NaN;
  return (Math.atan2(v.x, -v.y) * 180) / Math.PI;
}
