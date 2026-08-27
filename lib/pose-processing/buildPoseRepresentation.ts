/**
 * Main entry point for pose-processing: converts MediaPipe's raw 33-point
 * pose landmarks into a normalized, zone-structured representation.
 *
 * This is the function other code (UI, and later, pose-comparison logic)
 * should call — it hides the two internal steps (normalize, then build
 * zones) behind one call and one result shape.
 */

import type { NormalizedLandmark } from "@/lib/pose/types";
import { normalizePoseLandmarks } from "./normalize";
import {
  buildHeadZone,
  buildTorsoZone,
  buildLeftArmZone,
  buildRightArmZone,
  buildLeftLegZone,
  buildRightLegZone,
} from "./zones";
import type { PoseRepresentation } from "./types";

/**
 * @param landmarks Raw 33-point pose landmarks, as produced by
 *   `detectPoseInImage` / `detectFullBodyInImage` from lib/pose (one
 *   entry from the `poses` array — i.e. a single detected person).
 */
export function buildPoseRepresentation(landmarks: NormalizedLandmark[]): PoseRepresentation {
  const { landmarks: normalizedLandmarks, info } = normalizePoseLandmarks(landmarks);

  return {
    head: buildHeadZone(normalizedLandmarks),
    torso: buildTorsoZone(normalizedLandmarks),
    leftArm: buildLeftArmZone(normalizedLandmarks),
    rightArm: buildRightArmZone(normalizedLandmarks),
    leftLeg: buildLeftLegZone(normalizedLandmarks),
    rightLeg: buildRightLegZone(normalizedLandmarks),
    normalizedLandmarks,
    normalization: info,
  };
}
