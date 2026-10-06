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
  // Tracks the same "has a tip ever been shown" condition the old code read
  // via `!tip` — but via a ref instead of the state value itself, so this
  // effect doesn't need `tip` in its dependency array. Including a value
  // that the effect itself sets (via setTip) as a dependency is a
  // self-referential effect: every setTip call re-triggers the effect,
  // which — combined with `result` already changing every video frame —
  // was compounding into runaway updates ("Maximum update depth exceeded").
  const hasShownTipRef = useRef(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (!result) {
        setTip(null);
        lastZoneRef.current = null;
        hasShownTipRef.current = false;
        return;
      }

      const worst = pickWorstZone(result);
      const now = Date.now();

      if (worst === null) {
        if (lastZoneRef.current !== null || !hasShownTipRef.current) {
          lastZoneRef.current = null;
          lastChangeAtRef.current = now;
          hasShownTipRef.current = true;
          setTip({
            zone: null,
            text: tipForAllMatched(),
          });
        }
        return;
      }

      const enoughTimePassed = now - lastChangeAtRef.current > MIN_TIP_INTERVAL_MS;
      if (worst !== lastZoneRef.current && (enoughTimePassed || !hasShownTipRef.current)) {
        lastZoneRef.current = worst;
        lastChangeAtRef.current = now;
        hasShownTipRef.current = true;
        setTip({
          zone: worst,
          text: tipForZone(worst),
          structured: structuredTipForZone(worst),
        });
      }
    });
  }, [result]);

  return tip;
}

