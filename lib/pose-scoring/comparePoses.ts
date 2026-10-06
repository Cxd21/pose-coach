/**
 * Top-level entry point for pose similarity scoring: compares a reference
 * pose against a user pose, zone by zone, and aggregates into one overall
 * score. This is the function the rest of the app (and the debug UI) should
 * call — it hides the per-zone comparison mechanics behind one call.
 */

import type { PoseRepresentation } from "@/lib/pose-processing";
import { resolveScoringConfig } from "./config";
import { scoreZone } from "./zoneScoring";
import type { PoseSimilarityResult, PoseSimilarityZones, ScoringConfig, ZoneScore } from "./types";

/**
 * @param reference The target/reference pose (e.g. from a reference photo).
 * @param user The pose to evaluate against the reference (e.g. from a live/uploaded comparison photo).
 * @param configOverrides Optional partial overrides merged on top of DEFAULT_SCORING_CONFIG.
 */
export function comparePoses(
  reference: PoseRepresentation,
  user: PoseRepresentation,
  configOverrides?: Partial<ScoringConfig>
): PoseSimilarityResult {
  const config = resolveScoringConfig(configOverrides);

  const zones: PoseSimilarityZones = {
    head: scoreZone(reference.head, user.head, config),
    torso: scoreZone(reference.torso, user.torso, config),
    leftArm: scoreZone(reference.leftArm, user.leftArm, config),
    rightArm: scoreZone(reference.rightArm, user.rightArm, config),
    leftLeg: scoreZone(reference.leftLeg, user.leftLeg, config),
    rightLeg: scoreZone(reference.rightLeg, user.rightLeg, config),
  };

  const zoneList: ZoneScore[] = Object.values(zones);

  // Overall score: confidence-weighted average of zones that produced a
  // score at all. A zone with score === null (nothing confident enough to
  // compare) is excluded rather than counted as 0 — an occluded zone
  // shouldn't drag down the overall score just because it's occluded.
  const scoredZones = zoneList.filter((z): z is ZoneScore & { score: number } => z.score !== null);
  const overallWeight = scoredZones.reduce((sum, z) => sum + z.confidence, 0);
  const overallScore =
    overallWeight > 0
      ? scoredZones.reduce((sum, z) => sum + z.score * z.confidence, 0) / overallWeight
      : 0;

  const overallConfidence = zoneList.reduce((sum, z) => sum + z.confidence, 0) / zoneList.length;

  return { overallScore, overallConfidence, threshold: config.passThreshold, zones };
}
