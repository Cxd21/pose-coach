/**
 * Builds a real, segmentation-derived silhouette guide from a reference
 * photo's MediaPipe segmentation mask — as opposed to the joint-based
 * schematic shapes in `silhouette.ts` (circle for head, capsules for
 * limbs), which only approximate body shape from a handful of joint
 * positions and can look distorted/asymmetric for bent-arm or
 * foreshortened poses, since a capsule doesn't know anything about the
 * actual body outline between two joints.
 *
 * Pipeline:
 *   1. Fill: a flat grey silhouette shaped by the mask's per-pixel
 *      confidence (soft, anti-aliased edge) at a fixed, low opacity — the
 *      real detected body shape, not the photo's pixels.
 *   2. Contour: downsample the mask to a coarse grid, keep only its
 *      largest connected foreground blob (drops small noise regions),
 *      trace its outer boundary (Moore-neighbor tracing — a standard
 *      binary-image contour algorithm), then lightly smooth the result
 *      (Chaikin corner-cutting) so the coarse grid doesn't look blocky.
 *
 * Both steps run once per reference photo (not per frame), so the extra
 * work here is a one-time cost, not a live-loop concern.
 */

import type { SegmentationMask } from "@/lib/pose/types";
import type { Point2D } from "./angles";

export type { Point2D };

export interface ReferenceSilhouette {
  /** Flat grey silhouette fill, shaped by the mask, at the mask's native resolution. */
  fillCanvas: HTMLCanvasElement;
  /** Traced outer contour of the person, in fillCanvas's pixel coordinate space, as a closed loop. */
  contour: Point2D[];
  /** Bounding box of `contour`, in fillCanvas's pixel coordinate space — used to fit/center the guide in a camera frame. */
  bounds: { x: number; y: number; width: number; height: number };
}

export interface ReferenceSilhouetteOptions {
  /** 0-1 opacity of the grey fill. Spec target: 30-40%. */
  fillOpacity?: number;
  /** Hex color of the flat fill. */
  fillColor?: string;
  /** 0-1 confidence cutoff for "this pixel is the person", used for contour tracing. */
  maskThreshold?: number;
  /** Approximate max grid dimension used for contour tracing (coarser = smoother/faster, finer = more detail). */
  contourGridSize?: number;
  /** Chaikin corner-cutting smoothing passes applied to the traced contour. */
  smoothingIterations?: number;
}

const DEFAULTS: Required<ReferenceSilhouetteOptions> = {
  fillOpacity: 0.35,
  fillColor: "#ffffff",
  maskThreshold: 0.5,
  contourGridSize: 220,
  smoothingIterations: 2,
};

export function buildReferenceSilhouette(
  image: HTMLImageElement,
  mask: SegmentationMask,
  options: ReferenceSilhouetteOptions = {}
): ReferenceSilhouette {
  const opts = { ...DEFAULTS, ...options };

  // `image` is accepted for API stability (and in case a photo-accurate
  // fill mode is wanted again later) but the current fill style is a flat
  // grey silhouette, so the photo's pixels aren't needed here — only its
  // segmentation mask shape is.
  void image;

  const fillCanvas = buildFillCanvas(mask, opts.fillColor, opts.fillOpacity);
  const contour = traceContour(mask, opts);
  const bounds = computeBounds(contour);

  return { fillCanvas, contour, bounds };
}

