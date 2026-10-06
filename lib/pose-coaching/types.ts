/**
 * Shared constants for the live-coaching feature: the six zone keys (taken
 * directly from `PoseSimilarityZones` in lib/pose-scoring, not redeclared)
 * plus friendly display labels for the checklist UI.
 */

import type { PoseSimilarityResult } from "@/lib/pose-scoring";

export type ZoneKey = keyof PoseSimilarityResult["zones"];

/** Fixed display order for the six zones (used for stable, predictable checklist ordering). */
export const ZONE_KEYS: ZoneKey[] = [
  "head",
  "torso",
  "leftArm",
  "rightArm",
  "leftLeg",
  "rightLeg",
];

export const ZONE_LABELS: Record<ZoneKey, string> = {
  head: "Head",
  torso: "Shoulders",
  leftArm: "Left arm",
  rightArm: "Right arm",
  leftLeg: "Left leg",
  rightLeg: "Right leg",
};

/** One entry in the animated checklist: a zone plus its current display state. */
export interface ChecklistItem {
  key: ZoneKey;
  /**
   * "active" = currently displayed.
   * "completing" = reached ≥90%, showing horizontal dotted strike-through animation.
   * "leaving" = animated slide/fade out before removal.
   */
  status: "active" | "completing" | "leaving";
}
