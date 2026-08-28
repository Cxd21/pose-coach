import {
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { NormalizedLandmark, PoseDetectionResult, RawSegmentationMask } from "./types";
import { getVisionFileset } from "./visionRuntime";

const MODEL_ASSET_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

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
        minPosePresenceConfidence: 0.4,
        outputSegmentationMasks: true,
      });
    })();
  }
  return landmarkerPromise;
}

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

  let segmentationMask: RawSegmentationMask | null = null;
  if (result.segmentationMasks && result.segmentationMasks.length > 0) {
    const mask = result.segmentationMasks[0];
    try {
      if (typeof mask.getAsFloat32Array === "function") {
        const raw = mask.getAsFloat32Array();
        segmentationMask = {
          data: new Float32Array(raw),
          width: mask.width,
          height: mask.height,
        };
      }
    } catch (err) {
      console.warn("Could not extract segmentation mask array:", err);
    } finally {
      if (typeof mask.close === "function") {
        mask.close();
      }
    }
  }

  return {
    poses,
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
    segmentationMask,
  };
}

export async function disposePoseLandmarker(): Promise<void> {
  if (landmarkerPromise) {
    const landmarker = await landmarkerPromise;
    landmarker.close();
    landmarkerPromise = null;
  }
}

let videoLandmarkerPromise: Promise<PoseLandmarker> | null = null;

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

export async function disposeVideoPoseLandmarker(): Promise<void> {
  if (videoLandmarkerPromise) {
    const landmarker = await videoLandmarkerPromise;
    landmarker.close();
    videoLandmarkerPromise = null;
  }
}
