"use client";

import { useEffect, useRef } from "react";
import type { PoseSimilarityResult } from "@/lib/pose-scoring";
import { isPoseFullyMatched } from "@/lib/pose-coaching";

const DEFAULT_HOLD_MS = 1000;

/**
 * Watches the live similarity result and calls `onCapture` once the pose
 * has satisfied `isPoseFullyMatched` continuously for `holdMs` — not on the
 * first matching frame, so a brief flicker through the threshold doesn't
 * trigger an accidental photo. Only active when `enabled` is true (i.e.
 * auto-capture mode is selected and no photo has been taken yet).
 */
export function useAutoCapture(
  result: PoseSimilarityResult | null,
  enabled: boolean,
  onCapture: () => void,
  holdMs: number = DEFAULT_HOLD_MS
): void {
  const holdStartRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const onCaptureRef = useRef(onCapture);
  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  useEffect(() => {
    if (!enabled) {
      holdStartRef.current = null;
      firedRef.current = false;
      return;
    }

    const matched = result !== null && isPoseFullyMatched(result);

    if (!matched) {
      holdStartRef.current = null;
      firedRef.current = false;
      return;
    }

    if (firedRef.current) return;

    if (holdStartRef.current === null) {
      holdStartRef.current = Date.now();
    }

    const elapsed = Date.now() - holdStartRef.current;
    const remaining = holdMs - elapsed;

    if (remaining <= 0) {
      firedRef.current = true;
      onCaptureRef.current();
      return;
    }

    const timer = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        onCaptureRef.current();
      }
    }, remaining);

    return () => clearTimeout(timer);
  }, [result, enabled, holdMs]);
}
