"use client";

import { useEffect, useRef, useState } from "react";
import type { PoseSimilarityResult } from "@/lib/pose-scoring";
import {
  isZoneCompleted,
  isZoneEligibleForReentry,
  pickReplacementCandidates,
  type ChecklistItem,
  type ZoneKey,
} from "@/lib/pose-coaching";

const MAX_VISIBLE = 3;
/** Duration for the dotted strike-through completion animation before sliding out. */
const COMPLETING_DURATION_MS = 380;
/** Duration for the slide-out leave animation before removal. */
const LEAVE_DURATION_MS = 320;

/**
 * Manages the dynamic 3-item Focus list:
 * - Up to 3 incomplete body portions visible at once (ranked lowest score first).
 * - When a portion reaches ≥90%, it triggers a horizontal dotted strike-through animation,
 *   then smoothly slides out and is marked completed.
 * - Completed portions only become eligible to re-enter if their score drops strictly below 85%.
 * - When all body parts reach ≥90%, the list becomes empty.
 */
export function useBodyPartChecklist(result: PoseSimilarityResult | null): ChecklistItem[] {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const completedRef = useRef<Set<ZoneKey>>(new Set());
  const activeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!result) return;

    setItems((prevItems) => {
      let next = [...prevItems];

      // 1. Check for zones that just reached ≥90%
      for (let i = 0; i < next.length; i++) {
        const item = next[i];
        if (item.status === "active" && isZoneCompleted(result, item.key)) {
          completedRef.current.add(item.key);
          next[i] = { ...item, status: "completing" };
          scheduleLeaving(item.key);
        }
      }

      // 2. 85% Re-entry threshold: only remove from completedRef when score drops strictly below 85%
      for (const key of Array.from(completedRef.current)) {
        if (isZoneEligibleForReentry(result, key)) {
          completedRef.current.delete(key);
        }
      }

      // 3. Backfill empty slots (only if not already visible and not in completedRef)
      const visibleKeys = new Set(next.map((i) => i.key));
      const candidates = pickReplacementCandidates(result, visibleKeys, completedRef.current);
      const freeSlots = MAX_VISIBLE - next.length;

      for (let i = 0; i < freeSlots && i < candidates.length; i++) {
        next.push({ key: candidates[i], status: "active" });
      }

      return next;
    });

    function scheduleLeaving(key: ZoneKey) {
      const timerKey = `completing-${key}`;
      if (activeTimers.current.has(timerKey)) return;

      const timer = setTimeout(() => {
        activeTimers.current.delete(timerKey);
        // Transition from completing to leaving
        setItems((curr) =>
          curr.map((item) => (item.key === key ? { ...item, status: "leaving" } : item))
        );

        // Schedule final removal
        const leaveTimerKey = `leaving-${key}`;
        const leaveTimer = setTimeout(() => {
          activeTimers.current.delete(leaveTimerKey);
          setItems((curr) => curr.filter((item) => item.key !== key));
        }, LEAVE_DURATION_MS);
        activeTimers.current.set(leaveTimerKey, leaveTimer);
      }, COMPLETING_DURATION_MS);

      activeTimers.current.set(timerKey, timer);
    }
  }, [result]);

  useEffect(() => {
    const timers = activeTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return items;
}
