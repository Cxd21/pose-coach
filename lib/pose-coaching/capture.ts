/**
 * Decides whether the current pose match is "good enough" to trigger
 * auto-capture. This is a pure, single-frame check — the actual "hold for
 * ~1 second" timing lives in the useAutoCapture hook (app/components/live),
 * which calls this once per frame.
 */

import type { PoseSimilarityResult } from "@/lib/pose-scoring";
import { ZONE_KEYS } from "./types";
import type { FramingMatch } from "./framing";

/** At least this many of the six zones must be reliably measured, or we can't meaningfully judge the pose at all. */
const MIN_RELIABLE_ZONES = 3;

/**
 * A zone counts toward "fully matched" if it's either passed, or simply
 * not reliably visible (e.g. legs out of frame in a close-up shot) — we
 * don't want an occluded zone to permanently block capture, matching the
 * scoring system's existing "don't penalize what we can't see" philosophy.
 * But if too FEW zones are reliable overall, we bail out entirely rather
 * than risk auto-capturing a frame where we could barely see anyone.
 */
function isPoseAccuracyMatched(result: PoseSimilarityResult): boolean {
  const reliableZones = ZONE_KEYS.filter((key) => result.zones[key].reliable);
  if (reliableZones.length < MIN_RELIABLE_ZONES) return false;

  return ZONE_KEYS.every((key) => {
    const zone = result.zones[key];
    return !zone.reliable || zone.passed === true;
  });
}

/**
 * Full capture-readiness check: pose *shape* is intentionally
 * position/scale-invariant (comparing a pose shouldn't require standing in
 * an exact spot), but a fixed composition guide only does its job if the
 * subject is actually standing roughly where it's drawn — otherwise a
 * technically perfect pose off to one side of the frame would still
 * auto-capture a poorly composed photo. Framing is therefore checked as a
 * separate, additional requirement here, not folded into the per-zone
 * pose-accuracy scores.
 */
export function isPoseFullyMatched(result: PoseSimilarityResult, framing: FramingMatch | null): boolean {
  if (!isPoseAccuracyMatched(result)) return false;
  // No framing signal yet (e.g. guide not loaded) — fall back to pose-only,
  // rather than blocking capture on a check we can't currently perform.
  if (!framing) return true;
  return framing.isWellFramed;
}
