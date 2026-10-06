"use client";

import { useEffect, useRef, useState } from "react";
import { detectPoseInVideoFrame } from "@/lib/pose";
import { buildPoseRepresentation, computeGuidePlacement } from "@/lib/pose-processing";
import type { PoseRepresentation, ReferenceSilhouette } from "@/lib/pose-processing";
import { comparePoses } from "@/lib/pose-scoring";
import type { PoseSimilarityResult } from "@/lib/pose-scoring";
import { boundingBoxOfPoints, computeFramingMatch } from "@/lib/pose-coaching";
import type { FramingMatch } from "@/lib/pose-coaching";

export interface UsePoseCoachingLoopResult {
  /** Latest similarity result, or null if no person is currently detected (or no reference pose is set yet). */
  result: PoseSimilarityResult | null;
  /** The live user's own normalized pose representation this frame — used to position/scale the silhouette guide. Null when nobody is detected. */
  userPose: PoseRepresentation | null;
  /**
   * How well the user's on-screen position/size matches the fixed guide's
   * box, independent of pose shape. Null until both a person and the
   * reference silhouette are available.
   */
  framing: FramingMatch | null;
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
 *
 * It additionally computes a *framing* match each frame — separate from
 * pose similarity — checking whether the user is actually standing where
 * the fixed reference guide is drawn, not just whether their pose shape
 * matches. See lib/pose-coaching/framing.ts for why this is kept distinct
 * from the (intentionally position/scale-invariant) pose scoring.
 */
export function usePoseCoachingLoop(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  referencePose: PoseRepresentation | null,
  referenceSilhouette: ReferenceSilhouette | null,
  isStreaming: boolean,
  passThreshold: number
): UsePoseCoachingLoopResult {
  const [result, setResult] = useState<PoseSimilarityResult | null>(null);
  const [userPose, setUserPose] = useState<PoseRepresentation | null>(null);
  const [framing, setFraming] = useState<FramingMatch | null>(null);
  const [personDetected, setPersonDetected] = useState(false);

  const referencePoseRef = useRef(referencePose);
  useEffect(() => {
    referencePoseRef.current = referencePose;
  }, [referencePose]);

  const referenceSilhouetteRef = useRef(referenceSilhouette);
  useEffect(() => {
    referenceSilhouetteRef.current = referenceSilhouette;
  }, [referenceSilhouette]);

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
            setFraming(null);
          } else {
            setPersonDetected(true);
            const userRepresentation = buildPoseRepresentation(primaryPose);
            setUserPose(userRepresentation);
            setResult(comparePoses(reference, userRepresentation, { passThreshold }));

            // Framing: compare the user's raw on-screen bounding box
            // against the guide's fixed box, in the same canvas-pixel
            // space. Uses raw (un-normalized) landmarks — this is
            // deliberately about literal screen position, unlike the
            // scale/position-invariant pose comparison above.
            const silhouette = referenceSilhouetteRef.current;
            if (silhouette && video.videoWidth > 0 && video.videoHeight > 0) {
              const pixelPoints = primaryPose.map((lm) => ({
                x: lm.x * video.videoWidth,
                y: lm.y * video.videoHeight,
                visibility: lm.visibility,
              }));
              const userBox = boundingBoxOfPoints(pixelPoints);
              const guideBox = computeGuidePlacement(silhouette.bounds, video.videoWidth, video.videoHeight);
              setFraming(userBox ? computeFramingMatch(userBox, guideBox) : null);
            } else {
              setFraming(null);
            }
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

  return { result, userPose, framing, personDetected };
}
