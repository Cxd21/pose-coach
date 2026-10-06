/**
 * Generates and draws an approximate outer-body silhouette guide from a
 * pose's normalized landmarks.
 *
 * MediaPipe's Pose Landmarker only gives us 33 joint points — it has no
 * concept of body width or an outline. So this builds a *schematic*
 * silhouette: a circle for the head, a padded polygon for the torso, and
 * rounded "capsule" (stadium) shapes for each limb segment. It is
 * intentionally an approximation, not a traced body contour — the goal is
 * a soft positioning guide, not a pixel-accurate outline.
 *
 * Sizing note: this uses fixed proportions (e.g. "arms are this many torso
 * units wide") rather than the actual reference person's body width, which
 * we have no way to measure from joint landmarks alone. That's also why
 * this is drawn using the *viewer's own* live torso scale (see
 * `SilhouetteProjection` below) rather than the reference photo's original
 * scale — the guide shows the target pose's shape, resized to fit the
 * person currently in frame, not an attempt to match their exact build.
 */

import { PoseLandmarkIndex } from "@/lib/pose/types";
import type { NormalizedPoseLandmark } from "./types";

export type SilhouetteShape =
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "polygon"; points: { x: number; y: number }[] }
  | { kind: "capsule"; x1: number; y1: number; x2: number; y2: number; r: number };

/** Maps normalized (torso-unit) coordinates onto canvas pixel coordinates. */
export interface SilhouetteProjection {
  /** Canvas-pixel x/y of the (0,0) origin (hip-center) of the normalized pose. */
  originX: number;
  originY: number;
  /** Canvas pixels per one "torso unit". Uniform for x and y (no aspect distortion). */
  scale: number;
}

// Approximate body-part widths, in torso units (torso length ≈ 1 unit).
// These are rough anatomical proportions, not measured from any specific
// body — see the module doc comment above for why.
const HEAD_RADIUS_UNITS = 0.42;
const TORSO_PADDING_FACTOR = 1.2; // how far corners are pushed out from the torso's own centroid
const ARM_RADIUS_UNITS = 0.09;
const FOREARM_RADIUS_UNITS = 0.075;
const THIGH_RADIUS_UNITS = 0.12;
const SHIN_RADIUS_UNITS = 0.095;
const NECK_RADIUS_UNITS = 0.08;

function project(lm: NormalizedPoseLandmark, projection: SilhouetteProjection) {
  return {
    x: projection.originX + lm.x * projection.scale,
    y: projection.originY + lm.y * projection.scale,
  };
}

function midpoint(a: NormalizedPoseLandmark, b: NormalizedPoseLandmark): NormalizedPoseLandmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: Math.min(a.visibility, b.visibility),
  };
}

/** Pushes each polygon point outward from the polygon's own centroid, to turn a thin joint-quad into a body-like volume. */
function padPolygon(points: { x: number; y: number }[], factor: number): { x: number; y: number }[] {
  const centroid = points.reduce(
    (acc, p) => ({ x: acc.x + p.x / points.length, y: acc.y + p.y / points.length }),
    { x: 0, y: 0 }
  );
  return points.map((p) => ({
    x: centroid.x + (p.x - centroid.x) * factor,
    y: centroid.y + (p.y - centroid.y) * factor,
  }));
}

/**
 * Builds silhouette shapes from a pose's normalized landmarks (the same
 * `normalizedLandmarks` array on `PoseRepresentation`), projected into
 * canvas-pixel space via `projection`.
 */
export function buildSilhouetteShapes(
  normalizedLandmarks: NormalizedPoseLandmark[],
  projection: SilhouetteProjection
): SilhouetteShape[] {
  const nl = normalizedLandmarks;
  const scale = projection.scale;

  const nose = project(nl[PoseLandmarkIndex.NOSE], projection);
  const leftShoulder = project(nl[PoseLandmarkIndex.LEFT_SHOULDER], projection);
  const rightShoulder = project(nl[PoseLandmarkIndex.RIGHT_SHOULDER], projection);
  const leftElbow = project(nl[PoseLandmarkIndex.LEFT_ELBOW], projection);
  const rightElbow = project(nl[PoseLandmarkIndex.RIGHT_ELBOW], projection);
  const leftWrist = project(nl[PoseLandmarkIndex.LEFT_WRIST], projection);
  const rightWrist = project(nl[PoseLandmarkIndex.RIGHT_WRIST], projection);
  const leftHip = project(nl[PoseLandmarkIndex.LEFT_HIP], projection);
  const rightHip = project(nl[PoseLandmarkIndex.RIGHT_HIP], projection);
  const leftKnee = project(nl[PoseLandmarkIndex.LEFT_KNEE], projection);
  const rightKnee = project(nl[PoseLandmarkIndex.RIGHT_KNEE], projection);
  const leftAnkle = project(nl[PoseLandmarkIndex.LEFT_ANKLE], projection);
  const rightAnkle = project(nl[PoseLandmarkIndex.RIGHT_ANKLE], projection);

  const shoulderMid = project(
    midpoint(nl[PoseLandmarkIndex.LEFT_SHOULDER], nl[PoseLandmarkIndex.RIGHT_SHOULDER]),
    projection
  );

  const torsoPolygon = padPolygon(
    [leftShoulder, rightShoulder, rightHip, leftHip],
    TORSO_PADDING_FACTOR
  );

  const capsule = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    radiusUnits: number
  ): SilhouetteShape => ({
    kind: "capsule",
    x1: p1.x,
    y1: p1.y,
    x2: p2.x,
    y2: p2.y,
    r: radiusUnits * scale,
  });

  return [
    // Neck connector (visual continuity between head and torso).
    capsule(shoulderMid, nose, NECK_RADIUS_UNITS),
    { kind: "circle", cx: nose.x, cy: nose.y, r: HEAD_RADIUS_UNITS * scale },
    { kind: "polygon", points: torsoPolygon },
    capsule(leftShoulder, leftElbow, ARM_RADIUS_UNITS),
    capsule(leftElbow, leftWrist, FOREARM_RADIUS_UNITS),
    capsule(rightShoulder, rightElbow, ARM_RADIUS_UNITS),
    capsule(rightElbow, rightWrist, FOREARM_RADIUS_UNITS),
    capsule(leftHip, leftKnee, THIGH_RADIUS_UNITS),
    capsule(leftKnee, leftAnkle, SHIN_RADIUS_UNITS),
    capsule(rightHip, rightKnee, THIGH_RADIUS_UNITS),
    capsule(rightKnee, rightAnkle, SHIN_RADIUS_UNITS),
  ];
}

