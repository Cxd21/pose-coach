import { HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";
import type { HandDetectionEntry } from "./types";
import { getVisionFileset } from "./visionRuntime";

const MODEL_ASSET_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

let handLandmarkerPromise: Promise<HandLandmarker> | null = null;

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

export async function detectHandsInImage(
  image: HTMLImageElement
): Promise<HandDetectionEntry[]> {
  const landmarker = await getHandLandmarker();
  const result: HandLandmarkerResult = landmarker.detect(image);

  return result.landmarks.map((landmarks, i) => {
    const topCategory = result.handedness[i]?.[0];
    return {
      landmarks: landmarks.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z })),
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

export const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> =
  HandLandmarker.HAND_CONNECTIONS.map((c) => [c.start, c.end] as const);