// ---------------------------------------------------------------------------
// Step 1: flat grey silhouette fill, shaped by the real segmentation mask
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function buildFillCanvas(mask: SegmentationMask, fillColor: string, fillOpacity: number): HTMLCanvasElement {
  const { data, width, height } = mask;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const [r, g, b] = hexToRgb(fillColor);
  const imageData = ctx.createImageData(width, height);
  const pixels = imageData.data;
  for (let i = 0; i < data.length; i++) {
    pixels[i * 4] = r;
    pixels[i * 4 + 1] = g;
    pixels[i * 4 + 2] = b;
    // Mask value gives a soft, anti-aliased edge; multiplying by the fixed
    // fill opacity keeps the whole guide translucent per spec (30-40%).
    pixels[i * 4 + 3] = Math.round(255 * data[i] * fillOpacity);
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

// ---------------------------------------------------------------------------
// Step 2: real contour extraction (downsample → largest blob → trace → smooth)
// ---------------------------------------------------------------------------

function traceContour(mask: SegmentationMask, opts: Required<ReferenceSilhouetteOptions>): Point2D[] {
  const { grid, gridWidth, gridHeight, factor } = downsampleMask(mask, opts.contourGridSize);
  const rawBinary = binarize(grid, opts.maskThreshold);

  // Raw thresholded masks are ragged: small jagged notches and single-cell
  // protrusions along the edge are common (segmentation confidence dips
  // near hair, loose clothing, motion blur, etc). Moore-neighbor tracing
  // faithfully walks INTO and OUT of every one of those, which is exactly
  // what produces a chaotic zigzag/squiggle instead of a clean outline.
  // Morphological open (strips thin spikes/isolated noise) followed by
  // close (fills small notches/holes) gives the tracer a clean edge to
  // follow — this is the standard preprocessing step before any contour
  // extraction on a real (non-synthetic) mask.
  const opened = morphologicalOpen(rawBinary, gridWidth, gridHeight);
  const binary = morphologicalClose(opened, gridWidth, gridHeight);

  const largest = largestComponent(binary, gridWidth, gridHeight);
  if (!largest) return [];

  // If the "largest" surviving component is implausibly small relative to
  // the grid, segmentation likely failed (e.g. low subject/background
  // contrast) rather than just being a small person in frame — bail out
  // rather than tracing noise and rendering a broken guide.
  const totalCells = gridWidth * gridHeight;
  const largestCellCount = largest.reduce((sum, v) => sum + v, 0);
  if (largestCellCount < totalCells * 0.01) return [];

  const gridContour = traceMooreBoundary(largest, gridWidth, gridHeight);
  if (gridContour.length < 3) return [];

  const smoothed = chaikinSmooth(gridContour, opts.smoothingIterations);

  // Map grid coordinates back to the mask's (and fillCanvas's) full pixel space.
  // +0.5 * factor centers each traced point within the grid cell it came from.
  return smoothed.map((p) => ({
    x: p.x * factor + factor / 2,
    y: p.y * factor + factor / 2,
  }));
}

/** 3x3 dilation: a cell becomes foreground if any of its 8 neighbors (or itself) is foreground. */
function dilate(binary: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(binary.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let any = 0;
      for (let dy = -1; dy <= 1 && !any; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (binary[ny * width + nx] === 1) {
            any = 1;
            break;
          }
        }
      }
      out[y * width + x] = any;
    }
  }
  return out;
}

/** 3x3 erosion: a cell stays foreground only if all of its 8 neighbors (and itself) are foreground. */
function erode(binary: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(binary.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let all = 1;
      for (let dy = -1; dy <= 1 && all; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          // Treat out-of-bounds as background, so shapes erode inward at the image edge too.
          if (nx < 0 || ny < 0 || nx >= width || ny >= height || binary[ny * width + nx] === 0) {
            all = 0;
            break;
          }
        }
      }
      out[y * width + x] = all;
    }
  }
  return out;
}

/** Removes thin spikes and isolated noise cells (erode then dilate). */
function morphologicalOpen(binary: Uint8Array, width: number, height: number): Uint8Array {
  return dilate(erode(binary, width, height), width, height);
}

/** Fills small notches and holes (dilate then erode). */
function morphologicalClose(binary: Uint8Array, width: number, height: number): Uint8Array {
  return erode(dilate(binary, width, height), width, height);
}

/** Block-averages the mask down to a coarser grid, for fast/robust contour tracing. */
function downsampleMask(
  mask: SegmentationMask,
  maxGridDim: number
): { grid: Float32Array; gridWidth: number; gridHeight: number; factor: number } {
  const { data, width, height } = mask;
  const factor = Math.max(1, Math.ceil(Math.max(width, height) / maxGridDim));
  const gridWidth = Math.ceil(width / factor);
  const gridHeight = Math.ceil(height / factor);
  const grid = new Float32Array(gridWidth * gridHeight);
  const counts = new Int32Array(gridWidth * gridHeight);

  for (let y = 0; y < height; y++) {
    const gy = Math.floor(y / factor);
    for (let x = 0; x < width; x++) {
      const gx = Math.floor(x / factor);
      const gi = gy * gridWidth + gx;
      grid[gi] += data[y * width + x];
      counts[gi] += 1;
    }
  }
  for (let i = 0; i < grid.length; i++) {
    if (counts[i] > 0) grid[i] /= counts[i];
  }

  return { grid, gridWidth, gridHeight, factor };
}

