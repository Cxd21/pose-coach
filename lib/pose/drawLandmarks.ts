/**
 * Debug-only rendering helpers: draws detected pose landmarks/skeleton onto
 * a canvas. This is purely for development visualization — per the product
 * spec, the final app will NOT show a skeleton to end users. Keeping this in
 * its own module makes it easy to delete or gate behind a debug flag later
 * without touching the detection logic in landmarker.ts.
 */

import { POSE_CONNECTIONS } from "./types";
import type { NormalizedLandmark } from "./types";

export interface DrawOptions {
  pointColor?: string;
  lineColor?: string;
  pointRadius?: number;
  lineWidth?: number;
  /** Skip drawing landmarks below this visibility score (0-1). */
  minVisibility?: number;
}

const DEFAULT_OPTIONS: Required<DrawOptions> = {
  pointColor: "#22d3ee", // cyan-400
  lineColor: "#a3e635", // lime-400
  pointRadius: 5,
  lineWidth: 3,
  minVisibility: 0.3,
};

/**
 * Draws one detected pose's skeleton (connections) and joints (points) onto
 * a canvas, given normalized [0,1] landmark coordinates and the pixel size
 * the canvas is being rendered at.
 */
export function drawPoseSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  options: DrawOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const toPixel = (lm: NormalizedLandmark) => ({
    x: lm.x * canvasWidth,
    y: lm.y * canvasHeight,
  });

  const isVisible = (lm: NormalizedLandmark | undefined) =>
    !!lm && (lm.visibility === undefined || lm.visibility >= opts.minVisibility);

  // Bones first, so joints draw on top.
  ctx.strokeStyle = opts.lineColor;
  ctx.lineWidth = opts.lineWidth;
  for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    if (!isVisible(start) || !isVisible(end)) continue;

    const p1 = toPixel(start);
    const p2 = toPixel(end);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // Joints.
  ctx.fillStyle = opts.pointColor;
  for (const lm of landmarks) {
    if (!isVisible(lm)) continue;
    const p = toPixel(lm);
    ctx.beginPath();
    ctx.arc(p.x, p.y, opts.pointRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Convenience helper: clears the canvas and draws every detected pose on it.
 */
export function drawAllPoses(
  canvas: HTMLCanvasElement,
  poses: NormalizedLandmark[][],
  options?: DrawOptions
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const pose of poses) {
    drawPoseSkeleton(ctx, pose, canvas.width, canvas.height, options);
  }
}
