/**
 * Types for pose-to-pose similarity scoring.
 *
 * This module consumes `PoseRepresentation` (and its zone/angle/landmark
 * types) from lib/pose-processing rather than redefining them — it only
 * adds the comparison/scoring-specific shapes below.
 */

/** All tunable knobs for the scoring formula, in one place. */
export interface ScoringConfig {
  /**
   * Below this per-feature visibility (0-1, the min visibility of the
   * landmarks a feature was computed from, across BOTH poses being
   * compared), that single feature is excluded from the zone's score —
   * it's too unreliable to count as either a match or a mismatch.
   */
  minFeatureConfidence: number;

  /**
   * Below this zone-level average confidence (0-1), the whole zone is
   * flagged `reliable: false`. Its score may still be shown, but should be
   * treated as unreliable rather than a real, trustworthy score.
   */
  minZoneConfidence: number;

  /**
   * Angle difference (in degrees) at which an angle feature's similarity
   * reaches 0. 0° difference = 100 similarity; linear in between.
   */
  angleToleranceDegrees: number;

  /**
   * Euclidean distance (in normalized "torso units", the same units
   * NormalizedPoseLandmark uses) at which a position feature's similarity
   * reaches 0. 0 distance = 100 similarity; linear in between.
   */
  positionToleranceUnits: number;

  /** Relative weight of angle-based features vs position-based features when averaging a zone's score. */
  angleFeatureWeight: number;
  positionFeatureWeight: number;

  /** Zone score (0-100) needed to count as "passed". Configurable per the milestone spec; default 90. */
  passThreshold: number;
}

/** One compared feature (a single joint angle, or a single landmark's position) within a zone. */
export interface FeatureScoreDetail {
  name: string;
  type: "angle" | "position";
  /** Degree values compared, for angle-type features only. */
  referenceDegrees?: number;
  userDegrees?: number;
  /** Angular difference in degrees (angle features) or Euclidean distance in torso units (position features). */
  difference: number;
  /** 0-100 similarity for this single feature. NaN if it couldn't be computed (e.g. angle was undetectable). */
  similarity: number;
  /** Min visibility of the landmarks behind this feature, across both poses. */
  confidence: number;
  /** Whether this feature actually counted toward the zone's score (false if below minFeatureConfidence or NaN). */
  included: boolean;
}

/** Similarity result for a single body zone. */
export interface ZoneScore {
  /** 0-100 similarity score, or null if no feature had enough confidence to be scored at all. */
  score: number | null;
  /** 0-1 average detection confidence for this zone, across both poses. */
  confidence: number;
  /** True if `confidence` meets `minZoneConfidence` — i.e. this score can be trusted. */
  reliable: boolean;
  /** score >= passThreshold, or null if unreliable/unscored (never "false" just because data was missing). */
  passed: boolean | null;
  /** Per-feature breakdown, useful for the debug UI and for explaining a score. */
  features: FeatureScoreDetail[];
}

export interface PoseSimilarityZones {
  head: ZoneScore;
  torso: ZoneScore;
  leftArm: ZoneScore;
  rightArm: ZoneScore;
  leftLeg: ZoneScore;
  rightLeg: ZoneScore;
}

/** Top-level result of comparing a reference pose against a user pose. */
export interface PoseSimilarityResult {
  /** 0-100 overall score: confidence-weighted average of the six zone scores. */
  overallScore: number;
  /** 0-1 average confidence across all six zones (independent of overallScore), for transparency. */
  overallConfidence: number;
  /** The passThreshold that was used to compute each zone's `passed` flag. */
  threshold: number;
  zones: PoseSimilarityZones;
}
