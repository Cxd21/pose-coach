// Run with: npx tsx scripts/sanity-check-scoring.ts
// Not part of the app build — a manual verification script for the scoring module.

import { PoseLandmarkIndex, type NormalizedLandmark } from "../lib/pose/types";
import { buildPoseRepresentation } from "../lib/pose-processing";
import { comparePoses } from "../lib/pose-scoring";

/** Builds a simple standing "reference" pose: arms down, legs straight, facing camera. */
function buildStandingPose(overrides: Partial<Record<PoseLandmarkIndex, Partial<NormalizedLandmark>>> = {}) {
  const base: NormalizedLandmark[] = new Array(33).fill(null).map(() => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.95,
  }));

  const set = (idx: PoseLandmarkIndex, x: number, y: number) => {
    base[idx] = { x, y, z: 0, visibility: 0.95 };
  };

  // Rough standing figure, in MediaPipe's [0,1] image-space (y grows downward).
  set(PoseLandmarkIndex.NOSE, 0.5, 0.15);
  set(PoseLandmarkIndex.LEFT_EYE, 0.48, 0.14);
  set(PoseLandmarkIndex.RIGHT_EYE, 0.52, 0.14);
  set(PoseLandmarkIndex.LEFT_EAR, 0.46, 0.15);
  set(PoseLandmarkIndex.RIGHT_EAR, 0.54, 0.15);

  set(PoseLandmarkIndex.LEFT_SHOULDER, 0.4, 0.25);
  set(PoseLandmarkIndex.RIGHT_SHOULDER, 0.6, 0.25);
  set(PoseLandmarkIndex.LEFT_ELBOW, 0.38, 0.4);
  set(PoseLandmarkIndex.RIGHT_ELBOW, 0.62, 0.4);
  set(PoseLandmarkIndex.LEFT_WRIST, 0.37, 0.55);
  set(PoseLandmarkIndex.RIGHT_WRIST, 0.63, 0.55);

  set(PoseLandmarkIndex.LEFT_HIP, 0.43, 0.55);
  set(PoseLandmarkIndex.RIGHT_HIP, 0.57, 0.55);
  set(PoseLandmarkIndex.LEFT_KNEE, 0.43, 0.75);
  set(PoseLandmarkIndex.RIGHT_KNEE, 0.57, 0.75);
  set(PoseLandmarkIndex.LEFT_ANKLE, 0.43, 0.95);
  set(PoseLandmarkIndex.RIGHT_ANKLE, 0.57, 0.95);

  for (const [idxStr, patch] of Object.entries(overrides)) {
    const idx = Number(idxStr) as PoseLandmarkIndex;
    base[idx] = { ...base[idx], ...patch };
  }

  return base;
}

function printResult(label: string, result: ReturnType<typeof comparePoses>) {
  console.log(`\n=== ${label} ===`);
  console.log(`overallScore: ${result.overallScore.toFixed(1)}  overallConfidence: ${result.overallConfidence.toFixed(2)}`);
  for (const [zoneName, zone] of Object.entries(result.zones)) {
    console.log(
      `  ${zoneName.padEnd(9)} score=${zone.score === null ? "null" : zone.score.toFixed(1).padStart(5)}` +
        `  confidence=${zone.confidence.toFixed(2)}  reliable=${zone.reliable}  passed=${zone.passed}`
    );
  }
}

// --- Test 1: identical poses should score ~100 everywhere -----------------
const standing = buildStandingPose();
const identicalResult = comparePoses(buildPoseRepresentation(standing), buildPoseRepresentation(standing));
printResult("Test 1: identical poses (expect ~100 everywhere, all passed)", identicalResult);

// --- Test 2: right arm raised — only rightArm should score low ------------
const rightArmRaised = buildStandingPose({
  [PoseLandmarkIndex.RIGHT_ELBOW]: { x: 0.62, y: 0.15 },
  [PoseLandmarkIndex.RIGHT_WRIST]: { x: 0.62, y: 0.0 },
});
const raisedArmResult = comparePoses(buildPoseRepresentation(standing), buildPoseRepresentation(rightArmRaised));
printResult("Test 2: user raised right arm (expect low rightArm score, others high)", raisedArmResult);

// --- Test 3: shift + scale the WHOLE pose (simulating different framing/distance) ---
const shiftedAndScaled = buildStandingPose();
for (const lm of shiftedAndScaled) {
  lm.x = lm.x * 0.5 + 0.2; // scale down + shift right
  lm.y = lm.y * 0.5 + 0.3;
}
const framingResult = comparePoses(buildPoseRepresentation(standing), buildPoseRepresentation(shiftedAndScaled));
printResult("Test 3: same pose, different position/scale in frame (expect ~100 everywhere)", framingResult);

// --- Test 4: right leg fully occluded (very low visibility) should be "unreliable", not a fail ---
const occludedLeg = buildStandingPose({
  [PoseLandmarkIndex.RIGHT_HIP]: { visibility: 0.05 },
  [PoseLandmarkIndex.RIGHT_KNEE]: { visibility: 0.05 },
  [PoseLandmarkIndex.RIGHT_ANKLE]: { visibility: 0.05 },
});
const occludedResult = comparePoses(buildPoseRepresentation(standing), buildPoseRepresentation(occludedLeg));
printResult(
  "Test 4: user's right leg occluded (expect rightLeg reliable=false, passed=null, NOT a low score treated as fail)",
  occludedResult
);
