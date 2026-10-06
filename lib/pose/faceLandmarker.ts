/**
 * MediaPipe Face Landmarker wrapper.
 *
 * The body Pose Landmarker (landmarker.ts) only reports ~10 sparse face
 * points (nose, eyes, ears, mouth corners) — not enough to render a
 * recognizable head. This module runs MediaPipe's dedicated Face Landmarker
 * model, which produces a 478-point face mesh with real eyes, eyebrows,
 * lips, and a face outline, and is the second file (alongside landmarker.ts
 * and handLandmarker.ts) allowed to import @mediapipe/tasks-vision directly.
 * UI and drawing code should import from `./index` or `./types`, not from
 * @mediapipe/tasks-vision itself.
 *
 * Browser-only, same caveat as landmarker.ts: do not import during SSR.
 */

import { FaceLandmarker, type FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import type { NormalizedLandmark } from "./types";
import { getVisionFileset } from "./visionRuntime";

// Official Google-hosted face landmarker model (478-point mesh).
const MODEL_ASSET_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null;

/** Lazily creates (and caches) a single FaceLandmarker instance. */
async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = (async () => {
      const vision = await getVisionFileset();
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_URL,
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numFaces: 1,
      });
    })();
  }
  return faceLandmarkerPromise;
}

/**
 * Runs face-mesh detection on a single, already-loaded HTMLImageElement.
 * Returns one 478-point landmark list per detected face (usually zero or
 * one, since numFaces is set to 1 above).
 */
export async function detectFaceInImage(
  image: HTMLImageElement
): Promise<NormalizedLandmark[][]> {
  const landmarker = await getFaceLandmarker();
  const result: FaceLandmarkerResult = landmarker.detect(image);

  return result.faceLandmarks.map((landmarkList) =>
    landmarkList.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z }))
  );
}

export async function disposeFaceLandmarker(): Promise<void> {
  if (faceLandmarkerPromise) {
    const landmarker = await faceLandmarkerPromise;
    landmarker.close();
    faceLandmarkerPromise = null;
  }
}

/**
 * Converts a MediaPipe Connection[] (a list of {start, end} pairs) into the
 * plain [number, number] tuple shape used everywhere else in lib/pose, so
 * drawing code (drawLandmarks.ts) never has to import @mediapipe/tasks-vision
 * itself — it only depends on these plain data exports.
 */
function toConnectionPairs(
  connections: { start: number; end: number }[]
): ReadonlyArray<readonly [number, number]> {
  return connections.map((c) => [c.start, c.end] as const);
}

// Official per-feature connector sets for the 478-point face mesh. Drawing
// just these (rather than the full ~5000-edge FACE_LANDMARKS_TESSELATION)
// gives a clean, recognizable face outline instead of a dense mesh overlay.
export const FACE_OVAL_CONNECTIONS = toConnectionPairs(FaceLandmarker.FACE_LANDMARKS_FACE_OVAL);
export const FACE_LEFT_EYE_CONNECTIONS = toConnectionPairs(FaceLandmarker.FACE_LANDMARKS_LEFT_EYE);
export const FACE_RIGHT_EYE_CONNECTIONS = toConnectionPairs(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE);
export const FACE_LEFT_EYEBROW_CONNECTIONS = toConnectionPairs(
  FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW
);
export const FACE_RIGHT_EYEBROW_CONNECTIONS = toConnectionPairs(
  FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW
);
export const FACE_LIPS_CONNECTIONS = toConnectionPairs(FaceLandmarker.FACE_LANDMARKS_LIPS);
