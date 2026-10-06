/**
 * Builds each anatomical zone (head, torso, arms, legs) from normalized
 * landmarks: picks out the relevant named landmarks and computes the joint
 * angles that matter for that zone.
 *
 * Landmark indices are reused from lib/pose/types.ts's PoseLandmarkIndex —
 * not re-declared here — so this module can't drift out of sync with the
 * detection code if MediaPipe's landmark ordering ever changes.
 */

import { PoseLandmarkIndex } from "@/lib/pose/types";
import { angleBetween, angleFromVertical } from "./angles";
import type {
  NormalizedPoseLandmark,
  ZoneLandmark,
  JointAngle,
  HeadZone,
  TorsoZone,
  LimbZone,
} from "./types";

/** Below this visibility, we don't trust an angle enough to report a number. */
const MIN_RELIABLE_VISIBILITY = 0.3;

function toZoneLandmark(name: string, lm: NormalizedPoseLandmark): ZoneLandmark {
  return { name, ...lm };
}

function midpointLandmark(
  a: NormalizedPoseLandmark,
  b: NormalizedPoseLandmark
): NormalizedPoseLandmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: Math.min(a.visibility, b.visibility),
  };
}

/** Angle at vertex `b` between rays to `a` and `c`, with a confidence-gated result. */
function jointAngle(
  name: string,
  a: NormalizedPoseLandmark,
  b: NormalizedPoseLandmark,
  c: NormalizedPoseLandmark
): JointAngle {
  const visibility = Math.min(a.visibility, b.visibility, c.visibility);
  const degrees = angleBetween(a, b, c);
  return {
    name,
    degrees: Number.isFinite(degrees) && visibility >= MIN_RELIABLE_VISIBILITY ? degrees : null,
    visibility,
  };
}

/** Lean/tilt of vector b→a from vertical, with a confidence-gated result. */
function tiltAngle(
  name: string,
  a: NormalizedPoseLandmark,
  b: NormalizedPoseLandmark
): JointAngle {
  const visibility = Math.min(a.visibility, b.visibility);
  const degrees = angleFromVertical(a, b);
  return {
    name,
    degrees: Number.isFinite(degrees) && visibility >= MIN_RELIABLE_VISIBILITY ? degrees : null,
    visibility,
  };
}

export function buildHeadZone(nl: NormalizedPoseLandmark[]): HeadZone {
  const nose = nl[PoseLandmarkIndex.NOSE];
  const leftEye = nl[PoseLandmarkIndex.LEFT_EYE];
  const rightEye = nl[PoseLandmarkIndex.RIGHT_EYE];
  const leftEar = nl[PoseLandmarkIndex.LEFT_EAR];
  const rightEar = nl[PoseLandmarkIndex.RIGHT_EAR];
  const shoulderMid = midpointLandmark(
    nl[PoseLandmarkIndex.LEFT_SHOULDER],
    nl[PoseLandmarkIndex.RIGHT_SHOULDER]
  );

  return {
    landmarks: [
      toZoneLandmark("nose", nose),
      toZoneLandmark("leftEye", leftEye),
      toZoneLandmark("rightEye", rightEye),
      toZoneLandmark("leftEar", leftEar),
      toZoneLandmark("rightEar", rightEar),
    ],
    angles: [
      // Forward/back tilt of the head relative to the torso's vertical axis.
      tiltAngle("headForwardTilt", nose, shoulderMid),
      // Left/right roll of the head, from the ear-nose-ear angle.
      jointAngle("headRoll", leftEar, nose, rightEar),
    ],
  };
}

export function buildTorsoZone(nl: NormalizedPoseLandmark[]): TorsoZone {
  const leftShoulder = nl[PoseLandmarkIndex.LEFT_SHOULDER];
  const rightShoulder = nl[PoseLandmarkIndex.RIGHT_SHOULDER];
  const leftHip = nl[PoseLandmarkIndex.LEFT_HIP];
  const rightHip = nl[PoseLandmarkIndex.RIGHT_HIP];

  const shoulderMid = midpointLandmark(leftShoulder, rightShoulder);
  const hipMid = midpointLandmark(leftHip, rightHip);

  return {
    landmarks: [
      toZoneLandmark("leftShoulder", leftShoulder),
      toZoneLandmark("rightShoulder", rightShoulder),
      toZoneLandmark("leftHip", leftHip),
      toZoneLandmark("rightHip", rightHip),
    ],
    angles: [
      // How far the spine leans away from vertical — 0° = perfectly upright.
      tiltAngle("torsoLean", shoulderMid, hipMid),
    ],
  };
}

function buildArmZone(nl: NormalizedPoseLandmark[], side: "left" | "right"): LimbZone {
  const shoulder = nl[side === "left" ? PoseLandmarkIndex.LEFT_SHOULDER : PoseLandmarkIndex.RIGHT_SHOULDER];
  const elbow = nl[side === "left" ? PoseLandmarkIndex.LEFT_ELBOW : PoseLandmarkIndex.RIGHT_ELBOW];
  const wrist = nl[side === "left" ? PoseLandmarkIndex.LEFT_WRIST : PoseLandmarkIndex.RIGHT_WRIST];
  const hip = nl[side === "left" ? PoseLandmarkIndex.LEFT_HIP : PoseLandmarkIndex.RIGHT_HIP];

  return {
    landmarks: [
      toZoneLandmark("shoulder", shoulder),
      toZoneLandmark("elbow", elbow),
      toZoneLandmark("wrist", wrist),
    ],
    angles: [
      // How far the upper arm is raised away from the torso (hip-shoulder-elbow).
      jointAngle("shoulderAbduction", hip, shoulder, elbow),
      // How bent the elbow is (shoulder-elbow-wrist); ~180° = straight arm.
      jointAngle("elbowBend", shoulder, elbow, wrist),
    ],
  };
}

function buildLegZone(nl: NormalizedPoseLandmark[], side: "left" | "right"): LimbZone {
  const shoulder = nl[side === "left" ? PoseLandmarkIndex.LEFT_SHOULDER : PoseLandmarkIndex.RIGHT_SHOULDER];
  const hip = nl[side === "left" ? PoseLandmarkIndex.LEFT_HIP : PoseLandmarkIndex.RIGHT_HIP];
  const knee = nl[side === "left" ? PoseLandmarkIndex.LEFT_KNEE : PoseLandmarkIndex.RIGHT_KNEE];
  const ankle = nl[side === "left" ? PoseLandmarkIndex.LEFT_ANKLE : PoseLandmarkIndex.RIGHT_ANKLE];

  return {
    landmarks: [
      toZoneLandmark("hip", hip),
      toZoneLandmark("knee", knee),
      toZoneLandmark("ankle", ankle),
    ],
    angles: [
      // How far the leg swings forward/back or out from the torso (shoulder-hip-knee).
      jointAngle("hipFlexion", shoulder, hip, knee),
      // How bent the knee is (hip-knee-ankle); ~180° = straight leg.
      jointAngle("kneeBend", hip, knee, ankle),
    ],
  };
}

export function buildLeftArmZone(nl: NormalizedPoseLandmark[]): LimbZone {
  return buildArmZone(nl, "left");
}
export function buildRightArmZone(nl: NormalizedPoseLandmark[]): LimbZone {
  return buildArmZone(nl, "right");
}
export function buildLeftLegZone(nl: NormalizedPoseLandmark[]): LimbZone {
  return buildLegZone(nl, "left");
}
export function buildRightLegZone(nl: NormalizedPoseLandmark[]): LimbZone {
  return buildLegZone(nl, "right");
}
