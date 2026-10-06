/**
 * Pose normalization: converts MediaPipe's raw, image-relative landmarks
 * into landmarks centered and scaled to the subject's own body, so two
 * different people (or the same person at a different distance/position
 * from the camera) produce comparable numbers.
 *
 * Method (see the longer explanation in the project notes / chat):
 *   1. Translate: shift every landmark so the midpoint between the hips
 *      (`hipCenter`) becomes (0, 0).
 *   2. Scale: divide every coordinate by the torso length — the distance
 *      between the shoulder midpoint and the hip midpoint. This turns
 *      absolute image-relative distances into "torso units".
 *
 * Torso length is used as the scale reference (rather than, say, overall
 * bounding-box height) because it stays roughly constant regardless of
 * pose — raising an arm or bending a knee doesn't change torso length,
 * whereas it does change bounding-box height. That makes it a stable
 * "ruler" for comparing two different poses of two different people.
 */

import { PoseLandmarkIndex, type NormalizedLandmark } from "@/lib/pose/types";
import type { NormalizedPoseLandmark, PoseNormalizationInfo } from "./types";

export interface NormalizedPose {
  /** All 33 landmarks after normalization, indexed identically to PoseLandmarkIndex. */
  landmarks: NormalizedPoseLandmark[];
  info: PoseNormalizationInfo;
}

// Guards against dividing by ~0 for a degenerate detection (e.g. a single
// point where shoulders and hips were detected at nearly the same spot).
const MIN_SCALE = 1e-6;

function midpoint(a: NormalizedLandmark, b: NormalizedLandmark) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Normalizes a full 33-point MediaPipe pose landmark array. Expects the
 * standard MediaPipe Pose Landmarker output shape (see lib/pose/types.ts
 * PoseLandmarkIndex for what each index means).
 */
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
    // Visibility is a confidence score, not a spatial coordinate — passed
    // through unchanged rather than normalized.
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
