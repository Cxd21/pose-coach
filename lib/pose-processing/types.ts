/**
 * Types for the structured, normalization-aware pose representation.
 *
 * These describe the OUTPUT of pose-processing (this module), as distinct
 * from lib/pose/types.ts, which describes the raw MediaPipe DETECTION
 * output. This module consumes lib/pose's `NormalizedLandmark` /
 * `PoseLandmarkIndex` as input rather than redefining them.
 */

/** A landmark after translation + scale normalization (see normalize.ts). */
export interface NormalizedPoseLandmark {
  /** Position relative to hip-center, in "torso units" (see PoseNormalizationInfo.referenceMetric). */
  x: number;
  y: number;
  /** Relative depth, scaled the same as x/y. MediaPipe's z is a rough estimate — treat as lower-confidence than x/y. */
  z: number;
  /** Carried over unchanged from the raw MediaPipe landmark (defaults to 1 if MediaPipe omitted it). */
  visibility: number;
}

/** Describes how raw landmarks were translated/scaled to produce NormalizedPoseLandmark values. */
export interface PoseNormalizationInfo {
  /** Raw (pre-normalization) x of the origin point (mid-hip), in MediaPipe's [0,1] image space. */
  originX: number;
  /** Raw (pre-normalization) y of the origin point (mid-hip), in MediaPipe's [0,1] image space. */
  originY: number;
  /** Distance used as the "1 unit" scale reference, in the same [0,1] image space. */
  scale: number;
  /** Human-readable description of what `scale` measures. */
  referenceMetric: string;
}

/** One joint angle, in degrees, plus a confidence score derived from landmark visibility. */
export interface JointAngle {
  name: string;
  /** Angle in degrees, or null if it couldn't be reliably computed (low visibility or degenerate geometry). */
  degrees: number | null;
  /** Lowest visibility among the landmarks used to compute this angle — treat as a confidence score, 0-1. */
  visibility: number;
}

/** A named, normalized landmark used within a body zone (e.g. name: "leftElbow"). */
export interface ZoneLandmark extends NormalizedPoseLandmark {
  name: string;
}

export interface HeadZone {
  landmarks: ZoneLandmark[];
  angles: JointAngle[];
}

export interface TorsoZone {
  landmarks: ZoneLandmark[];
  angles: JointAngle[];
}

/** Shared shape for the four limb zones (leftArm/rightArm/leftLeg/rightLeg). */
export interface LimbZone {
  landmarks: ZoneLandmark[];
  angles: JointAngle[];
}

/**
 * Full structured pose representation: normalized + broken into anatomical
 * zones with joint angles, ready for pose-to-pose comparison logic (a
 * later milestone) to consume without touching raw MediaPipe output.
 */
export interface PoseRepresentation {
  head: HeadZone;
  torso: TorsoZone;
  leftArm: LimbZone;
  rightArm: LimbZone;
  leftLeg: LimbZone;
  rightLeg: LimbZone;
  /** All 33 landmarks after normalization, indexed identically to PoseLandmarkIndex. Useful for debug/inspection or future zones. */
  normalizedLandmarks: NormalizedPoseLandmark[];
  normalization: PoseNormalizationInfo;
}