function traceShapePath(ctx: CanvasRenderingContext2D, shape: SilhouetteShape): void {
  ctx.beginPath();
  if (shape.kind === "circle") {
    ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
    return;
  }
  if (shape.kind === "polygon") {
    shape.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    return;
  }
  // Capsule: a "stadium" shape — two half-circle end-caps joined by straight sides.
  const { x1, y1, x2, y2, r } = shape;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const perpX = Math.cos(angle + Math.PI / 2) * r;
  const perpY = Math.sin(angle + Math.PI / 2) * r;
  ctx.moveTo(x1 + perpX, y1 + perpY);
  ctx.lineTo(x2 + perpX, y2 + perpY);
  ctx.arc(x2, y2, r, angle + Math.PI / 2, angle - Math.PI / 2, true);
  ctx.lineTo(x1 - perpX, y1 - perpY);
  ctx.arc(x1, y1, r, angle - Math.PI / 2, angle + Math.PI / 2, true);
  ctx.closePath();
}

export interface SilhouetteDrawOptions {
  fillColor?: string;
  fillOpacity?: number;
  outlineColor?: string;
  outlineOpacity?: number;
  outlineWidth?: number;
  dash?: number[];
}

const DEFAULT_SILHOUETTE_OPTIONS: Required<SilhouetteDrawOptions> = {
  fillColor: "#d1d5db", // gray-300
  fillOpacity: 0.5,
  outlineColor: "#9ca3af", // gray-400
  outlineOpacity: 0.75,
  outlineWidth: 1.5,
  dash: [6, 5],
};

/**
 * Draws the silhouette shapes onto a canvas: a uniformly semi-transparent
 * fill (composited via an offscreen buffer so overlapping shapes don't
 * darken at their seams) plus a dashed outline per shape.
 *
 * Note: the dashed line is traced per-shape rather than as one merged
 * outer contour, so at spots where two shapes overlap (e.g. torso and
 * upper arm) you may see a faint internal dashed seam. That's an accepted
 * trade-off for keeping this dependency-free — real contour extraction
 * would need an image-processing step (e.g. marching squares) that isn't
 * warranted for a soft positioning guide.
 */
export function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  shapes: SilhouetteShape[],
  options: SilhouetteDrawOptions = {}
): void {
  const opts = { ...DEFAULT_SILHOUETTE_OPTIONS, ...options };
  const targetCanvas = ctx.canvas;

  // Fill: render fully opaque onto an offscreen canvas first, then
  // composite that whole buffer at once with a single globalAlpha, so
  // overlapping shapes read as one uniform-opacity silhouette instead of
  // stacking alpha at the seams.
  const offscreen = document.createElement("canvas");
  offscreen.width = targetCanvas.width;
  offscreen.height = targetCanvas.height;
  const offCtx = offscreen.getContext("2d");
  if (offCtx) {
    offCtx.fillStyle = opts.fillColor;
    for (const shape of shapes) {
      traceShapePath(offCtx, shape);
      offCtx.fill();
    }
    ctx.save();
    ctx.globalAlpha = opts.fillOpacity;
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();
  }

  // Dashed outline, per shape.
  ctx.save();
  ctx.setLineDash(opts.dash);
  ctx.strokeStyle = opts.outlineColor;
  ctx.lineWidth = opts.outlineWidth;
  ctx.globalAlpha = opts.outlineOpacity;
  for (const shape of shapes) {
    traceShapePath(ctx, shape);
    ctx.stroke();
  }
  ctx.restore();
}
