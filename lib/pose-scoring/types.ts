export interface ScoringConfig {
  minFeatureConfidence: number;
  minZoneConfidence: number;
  angleToleranceDegrees: number;
  positionToleranceUnits: number;
  angleFeatureWeight: number;
  positionFeatureWeight: number;
  passThreshold: number;
}

export interface FeatureScoreDetail {
  name: string;
  type: "angle" | "position";
  referenceDegrees?: number;
  userDegrees?: number;
  difference: number;
  similarity: number;
  confidence: number;
  included: boolean;
}

export interface ZoneScore {
  score: number | null;
  confidence: number;
  reliable: boolean;
  passed: boolean | null;
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

export interface PoseSimilarityResult {
  overallScore: number;
  overallConfidence: number;
  threshold: number;
  zones: PoseSimilarityZones;
}
