import type { JointAngle, ZoneLandmark } from "@/lib/pose-processing";
import type { ScoringConfig, ZoneScore, FeatureScoreDetail } from "./types";
import { angularDifferenceDegrees, euclideanDistance2D, similarityFromDifference } from "./featureScoring";

export interface ComparableZone {
  landmarks: ZoneLandmark[];
  angles: JointAngle[];
}

function findAngle(angles: JointAngle[], name: string): JointAngle | undefined {
  return angles.find((a) => a.name === name);
}

function findLandmark(landmarks: ZoneLandmark[], name: string): ZoneLandmark | undefined {
  return landmarks.find((l) => l.name === name);
}

function scoreAngleFeature(
  referenceAngle: JointAngle,
  userAngle: JointAngle,
  config: ScoringConfig
): FeatureScoreDetail {
  const confidence = Math.min(referenceAngle.visibility, userAngle.visibility);

  if (referenceAngle.degrees === null || userAngle.degrees === null) {
    return {
      name: referenceAngle.name,
      type: "angle",
      referenceDegrees: referenceAngle.degrees ?? undefined,
      userDegrees: userAngle.degrees ?? undefined,
      difference: NaN,
      similarity: NaN,
      confidence,
      included: false,
    };
  }

  const difference = angularDifferenceDegrees(referenceAngle.degrees, userAngle.degrees);
  const similarity = similarityFromDifference(difference, config.angleToleranceDegrees);

  return {
    name: referenceAngle.name,
    type: "angle",
    referenceDegrees: referenceAngle.degrees,
    userDegrees: userAngle.degrees,
    difference,
    similarity,
    confidence,
    included: confidence >= config.minFeatureConfidence,
  };
}

function scorePositionFeature(
  referenceLandmark: ZoneLandmark,
  userLandmark: ZoneLandmark,
  config: ScoringConfig
): FeatureScoreDetail {
  const confidence = Math.min(referenceLandmark.visibility, userLandmark.visibility);
  const difference = euclideanDistance2D(referenceLandmark, userLandmark);
  const similarity = similarityFromDifference(difference, config.positionToleranceUnits);

  return {
    name: referenceLandmark.name,
    type: "position",
    difference,
    similarity,
    confidence,
    included: confidence >= config.minFeatureConfidence,
  };
}

export function scoreZone(
  referenceZone: ComparableZone,
  userZone: ComparableZone,
  config: ScoringConfig
): ZoneScore {
  const features: FeatureScoreDetail[] = [];

  for (const referenceAngle of referenceZone.angles) {
    const userAngle = findAngle(userZone.angles, referenceAngle.name);
    if (!userAngle) continue;
    features.push(scoreAngleFeature(referenceAngle, userAngle, config));
  }

  for (const referenceLandmark of referenceZone.landmarks) {
    const userLandmark = findLandmark(userZone.landmarks, referenceLandmark.name);
    if (!userLandmark) continue;
    features.push(scorePositionFeature(referenceLandmark, userLandmark, config));
  }

  const confidence =
    features.length > 0 ? features.reduce((sum, f) => sum + f.confidence, 0) / features.length : 0;
  const reliable = confidence >= config.minZoneConfidence;

  const usableFeatures = features.filter((f) => f.included && Number.isFinite(f.similarity));
  const weightOf = (f: FeatureScoreDetail) =>
    f.type === "angle" ? config.angleFeatureWeight : config.positionFeatureWeight;
  const totalWeight = usableFeatures.reduce((sum, f) => sum + weightOf(f), 0);

  const score =
    totalWeight > 0
      ? usableFeatures.reduce((sum, f) => sum + f.similarity * weightOf(f), 0) / totalWeight
      : null;

  const passed = reliable && score !== null ? score >= config.passThreshold : null;

  return { score, confidence, reliable, passed, features };
}
