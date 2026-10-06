/**
 * Pure logic for the body-part checklist: given the latest similarity
 * result and which zones are currently visible/completed, decide which
 * zone(s) should fill any empty slots.
 *
 * This has no React/timing dependency — the animated slide-out/re-entry
 * behavior (which needs setTimeout + component state) lives in the
 * `useBodyPartChecklist` hook in app/components/live, which calls these
 * functions. Keeping the selection rule here makes it independently
 * testable and reusable if the checklist UI ever changes.
 */

import type { PoseSimilarityResult } from "@/lib/pose-scoring";
import { ZONE_KEYS, type ZoneKey } from "./types";

export const PASS_THRESHOLD = 90;
export const REENTRY_THRESHOLD = 85;

/**
 * Lower = higher priority (shown first). Reliable zones are ordered by how
 * far they are from a match (lowest score first — "furthest from the
 * reference pose" gets attention first). Zones we can't confidently
 * measure (unreliable/occluded) are pushed to the very end: we shouldn't
 * ask someone to fix a body part we can't actually see.
 */
function zonePriority(result: PoseSimilarityResult, key: ZoneKey): number {
  const zone = result.zones[key];
  if (!zone.reliable || zone.score === null) return Number.POSITIVE_INFINITY;
  return zone.score;
}

/** True once a zone has reached ≥ 90% similarity — marks a zone completed. */
export function isZoneCompleted(result: PoseSimilarityResult, key: ZoneKey): boolean {
  const zone = result.zones[key];
  return zone.reliable === true && zone.score !== null && zone.score >= PASS_THRESHOLD;
}

/**
 * True when a previously completed zone drops strictly below 85% similarity (or becomes unreadable).
 * With hysteresis, scores between 85% and 89.9% do NOT cause a completed zone to re-enter.
 */
export function isZoneEligibleForReentry(result: PoseSimilarityResult, key: ZoneKey): boolean {
  const zone = result.zones[key];
  return !zone.reliable || zone.score === null || zone.score < REENTRY_THRESHOLD;
}

/**
 * Returns zone keys eligible to fill an empty checklist slot: not currently
 * visible, not in the completed set, ordered so the zone most in need of
 * correction comes first.
 */
export function pickReplacementCandidates(
  result: PoseSimilarityResult,
  excludeKeys: ReadonlySet<ZoneKey>,
  completedKeys: ReadonlySet<ZoneKey>
): ZoneKey[] {
  return ZONE_KEYS.filter(
    (key) => !excludeKeys.has(key) && !completedKeys.has(key) && !isZoneCompleted(result, key)
  ).sort((a, b) => zonePriority(result, a) - zonePriority(result, b));
}

