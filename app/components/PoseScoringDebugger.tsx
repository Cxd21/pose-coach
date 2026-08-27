"use client";

import { useMemo, useState } from "react";
import PoseUploadSlot from "./PoseUploadSlot";
import { comparePoses, DEFAULT_SCORING_CONFIG } from "@/lib/pose-scoring";
import type { PoseSimilarityResult, ZoneScore } from "@/lib/pose-scoring";
import type { PoseRepresentation } from "@/lib/pose-processing";

const ZONE_LABELS: Record<keyof PoseSimilarityResult["zones"], string> = {
  head: "Head",
  torso: "Torso",
  leftArm: "Left arm",
  rightArm: "Right arm",
  leftLeg: "Left leg",
  rightLeg: "Right leg",
};

export default function PoseScoringDebugger() {
  const [referencePose, setReferencePose] = useState<PoseRepresentation | null>(null);
  const [userPose, setUserPose] = useState<PoseRepresentation | null>(null);
  const [threshold, setThreshold] = useState(DEFAULT_SCORING_CONFIG.passThreshold);

  const result = useMemo<PoseSimilarityResult | null>(() => {
    if (!referencePose || !userPose) return null;
    return comparePoses(referencePose, userPose, { passThreshold: threshold });
  }, [referencePose, userPose, threshold]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PoseUploadSlot label="Reference pose" onPoseChange={setReferencePose} />
        <PoseUploadSlot label="Comparison pose" onPoseChange={setUserPose} />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <label htmlFor="threshold" className="text-sm text-neutral-300">
          Pass threshold
        </label>
        <input
          id="threshold"
          type="number"
          min={0}
          max={100}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-20 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
        />
        <span className="text-xs text-neutral-500">
          Zone score needed to count as a &ldquo;match&rdquo; (default {DEFAULT_SCORING_CONFIG.passThreshold}).
        </span>
      </div>

      {!result && (
        <p className="rounded-lg border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-600">
          Upload both a reference pose and a comparison pose to see similarity scores.
        </p>
      )}

      {result && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-neutral-500">Overall similarity</p>
              <p className="text-3xl font-semibold text-neutral-100">
                {result.overallScore.toFixed(1)}
                <span className="text-base text-neutral-500"> / 100</span>
              </p>
            </div>
            <p className="text-xs text-neutral-500">
              Overall confidence: {Math.round(result.overallConfidence * 100)}%
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(Object.keys(ZONE_LABELS) as (keyof PoseSimilarityResult["zones"])[]).map((zoneKey) => (
              <ZoneScoreCard key={zoneKey} label={ZONE_LABELS[zoneKey]} zone={result.zones[zoneKey]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ZoneScoreCard({ label, zone }: { label: string; zone: ZoneScore }) {
  const badge = !zone.reliable
    ? { text: "Low confidence", className: "bg-neutral-800 text-neutral-400" }
    : zone.passed
      ? { text: "Pass", className: "bg-emerald-900/50 text-emerald-300" }
      : { text: "Fail", className: "bg-red-900/50 text-red-300" };

  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950 p-3">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</h3>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
          {badge.text}
        </span>
      </div>
      <p className="text-xl font-semibold text-neutral-100">
        {zone.score !== null ? zone.score.toFixed(1) : "—"}
        <span className="text-xs text-neutral-500"> / 100</span>
      </p>
      <p className="text-xs text-neutral-500">Confidence: {Math.round(zone.confidence * 100)}%</p>
    </div>
  );
}
