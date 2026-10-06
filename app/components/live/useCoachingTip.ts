"use client";

import { useEffect, useRef, useState } from "react";
import type { PoseSimilarityResult } from "@/lib/pose-scoring";
import {
  pickWorstZone,
  tipForZone,
  structuredTipForZone,
  tipForAllMatched,
  framingTip,
  type ZoneKey,
  type CoachingTipData,
  type FramingMatch,
} from "@/lib/pose-coaching";

const MIN_TIP_INTERVAL_MS = 1500;

/** "framing" is a pseudo-zone used only for tip-tracking/debounce purposes — it isn't one of the six scored body zones. */
type TipTarget = ZoneKey | "framing" | null;

export interface ActiveTipState {
  zone: TipTarget;
  text: string;
  structured?: CoachingTipData;
}

/**
 * Picks one supportive tip at a time. Framing (is the user actually
 * standing where the fixed guide is drawn) takes priority over body-part
 * tips: composition/position is worth fixing before fine pose details,
 * since a perfectly-shaped pose off to one side of the frame still isn't
 * a well-composed photo. Falls back to the existing rule-based body-part
 * tip once framing is good.
 *
 * Only changes the displayed tip when the target actually changes (and at
 * most every MIN_TIP_INTERVAL_MS) — otherwise a borderline value could
 * flip the tip every frame (~30x/sec), which would read as jittery rather
 * than calm.
 */
export function useCoachingTip(
  result: PoseSimilarityResult | null,
  framing: FramingMatch | null
): ActiveTipState | null {
  const [tip, setTip] = useState<ActiveTipState | null>(null);
  const lastTargetRef = useRef<TipTarget>(null);
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
        lastTargetRef.current = null;
        hasShownTipRef.current = false;
        return;
      }

      const now = Date.now();
      const enoughTimePassed = now - lastChangeAtRef.current > MIN_TIP_INTERVAL_MS;
      const readyToChange = enoughTimePassed || !hasShownTipRef.current;

      const commit = (target: TipTarget, tipState: ActiveTipState) => {
        lastTargetRef.current = target;
        lastChangeAtRef.current = now;
        hasShownTipRef.current = true;
        setTip(tipState);
      };

      // Framing takes priority when it's off — fix position before pose detail.
      if (framing && !framing.isWellFramed) {
        if (lastTargetRef.current !== "framing" && readyToChange) {
          commit("framing", { zone: "framing", text: framingTip(framing) });
        }
        return;
      }

      const worst = pickWorstZone(result);

      if (worst === null) {
        if (lastTargetRef.current !== null || !hasShownTipRef.current) {
          commit(null, { zone: null, text: tipForAllMatched() });
        }
        return;
      }

      if (worst !== lastTargetRef.current && readyToChange) {
        commit(worst, {
          zone: worst,
          text: tipForZone(worst),
          structured: structuredTipForZone(worst),
        });
      }
    });
  }, [result, framing]);

  return tip;
}
