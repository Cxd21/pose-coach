import { PoseLandmarkIndex, type NormalizedLandmark } from "@/lib/pose/types";
import type { NormalizedPoseLandmark, PoseNormalizationInfo } from "./types";

export interface NormalizedPose {
  landmarks: NormalizedPoseLandmark[];
  info: PoseNormalizationInfo;
}

const MIN_SCALE = 1e-6;

function midpoint(a: NormalizedLandmark, b: NormalizedLandmark) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function normalizePoseLandmarks(landmarks: NormalizedLandmark[]): NormalizedPose {
  const leftShoulder = landmarks[PoseLandmarkIndex.LEFT_SHOULDER];
  const rightShoulder = landmarks[PoseLandmarkIndex.RIGHT_SHOULDER];
  const leftHip = landmarks[PoseLandmarkIndex.LEFT_HIP];
  const rightHip = landmarks[PoseLandmarkIndex.RIGHT_HIP];

  const hipCenter = midpoint(leftHip, rightHip);
  const shoulderCenter = midpoint(leftShoulder, rightShoulder);

  const torsoLength = Math.hypot(
    shoulderCenter.x - hipCenter.x,
    shoulderCenter.y - hipCenter.y
  );
  const scale = torsoLength > MIN_SCALE ? torsoLength : MIN_SCALE;

  const normalizedLandmarks: NormalizedPoseLandmark[] = landmarks.map((lm) => ({
    x: (lm.x - hipCenter.x) / scale,
    y: (lm.y - hipCenter.y) / scale,
    z: (lm.z ?? 0) / scale,
    visibility: lm.visibility ?? 1,
  }));

  return {
    landmarks: normalizedLandmarks,
    info: {
      originX: hipCenter.x,
      originY: hipCenter.y,
      scale,
      referenceMetric: "torso length (mid-shoulder to mid-hip distance)",
    },
  };
}
