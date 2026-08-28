import type { PoseSimilarityResult } from "@/lib/pose-scoring";
import { ZONE_KEYS, type ZoneKey } from "./types";

export const PASS_THRESHOLD = 90;
export const REENTRY_THRESHOLD = 85;

function zonePriority(result: PoseSimilarityResult, key: ZoneKey): number {
  const zone = result.zones[key];
  if (!zone.reliable || zone.score === null) return Number.POSITIVE_INFINITY;
  return zone.score;
}

export function isZoneCompleted(result: PoseSimilarityResult, key: ZoneKey): boolean {
  const zone = result.zones[key];
  return zone.reliable === true && zone.score !== null && zone.score >= PASS_THRESHOLD;
}

export function isZoneEligibleForReentry(result: PoseSimilarityResult, key: ZoneKey): boolean {
  const zone = result.zones[key];
  return !zone.reliable || zone.score === null || zone.score < REENTRY_THRESHOLD;
}

export function pickReplacementCandidates(
  result: PoseSimilarityResult,
  excludeKeys: ReadonlySet<ZoneKey>,
  completedKeys: ReadonlySet<ZoneKey>
): ZoneKey[] {
  return ZONE_KEYS.filter(
    (key) => !excludeKeys.has(key) && !completedKeys.has(key) && !isZoneCompleted(result, key)
  ).sort((a, b) => zonePriority(result, a) - zonePriority(result, b));
}
