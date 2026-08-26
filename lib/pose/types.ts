/**
 * Domain types for pose detection results.
 *
 * We deliberately re-declare a minimal shape here instead of exporting
 * MediaPipe's own types everywhere else in the app. That way, if we ever
 * swap the underlying pose model, only this file + landmarker.ts need to
 * change — the UI and any future comparison logic depend on this contract,
 * not on MediaPipe directly.
 */

/** A single 2D/3D landmark point, normalized to [0, 1] relative to image size. */
export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  /** Model's confidence that this landmark is visible (not occluded). 0-1. */
  visibility?: number;
}

/** Same as NormalizedLandmark but in absolute pixel coordinates for a given image size. */
export interface PixelLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/** Result of running pose detection on a single image. */
export interface PoseDetectionResult {
  /** One entry per detected person. MediaPipe Pose Landmarker can detect multiple poses. */
  poses: NormalizedLandmark[][];
  /** Width/height of the image that was analyzed, in pixels. Needed to convert to pixel coords. */
  imageWidth: number;
  imageHeight: number;
}

/** One detected hand: its 21 landmarks plus which hand it is. */
export interface HandDetectionEntry {
  landmarks: NormalizedLandmark[];
  handedness: "Left" | "Right";
  /** Model's confidence in the handedness classification, 0-1. */
  score: number;
}

/**
 * Combined result of running body pose, face mesh, and hand detection on
 * the same image. This is what the debug UI consumes — it doesn't need to
 * know these came from three separate MediaPipe models under the hood.
 */
export interface CombinedDetectionResult {
  imageWidth: number;
  imageHeight: number;
  /** Body pose landmarks, one entry per detected person (33 points each). */
  poses: NormalizedLandmark[][];
  /** Detailed face mesh landmarks, one entry per detected face (478 points each). */
  faces: NormalizedLandmark[][];
  /** Detected hands, each with 21 finger-joint landmarks. */
  hands: HandDetectionEntry[];
}

/** The 33 landmark indices used by the MediaPipe Pose Landmarker model, named for readability. */
export enum PoseLandmarkIndex {
  NOSE = 0,
  LEFT_EYE_INNER = 1,
  LEFT_EYE = 2,
  LEFT_EYE_OUTER = 3,
  RIGHT_EYE_INNER = 4,
  RIGHT_EYE = 5,
  RIGHT_EYE_OUTER = 6,
  LEFT_EAR = 7,
  RIGHT_EAR = 8,
  MOUTH_LEFT = 9,
  MOUTH_RIGHT = 10,
  LEFT_SHOULDER = 11,
  RIGHT_SHOULDER = 12,
  LEFT_ELBOW = 13,
  RIGHT_ELBOW = 14,
  LEFT_WRIST = 15,
  RIGHT_WRIST = 16,
  LEFT_PINKY = 17,
  RIGHT_PINKY = 18,
  LEFT_INDEX = 19,
  RIGHT_INDEX = 20,
  LEFT_THUMB = 21,
  RIGHT_THUMB = 22,
  LEFT_HIP = 23,
  RIGHT_HIP = 24,
  LEFT_KNEE = 25,
  RIGHT_KNEE = 26,
  LEFT_ANKLE = 27,
  RIGHT_ANKLE = 28,
  LEFT_HEEL = 29,
  RIGHT_HEEL = 30,
  LEFT_FOOT_INDEX = 31,
  RIGHT_FOOT_INDEX = 32,
}

/** Bone connections between landmark indices, used for drawing a skeleton overlay. */
export const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  // Face
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Left leg
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Right leg
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];
