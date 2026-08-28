"use client";

import { useEffect, useRef, useState } from "react";
import type { PoseSimilarityResult } from "@/lib/pose-scoring";
import {
  pickWorstZone,
  tipForZone,
  structuredTipForZone,
  tipForAllMatched,
  type ZoneKey,
  type CoachingTipData,
} from "@/lib/pose-coaching";

const MIN_TIP_INTERVAL_MS = 1500;

export interface ActiveTipState {
  zone: ZoneKey | null;
  text: string;
  structured?: CoachingTipData;
}

/**
 * Picks one supportive tip at a time from `lib/pose-coaching`'s rule-based
 * selection, but only changes the displayed tip when the target zone
 * actually changes (and at most every MIN_TIP_INTERVAL_MS) — otherwise a
 * borderline zone could flip the tip every frame (~30x/sec), which would
 * read as jittery rather than calm.
 */
export function useCoachingTip(result: PoseSimilarityResult | null): ActiveTipState | null {
  const [tip, setTip] = useState<ActiveTipState | null>(null);
  const lastZoneRef = useRef<ZoneKey | null>(null);
  const lastChangeAtRef = useRef(0);

  useEffect(() => {
    queueMicrotask(() => {
      if (!result) {
        setTip(null);
        lastZoneRef.current = null;
        return;
      }

      const worst = pickWorstZone(result);
      const now = Date.now();

      if (worst === null) {
        if (lastZoneRef.current !== null || !tip) {
          lastZoneRef.current = null;
          lastChangeAtRef.current = now;
          setTip({
            zone: null,
            text: tipForAllMatched(),
          });
        }
        return;
      }

      const enoughTimePassed = now - lastChangeAtRef.current > MIN_TIP_INTERVAL_MS;
      if (worst !== lastZoneRef.current && (enoughTimePassed || !lastZoneRef.current)) {
        lastZoneRef.current = worst;
        lastChangeAtRef.current = now;
        setTip({
          zone: worst,
          text: tipForZone(worst),
          structured: structuredTipForZone(worst),
        });
      }
    });
  }, [result, tip]);

  return tip;
}
