/**
 * Rule-based coaching tips: picks the single worst (reliable, not-yet-passed)
 * zone and returns one short, supportive phrase for it. Deliberately simple
 * — per the milestone spec, this is a placeholder to improve later with
 * more targeted, direction-aware guidance (e.g. "raise" vs "lower" derived
 * from actual angle direction, not just which zone is off).
 */

import type { PoseSimilarityResult } from "@/lib/pose-scoring";
import type { ZoneKey } from "./types";
import { ZONE_KEYS } from "./types";
import type { FramingMatch } from "./framing";

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

/** Returns the reliable, not-yet-passed zone with the lowest score, or null if none (either all passed or all unreliable). */
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

/**
 * Directional composition guidance: pose shape can be perfect while the
 * subject stands entirely outside the fixed guide, which still makes for
 * a poorly composed photo. This takes priority over body-part tips when
 * framing is off (see useCoachingTip), since fixing position/distance is
 * a prerequisite for fine pose adjustments being useful at all.
 */
export function framingTip(framing: FramingMatch): string {
  if (framing.sizeRatio < 0.7) return "Step closer to fill the outline 💗";
  if (framing.sizeRatio > 1.4) return "Step back a little 💗";

  if (!framing.direction) return "Step into the outline 💗";

  const { x, y } = framing.direction;
  if (Math.abs(x) >= Math.abs(y)) {
    return x > 0 ? "Move right to align with the outline 💗" : "Move left to align with the outline 💗";
  }
  return y > 0 ? "Move down slightly to align 💗" : "Move up slightly to align 💗";
}

