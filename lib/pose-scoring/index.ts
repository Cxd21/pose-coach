export { comparePoses } from "./comparePoses";
export { scoreZone } from "./zoneScoring";
export type { ComparableZone } from "./zoneScoring";
export { DEFAULT_SCORING_CONFIG, resolveScoringConfig } from "./config";
export {
  angularDifferenceDegrees,
  euclideanDistance2D,
  similarityFromDifference,
} from "./featureScoring";
export type {
  ScoringConfig,
  FeatureScoreDetail,
  ZoneScore,
  PoseSimilarityZones,
  PoseSimilarityResult,
} from "./types";
