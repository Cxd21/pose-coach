import type { PoseSimilarityResult } from "@/lib/pose-scoring";
import { ZONE_KEYS } from "./types";

const MIN_RELIABLE_ZONES = 3;

export function isPoseFullyMatched(result: PoseSimilarityResult): boolean {
  const reliableZones = ZONE_KEYS.filter((key) => result.zones[key].reliable);
  if (reliableZones.length < MIN_RELIABLE_ZONES) return false;

  return ZONE_KEYS.every((key) => {
    const zone = result.zones[key];
    return !zone.reliable || zone.passed === true;
  });
}
