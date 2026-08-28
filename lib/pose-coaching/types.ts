import type { PoseSimilarityResult } from "@/lib/pose-scoring";

export type ZoneKey = keyof PoseSimilarityResult["zones"];

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

export interface ChecklistItem {
  key: ZoneKey;
  status: "active" | "completing" | "leaving";
}
