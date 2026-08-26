/**
 * Runs body pose, face mesh, and hand detection on the same image and
 * merges the results. This is the main entry point UI code should use
 * (`detectFullBodyInImage`) — it hides the fact that three separate
 * MediaPipe models are involved behind one call and one result shape.
 *
 * The three detectors are independent MediaPipe tasks with no shared
 * state, so they run concurrently rather than sequentially.
 */

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
  };
}
