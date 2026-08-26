/**
 * MediaPipe Pose Landmarker wrapper.
 *
 * This is the ONLY file in the app that talks to @mediapipe/tasks-vision
 * directly. Everything else (UI components, future pose-comparison logic)
 * should import from this module and from `./types`, not from the
 * MediaPipe package itself. This keeps the CV foundation swappable and
 * keeps MediaPipe's API surface out of the React components.
 *
 * This module is browser-only: MediaPipe Tasks Vision uses WASM + (optionally)
 * WebGL/WebGPU, both of which require a `window`/`document`. Do not import
 * this file in a server component or during SSR.
 */

import {
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { NormalizedLandmark, PoseDetectionResult } from "./types";
import { getVisionFileset } from "./visionRuntime";

// Official Google-hosted pose landmarker model. We use "full" rather than
// "lite": lite frequently mislocates limbs in harder poses (crossed/bent
// legs, occluded joints — exactly the kind of reference photos this app
// needs to handle), and "full" fixes most of that at a modest speed cost
// that's a non-issue for single-image (non-live-video) detection. If we
// later need this to run in real time on live camera frames and it's too
// slow, drop back to pose_landmarker_lite.task; for even higher accuracy,
// pose_landmarker_heavy.task is the next step up from "full".
const MODEL_ASSET_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

/**
 * Lazily creates (and caches) a single PoseLandmarker instance configured
 * for single-image ("IMAGE" running mode) detection. Subsequent calls reuse
 * the same instance instead of re-downloading/re-initializing the model.
 */
async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await getVisionFileset();
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_URL,
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numPoses: 1,
        // Slightly below the library default (0.5) so limbs that are
        // partially self-occluded (e.g. a bent/crossed raised leg) are
        // still reported instead of being dropped from the result.
        minPosePresenceConfidence: 0.4,
      });
    })();
  }
  return landmarkerPromise;
}

/**
 * Runs pose detection on a single, already-loaded HTMLImageElement.
 *
 * @param image An image element (e.g. from an <img> the user uploaded) that
 *   has finished loading (`image.complete === true`).
 * @returns Detected poses in normalized [0,1] coordinates, plus the image
 *   dimensions used for detection.
 */
export async function detectPoseInImage(
  image: HTMLImageElement
): Promise<PoseDetectionResult> {
  const landmarker = await getPoseLandmarker();

  const result: PoseLandmarkerResult = landmarker.detect(image);

  const poses: NormalizedLandmark[][] = result.landmarks.map((landmarkList) =>
    landmarkList.map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility,
    }))
  );

  return {
    poses,
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
  };
}

/**
 * Releases the underlying MediaPipe/WASM resources. Call this if you need
 * to free GPU/WASM memory (e.g. on hot-reload in dev). Not required for
 * normal page usage.
 */
export async function disposePoseLandmarker(): Promise<void> {
  if (landmarkerPromise) {
    const landmarker = await landmarkerPromise;
    landmarker.close();
    landmarkerPromise = null;
  }
}
