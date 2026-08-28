import type { NormalizedLandmark, RawSegmentationMask } from "@/lib/pose/types";
import { normalizePoseLandmarks } from "./normalize";
import {
  buildHeadZone,
  buildTorsoZone,
  buildLeftArmZone,
  buildRightArmZone,
  buildLeftLegZone,
  buildRightLegZone,
} from "./zones";
import { extractSilhouetteFromMask, buildFallbackSilhouette } from "./silhouette";
import type { PoseRepresentation, ReferenceSilhouette } from "./types";

export function buildPoseRepresentation(
  landmarks: NormalizedLandmark[],
  segmentationMask?: RawSegmentationMask | null,
  imageWidth?: number,
  imageHeight?: number
): PoseRepresentation {
  const { landmarks: normalizedLandmarks, info } = normalizePoseLandmarks(landmarks);

  let silhouette: ReferenceSilhouette | undefined = undefined;
  const refW = imageWidth && imageWidth > 0 ? imageWidth : 1000;
  const refH = imageHeight && imageHeight > 0 ? imageHeight : 1000;

  if (segmentationMask && segmentationMask.data && segmentationMask.width > 0) {
    silhouette = extractSilhouetteFromMask(
      segmentationMask.data,
      segmentationMask.width,
      segmentationMask.height,
      landmarks,
      refW,
      refH
    );
  } else {
    silhouette = buildFallbackSilhouette(landmarks, refW, refH);
  }

  return {
    head: buildHeadZone(normalizedLandmarks),
    torso: buildTorsoZone(normalizedLandmarks),
    leftArm: buildLeftArmZone(normalizedLandmarks),
    rightArm: buildRightArmZone(normalizedLandmarks),
    leftLeg: buildLeftLegZone(normalizedLandmarks),
    rightLeg: buildRightLegZone(normalizedLandmarks),
    normalizedLandmarks,
    normalization: info,
    silhouette,
  };
}
