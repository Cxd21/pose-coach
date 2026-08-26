/**
 * Debug-only rendering helpers: draws detected body pose, face mesh, and
 * hand skeletons onto a canvas. This is purely for development
 * visualization — per the product spec, the final app will NOT show any
 * of this to end users. Keeping it in its own module makes it easy to
 * delete or gate behind a debug flag later without touching detection
 * logic in landmarker.ts / faceLandmarker.ts / handLandmarker.ts.
 *
 * This file intentionally never imports @mediapipe/tasks-vision directly —
 * it only consumes plain data (landmark arrays, connection-index tuples)
 * exported from the three landmarker modules and from ./types.
 */

import { POSE_CONNECTIONS } from "./types";
import type { NormalizedLandmark, HandDetectionEntry, CombinedDetectionResult } from "./types";
import {
  FACE_OVAL_CONNECTIONS,
  FACE_LEFT_EYE_CONNECTIONS,
  FACE_RIGHT_EYE_CONNECTIONS,
  FACE_LEFT_EYEBROW_CONNECTIONS,
  FACE_RIGHT_EYEBROW_CONNECTIONS,
  FACE_LIPS_CONNECTIONS,
} from "./faceLandmarker";
import { HAND_CONNECTIONS } from "./handLandmarker";

export interface DrawOptions {
  pointColor?: string;
  lineColor?: string;
  pointRadius?: number;
  lineWidth?: number;
  /** Skip drawing landmarks below this visibility score (0-1). Body pose only. */
  minVisibility?: number;
  /** Color for the face mesh outline (eyes, eyebrows, lips, face oval). */
  faceColor?: string;
  /** Color for hand/finger skeletons. */
  handColor?: string;
  /** Joint dot radius for hand landmarks (kept smaller than body joints — 21 points per hand is dense). */
  handPointRadius?: number;
}

const DEFAULT_OPTIONS: Required<DrawOptions> = {
  pointColor: "#22d3ee", // cyan-400 — body joints
  lineColor: "#a3e635", // lime-400 — body bones
  pointRadius: 5,
  lineWidth: 3,
  minVisibility: 0.3,
  faceColor: "#f472b6", // pink-400 — face mesh
  handColor: "#fbbf24", // amber-400 — hand/finger skeleton
  handPointRadius: 2.5,
};

function toPixel(lm: NormalizedLandmark, width: number, height: number) {
  return { x: lm.x * width, y: lm.y * height };
}

function drawConnections(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  connections: ReadonlyArray<readonly [number, number]>,
  width: number,
  height: number
): void {
  for (const [startIdx, endIdx] of connections) {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    if (!start || !end) continue;
    const p1 = toPixel(start, width, height);
    const p2 = toPixel(end, width, height);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
}

/**
 * Draws one detected body pose's skeleton (connections) and joints (points)
 * onto a canvas, given normalized [0,1] landmark coordinates.
 */
export function drawPoseSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  options: DrawOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const isVisible = (lm: NormalizedLandmark | undefined) =>
    !!lm && (lm.visibility === undefined || lm.visibility >= opts.minVisibility);

  // Bones first, so joints draw on top. Skip any bone touching a low-visibility joint.
  ctx.strokeStyle = opts.lineColor;
  ctx.lineWidth = opts.lineWidth;
  const visibleConnections = POSE_CONNECTIONS.filter(
    ([s, e]) => isVisible(landmarks[s]) && isVisible(landmarks[e])
  );
  drawConnections(ctx, landmarks, visibleConnections, canvasWidth, canvasHeight);

  // Joints.
  ctx.fillStyle = opts.pointColor;
  for (const lm of landmarks) {
    if (!isVisible(lm)) continue;
    const p = toPixel(lm, canvasWidth, canvasHeight);
    ctx.beginPath();
    ctx.arc(p.x, p.y, opts.pointRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draws a defined head: face outline, eyes, eyebrows, and lips from the
 * 478-point face mesh (rather than the full dense tesselation, which would
 * look cluttered). No joint dots are drawn for the face — contour lines
 * alone read clearly as a face at debug-overlay scale.
 */
export function drawFaceMesh(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  options: DrawOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  ctx.strokeStyle = opts.faceColor;
  ctx.lineWidth = 1.5;

  for (const connections of [
    FACE_OVAL_CONNECTIONS,
    FACE_LEFT_EYE_CONNECTIONS,
    FACE_RIGHT_EYE_CONNECTIONS,
    FACE_LEFT_EYEBROW_CONNECTIONS,
    FACE_RIGHT_EYEBROW_CONNECTIONS,
    FACE_LIPS_CONNECTIONS,
  ]) {
    drawConnections(ctx, landmarks, connections, canvasWidth, canvasHeight);
  }
}

/**
 * Draws one hand's 21-point finger skeleton (wrist + 4 joints per finger).
 */
export function drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  hand: HandDetectionEntry,
  canvasWidth: number,
  canvasHeight: number,
  options: DrawOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  ctx.strokeStyle = opts.handColor;
  ctx.lineWidth = 2;
  drawConnections(ctx, hand.landmarks, HAND_CONNECTIONS, canvasWidth, canvasHeight);

  ctx.fillStyle = opts.handColor;
  for (const lm of hand.landmarks) {
    const p = toPixel(lm, canvasWidth, canvasHeight);
    ctx.beginPath();
    ctx.arc(p.x, p.y, opts.handPointRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Convenience helper: clears the canvas and draws every detected body
 * pose, face, and hand from a combined detection result.
 */
export function drawFullBodyDetection(
  canvas: HTMLCanvasElement,
  result: CombinedDetectionResult,
  options?: DrawOptions
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const pose of result.poses) {
    drawPoseSkeleton(ctx, pose, canvas.width, canvas.height, options);
  }
  for (const face of result.faces) {
    drawFaceMesh(ctx, face, canvas.width, canvas.height, options);
  }
  for (const hand of result.hands) {
    drawHandSkeleton(ctx, hand, canvas.width, canvas.height, options);
  }
}
