import type { PoseRepresentation } from "@/lib/pose-processing";
import { resolveScoringConfig } from "./config";
import { scoreZone } from "./zoneScoring";
import type { PoseSimilarityResult, PoseSimilarityZones, ScoringConfig, ZoneScore } from "./types";

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

  const scoredZones = zoneList.filter((z): z is ZoneScore & { score: number } => z.score !== null);
  const overallWeight = scoredZones.reduce((sum, z) => sum + z.confidence, 0);
  const overallScore =
    overallWeight > 0
      ? scoredZones.reduce((sum, z) => sum + z.score * z.confidence, 0) / overallWeight
      : 0;

  const overallConfidence = zoneList.reduce((sum, z) => sum + z.confidence, 0) / zoneList.length;

  return { overallScore, overallConfidence, threshold: config.passThreshold, zones };
}
