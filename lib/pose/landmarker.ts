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
import type { NormalizedLandmark, PoseDetectionResult, SegmentationMask } from "./types";
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
        // Needed to build a real, photo-accurate body silhouette for the
        // reference-pose overlay (see lib/pose-processing/referenceSilhouette.ts)
        // instead of approximating body shape from joint positions. Only
        // requested here (image mode, run once per reference photo) — not
        // on the video-mode landmarker below, since the live loop doesn't
        // need it and computing it every frame would be wasted work.
        outputSegmentationMasks: true,
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

  // MPMask wraps a WASM/GPU-owned buffer. getAsFloat32Array() copies the
  // data into a plain JS array we own, so it's safe to use after close().
  let segmentationMask: SegmentationMask | undefined;
  const rawMask = result.segmentationMasks?.[0];
  if (rawMask) {
    segmentationMask = {
      data: rawMask.getAsFloat32Array(),
      width: rawMask.width,
      height: rawMask.height,
    };
    rawMask.close();
  }

  return {
    poses,
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
    segmentationMask,
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

// ---------------------------------------------------------------------------
// Video (live camera) detection.
//
// MediaPipe requires a landmarker instance's `runningMode` to be fixed at
// creation time — an "IMAGE" mode instance (above) cannot be reused for
// continuous video frames; MediaPipe's VIDEO mode also applies temporal
// smoothing between frames, which meaningfully improves live-camera
// stability over calling .detect() repeatedly. So live camera needs its own
// instance, but it intentionally reuses the exact same model URL and the
// same shared `getVisionFileset()` as the image-mode path above — nothing
// about which model we use, or how the WASM runtime is loaded, is
// duplicated or re-decided here.
// ---------------------------------------------------------------------------

let videoLandmarkerPromise: Promise<PoseLandmarker> | null = null;

/** Lazily creates (and caches) a single PoseLandmarker instance configured for live video. */
async function getVideoPoseLandmarker(): Promise<PoseLandmarker> {
  if (!videoLandmarkerPromise) {
    videoLandmarkerPromise = (async () => {
      const vision = await getVisionFileset();
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_URL,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPosePresenceConfidence: 0.4,
      });
    })();
  }
  return videoLandmarkerPromise;
}

/**
 * Runs pose detection on a single live video frame. Call this once per
 * animation frame from a requestAnimationFrame loop.
 *
 * @param video A `<video>` element currently playing the camera stream.
 * @param timestampMs A monotonically increasing timestamp in milliseconds
 *   (e.g. from `performance.now()`) — MediaPipe's VIDEO mode requires
 *   strictly increasing timestamps across calls to detect motion correctly.
 */
export async function detectPoseInVideoFrame(
  video: HTMLVideoElement,
  timestampMs: number
): Promise<PoseDetectionResult> {
  const landmarker = await getVideoPoseLandmarker();

  const result: PoseLandmarkerResult = landmarker.detectForVideo(video, timestampMs);

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
    imageWidth: video.videoWidth,
    imageHeight: video.videoHeight,
  };
}

/** Releases the video-mode landmarker's resources (call when the camera view unmounts). */
export async function disposeVideoPoseLandmarker(): Promise<void> {
  if (videoLandmarkerPromise) {
    const landmarker = await videoLandmarkerPromise;
    landmarker.close();
    videoLandmarkerPromise = null;
  }
}
