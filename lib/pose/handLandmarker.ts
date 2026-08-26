/**
 * MediaPipe Hand Landmarker wrapper.
 *
 * The body Pose Landmarker only reports 3 sparse points per hand (wrist,
 * index knuckle, pinky knuckle) — no individual finger joints. This module
 * runs MediaPipe's dedicated Hand Landmarker model, which reports all 21
 * landmarks per hand (each finger's base/mid/tip joints plus the wrist),
 * enabling an actual finger skeleton in the debug overlay. This is the
 * third file (alongside landmarker.ts and faceLandmarker.ts) allowed to
 * import @mediapipe/tasks-vision directly.
 *
 * Browser-only, same caveat as landmarker.ts: do not import during SSR.
 */

import { HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";
import type { HandDetectionEntry } from "./types";
import { getVisionFileset } from "./visionRuntime";

// Official Google-hosted hand landmarker model (21-point-per-hand).
const MODEL_ASSET_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

let handLandmarkerPromise: Promise<HandLandmarker> | null = null;

/** Lazily creates (and caches) a single HandLandmarker instance. */
async function getHandLandmarker(): Promise<HandLandmarker> {
  if (!handLandmarkerPromise) {
    handLandmarkerPromise = (async () => {
      const vision = await getVisionFileset();
      return HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_URL,
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numHands: 2,
      });
    })();
  }
  return handLandmarkerPromise;
}

/**
 * Runs hand-landmark detection on a single, already-loaded HTMLImageElement.
 * Returns up to two detected hands, each with 21 finger-joint landmarks and
 * a Left/Right classification.
 */
export async function detectHandsInImage(
  image: HTMLImageElement
): Promise<HandDetectionEntry[]> {
  const landmarker = await getHandLandmarker();
  const result: HandLandmarkerResult = landmarker.detect(image);

  return result.landmarks.map((landmarks, i) => {
    const topCategory = result.handedness[i]?.[0];
    return {
      landmarks: landmarks.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z })),
      // MediaPipe's "Left"/"Right" label is from the subject's own
      // perspective (mirrors real-world handedness), not screen-left/right.
      handedness: (topCategory?.categoryName as "Left" | "Right") ?? "Left",
      score: topCategory?.score ?? 0,
    };
  });
}

export async function disposeHandLandmarker(): Promise<void> {
  if (handLandmarkerPromise) {
    const landmarker = await handLandmarkerPromise;
    landmarker.close();
    handLandmarkerPromise = null;
  }
}

/**
 * Official 21-point hand-skeleton connector set (wrist + 4 joints per
 * finger), converted to the plain [number, number] tuple shape used
 * elsewhere in lib/pose so drawLandmarks.ts doesn't need to import
 * @mediapipe/tasks-vision itself.
 */
export const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> =
  HandLandmarker.HAND_CONNECTIONS.map((c) => [c.start, c.end] as const);
