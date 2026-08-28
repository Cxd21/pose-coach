import type { PoseSimilarityResult } from "@/lib/pose-scoring";
import type { ZoneKey } from "./types";
import { ZONE_KEYS } from "./types";

export interface CoachingTipData {
  prefix: string;
  highlight: string;
  suffix: string;
}

const STRUCTURED_TIPS: Record<ZoneKey, CoachingTipData> = {
  head: { prefix: "Tilt your", highlight: "head", suffix: "into position" },
  torso: { prefix: "Align your", highlight: "shoulders", suffix: "and back" },
  leftArm: { prefix: "Adjust your", highlight: "left arm", suffix: "a little" },
  rightArm: { prefix: "Adjust your", highlight: "right arm", suffix: "a little" },
  leftLeg: { prefix: "Shift your", highlight: "left leg", suffix: "a little higher" },
  rightLeg: { prefix: "Shift your", highlight: "right leg", suffix: "a little higher" },
};

const TIPS: Record<ZoneKey, string> = {
  head: "Tilt your head into position 💗",
  torso: "Align your shoulders and back 💗",
  leftArm: "Adjust your left arm a little 💗",
  rightArm: "Adjust your right arm a little 💗",
  leftLeg: "Shift your left leg a little higher 💗",
  rightLeg: "Shift your right leg a little higher 💗",
};

const ALL_MATCHED_TIP = "Great! Hold the pose 💗";

export function pickWorstZone(result: PoseSimilarityResult): ZoneKey | null {
  let worst: ZoneKey | null = null;
  let worstScore = Number.POSITIVE_INFINITY;

  for (const key of ZONE_KEYS) {
    const zone = result.zones[key];
    if (!zone.reliable || zone.score === null || zone.passed) continue;
    if (zone.score < worstScore) {
      worstScore = zone.score;
      worst = key;
    }
  }

  return worst;
}

export function tipForZone(zone: ZoneKey): string {
  return TIPS[zone];
}

export function structuredTipForZone(zone: ZoneKey): CoachingTipData {
  return STRUCTURED_TIPS[zone];
}

export function tipForAllMatched(): string {
  return ALL_MATCHED_TIP;
}
