import type { ScoringConfig } from "./types";

/**
 * Defaults for the scoring formula. All values are deliberately simple,
 * named constants (not hidden magic numbers) so the formula stays
 * explainable — see the module README notes / chat explanation for why
 * these particular values were picked.
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  minFeatureConfidence: 0.5,
  minZoneConfidence: 0.5,
  angleToleranceDegrees: 45,
  positionToleranceUnits: 0.35,
  angleFeatureWeight: 2,
  positionFeatureWeight: 1,
  passThreshold: 90,
};

/** Merges partial overrides on top of the defaults. */
export function resolveScoringConfig(overrides?: Partial<ScoringConfig>): ScoringConfig {
  return { ...DEFAULT_SCORING_CONFIG, ...overrides };
}
