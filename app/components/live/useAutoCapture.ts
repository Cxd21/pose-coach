"use client";

import { useEffect, useRef, useState } from "react";
import type { PoseSimilarityResult } from "@/lib/pose-scoring";
import { isPoseFullyMatched } from "@/lib/pose-coaching";

const DEFAULT_HOLD_MS = 1000;
const COUNTDOWN_SECONDS = 3;

export interface AutoCaptureHookResult {
  countdown: number | null;
  isEligible: boolean;
}

/**
 * Monitors live similarity score. When all required body zones are >=90%
 * continuously for 1 second, it triggers a 3-second visual countdown.
 * If pose drops below 90% during either the hold or the countdown, it immediately cancels.
 * Captures exactly one frame when the countdown completes.
 */
export function useAutoCapture(
  result: PoseSimilarityResult | null,
  enabled: boolean,
  onCapture: () => void,
  holdMs: number = DEFAULT_HOLD_MS
): AutoCaptureHookResult {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isEligible, setIsEligible] = useState(false);

  const holdStartRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const firedRef = useRef(false);
  const onCaptureRef = useRef(onCapture);

  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  // Clean up timer and interval
  const resetAll = () => {
    holdStartRef.current = null;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    setIsEligible(false);
  };

  useEffect(() => {
    if (!enabled) {
      resetAll();
      firedRef.current = false;
      return;
    }

    if (firedRef.current) return;

    const matched = result !== null && isPoseFullyMatched(result);

    // If pose is not matched, cancel any active hold or countdown immediately
    if (!matched) {
      resetAll();
      return;
    }

    setIsEligible(true);

    // If already in countdown phase, keep ticking
    if (countdownIntervalRef.current !== null) {
      return;
    }

    // Accumulate the 1-second hold requirement
    if (holdStartRef.current === null) {
      holdStartRef.current = Date.now();
    }

    const elapsed = Date.now() - holdStartRef.current;
    const remaining = holdMs - elapsed;

    if (remaining > 0) {
      const holdTimer = setTimeout(() => {
        // Double check still matched
        if (holdStartRef.current !== null && !firedRef.current && countdownIntervalRef.current === null) {
          startCountdown();
        }
      }, remaining);

      return () => clearTimeout(holdTimer);
    } else if (countdownIntervalRef.current === null) {
      startCountdown();
    }

    function startCountdown() {
      let currentTick = COUNTDOWN_SECONDS;
      setCountdown(currentTick);

      countdownIntervalRef.current = setInterval(() => {
        currentTick -= 1;
        if (currentTick <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setCountdown(null);
          firedRef.current = true;
          onCaptureRef.current();
        } else {
          setCountdown(currentTick);
        }
      }, 1000);
    }

    return () => {
      // Cleanup on dependency change
    };
  }, [result, enabled, holdMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetAll();
    };
  }, []);

  return {
    countdown,
    isEligible,
  };
}
