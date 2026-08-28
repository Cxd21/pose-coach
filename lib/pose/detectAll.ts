import { detectPoseInImage } from "./landmarker";
import { detectFaceInImage } from "./faceLandmarker";
import { detectHandsInImage } from "./handLandmarker";
import type { CombinedDetectionResult } from "./types";

export async function detectFullBodyInImage(
  image: HTMLImageElement
): Promise<CombinedDetectionResult> {
  const [poseResult, faces, hands] = await Promise.all([
    detectPoseInImage(image),
    detectFaceInImage(image),
    detectHandsInImage(image),
  ]);

  return {
    imageWidth: poseResult.imageWidth,
    imageHeight: poseResult.imageHeight,
    poses: poseResult.poses,
    faces,
    hands,
    segmentationMask: poseResult.segmentationMask,
  };
}
