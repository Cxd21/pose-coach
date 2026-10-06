"use client";

import { useEffect, useRef, useState } from "react";
import { detectPoseInVideoFrame } from "@/lib/pose";
import { buildPoseRepresentation } from "@/lib/pose-processing";
import type { PoseRepresentation } from "@/lib/pose-processing";
import { comparePoses } from "@/lib/pose-scoring";
import type { PoseSimilarityResult } from "@/lib/pose-scoring";

export interface UsePoseCoachingLoopResult {
  /** Latest similarity result, or null if no person is currently detected (or no reference pose is set yet). */
  result: PoseSimilarityResult | null;
  /** The live user's own normalized pose representation this frame — used to position/scale the silhouette guide. Null when nobody is detected. */
  userPose: PoseRepresentation | null;
  /** True once at least one detection pass has run without finding a person in the current frame. */
  personDetected: boolean;
}

/**
 * Runs a continuous detection → normalize → compare loop against the given
 * video element, once a reference pose is available.
 *
 * Every step here reuses existing, unmodified logic:
 * - `detectPoseInVideoFrame` (lib/pose/landmarker.ts) — the video-mode
 *   sibling of the existing image detection, added for this milestone but
 *   sharing the same model/runtime.
 * - `buildPoseRepresentation` (lib/pose-processing) — unchanged from the
 *   normalization milestone.
 * - `comparePoses` (lib/pose-scoring) — unchanged from the scoring milestone.
 */
export function usePoseCoachingLoop(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  referencePose: PoseRepresentation | null,
  isStreaming: boolean,
  passThreshold: number
): UsePoseCoachingLoopResult {
  const [result, setResult] = useState<PoseSimilarityResult | null>(null);
  const [userPose, setUserPose] = useState<PoseRepresentation | null>(null);
  const [personDetected, setPersonDetected] = useState(false);
  const referencePoseRef = useRef(referencePose);
  useEffect(() => {
    referencePoseRef.current = referencePose;
  }, [referencePose]);

  useEffect(() => {
    if (!isStreaming) return;

    let cancelled = false;
    let rafId: number;

    const tick = async () => {
      const video = videoRef.current;
      const reference = referencePoseRef.current;

      if (video && video.readyState >= 2 && reference) {
        try {
          const detection = await detectPoseInVideoFrame(video, performance.now());
          const primaryPose = detection.poses[0];

          if (cancelled) return;

          if (!primaryPose) {
            setPersonDetected(false);
            setResult(null);
            setUserPose(null);
          } else {
            setPersonDetected(true);
            const userRepresentation = buildPoseRepresentation(primaryPose);
            setUserPose(userRepresentation);
            setResult(comparePoses(reference, userRepresentation, { passThreshold }));
          }
        } catch (err) {
          // A single bad frame shouldn't crash the loop — log and keep going.
          console.error("Pose detection error on live frame:", err);
        }
      }

      if (!cancelled) {
        rafId = requestAnimationFrame(() => void tick());
      }
    };

    rafId = requestAnimationFrame(() => void tick());

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [videoRef, isStreaming, passThreshold]);

  return { result, userPose, personDetected };
}
