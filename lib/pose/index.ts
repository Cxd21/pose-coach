// Body pose (single MediaPipe model).
export { detectPoseInImage, disposePoseLandmarker } from "./landmarker";

// Face mesh (478 points) — for a properly defined head in the debug overlay.
export { detectFaceInImage, disposeFaceLandmarker } from "./faceLandmarker";

// Hands (21 points each, includes finger joints).
export { detectHandsInImage, disposeHandLandmarker } from "./handLandmarker";

// Combined orchestrator — the function UI code should call.
export { detectFullBodyInImage } from "./detectAll";

// Debug-only canvas rendering.
export {
  drawPoseSkeleton,
  drawFaceMesh,
  drawHandSkeleton,
  drawFullBodyDetection,
} from "./drawLandmarks";
export type { DrawOptions } from "./drawLandmarks";

// Shared types + constants.
export { PoseLandmarkIndex, POSE_CONNECTIONS } from "./types";
export type {
  NormalizedLandmark,
  PixelLandmark,
  PoseDetectionResult,
  HandDetectionEntry,
  CombinedDetectionResult,
} from "./types";
