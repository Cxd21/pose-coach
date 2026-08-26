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
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { NormalizedLandmark, PoseDetectionResult } from "./types";

// MediaPipe ships its WASM binaries on a public CDN, versioned to match
// the npm package. Pinning the version avoids surprise breakage.
// This must match the installed "@mediapipe/tasks-vision" version in
// package.json — bump both together.
const WASM_FILESET_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

// Official Google-hosted pose landmarker model. "lite" is smallest/fastest;
// swap to pose_landmarker_full.task or pose_landmarker_heavy.task later for
// more accuracy at the cost of speed, once we care about live-video framerate.
const MODEL_ASSET_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

/**
 * Lazily creates (and caches) a single PoseLandmarker instance configured
 * for single-image ("IMAGE" running mode) detection. Subsequent calls reuse
 * the same instance instead of re-downloading/re-initializing the model.
 */
async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_FILESET_URL);
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_URL,
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numPoses: 1,
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