function binarize(grid: Float32Array, threshold: number): Uint8Array {
  const out = new Uint8Array(grid.length);
  for (let i = 0; i < grid.length; i++) out[i] = grid[i] >= threshold ? 1 : 0;
  return out;
}

/**
 * Keeps only the largest foreground component (drops small noise blobs).
 * Uses 8-connectivity (not just up/down/left/right) because downsampling
 * can leave real body silhouettes connected only diagonally in narrow
 * spots (e.g. where the legs meet at the crotch) — 4-connectivity would
 * incorrectly treat the legs as separate components and drop them.
 */
function largestComponent(binary: Uint8Array, width: number, height: number): Uint8Array | null {
  const labels = new Int32Array(width * height).fill(-1);
  let bestLabel = -1;
  let bestSize = 0;
  let label = 0;
  const stack: number[] = [];
  const neighborOffsets: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];

  for (let start = 0; start < binary.length; start++) {
    if (binary[start] === 0 || labels[start] !== -1) continue;

    let size = 0;
    stack.push(start);
    labels[start] = label;
    while (stack.length > 0) {
      const idx = stack.pop() as number;
      size++;
      const x = idx % width;
      const y = Math.floor(idx / width);
      for (const [dx, dy] of neighborOffsets) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const nIdx = ny * width + nx;
        if (binary[nIdx] === 1 && labels[nIdx] === -1) {
          labels[nIdx] = label;
          stack.push(nIdx);
        }
      }
    }

    if (size > bestSize) {
      bestSize = size;
      bestLabel = label;
    }
    label++;
  }

  if (bestLabel === -1) return null;

  const result = new Uint8Array(width * height);
  for (let i = 0; i < result.length; i++) result[i] = labels[i] === bestLabel ? 1 : 0;
  return result;
}

/**
 * Moore-neighbor boundary tracing: walks the outer edge of a single binary
 * blob and returns an ordered sequence of grid points forming a closed
 * loop. Standard algorithm for tracing a binary image's contour.
 */
function traceMooreBoundary(binary: Uint8Array, width: number, height: number): Point2D[] {
  const isForeground = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && binary[y * width + x] === 1;

  let startX = -1;
  let startY = -1;
  outer: for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isForeground(x, y)) {
        startX = x;
        startY = y;
        break outer;
      }
    }
  }
  if (startX === -1) return [];

  // Clockwise 8-neighborhood, starting from "west".
  const dirs: [number, number][] = [
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
  ];

  const contour: Point2D[] = [];
  let curX = startX;
  let curY = startY;
  let backtrackDir = 0;
  const maxSteps = width * height * 8;
  let steps = 0;

  do {
    contour.push({ x: curX, y: curY });
    let found = false;
    for (let k = 0; k < 8; k++) {
      const dirIdx = (backtrackDir + 1 + k) % 8;
      const [dx, dy] = dirs[dirIdx];
      const nx = curX + dx;
      const ny = curY + dy;
      if (isForeground(nx, ny)) {
        curX = nx;
        curY = ny;
        backtrackDir = (dirIdx + 4) % 8;
        found = true;
        break;
      }
    }
    if (!found) break; // Isolated single pixel — nothing to trace around.
    steps++;
  } while (!(curX === startX && curY === startY) && steps < maxSteps);

  return contour;
}

/** Chaikin corner-cutting: rounds a polyline's corners over N iterations, smoothing away grid-following blockiness. */
function chaikinSmooth(points: Point2D[], iterations: number): Point2D[] {
  let pts = points;
  for (let iter = 0; iter < iterations; iter++) {
    const next: Point2D[] = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % n];
      next.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 });
      next.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 });
    }
    pts = next;
  }
  return pts;
}

function computeBounds(contour: Point2D[]): { x: number; y: number; width: number; height: number } {
  if (contour.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of contour) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
