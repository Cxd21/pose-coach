import { FaceLandmarker, type FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import type { NormalizedLandmark } from "./types";
import { getVisionFileset } from "./visionRuntime";

const MODEL_ASSET_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null;

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

function toConnectionPairs(
  connections: { start: number; end: number }[]
): ReadonlyArray<readonly [number, number]> {
  return connections.map((c) => [c.start, c.end] as const);
}

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
