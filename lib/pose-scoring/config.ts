import type { ScoringConfig } from "./types";

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  minFeatureConfidence: 0.5,
  minZoneConfidence: 0.5,
  angleToleranceDegrees: 45,
  positionToleranceUnits: 0.35,
  angleFeatureWeight: 2,
  positionFeatureWeight: 1,
  passThreshold: 90,
};

export function resolveScoringConfig(overrides?: Partial<ScoringConfig>): ScoringConfig {
  return { ...DEFAULT_SCORING_CONFIG, ...overrides };
}
