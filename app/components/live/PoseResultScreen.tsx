"use client";

import { useEffect, useState } from "react";
import type { PoseSimilarityResult } from "@/lib/pose-scoring";
import { comparePoses } from "@/lib/pose-scoring";
import { detectFullBodyInImage } from "@/lib/pose";
import { buildPoseRepresentation } from "@/lib/pose-processing";
import type { PoseRepresentation } from "@/lib/pose-processing";
import { ZONE_KEYS, ZONE_LABELS } from "@/lib/pose-coaching";

export interface PoseResultScreenProps {
  photoUrl: string;
  referencePose: PoseRepresentation | null;
  result: PoseSimilarityResult | null;
  onRetake: () => void;
  onDone: () => void;
}

export default function PoseResultScreen({
  photoUrl,
  referencePose,
  result: initialResult,
  onRetake,
  onDone,
}: PoseResultScreenProps) {
  const [scoringResult, setScoringResult] = useState<PoseSimilarityResult | null>(initialResult);
  const [isAnalyzing, setIsAnalyzing] = useState(!initialResult && !!referencePose);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // If no initial result was provided at capture time, run image through existing detection pipeline
  useEffect(() => {
    if (initialResult || !referencePose) return;

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      if (cancelled) return;
      try {
        const detection = await detectFullBodyInImage(img);
        const userLandmarks = detection.poses[0];
        if (!userLandmarks) {
          if (!cancelled) {
            setAnalysisError("No person detected in the captured photo. Try stepping further into the frame!");
            setIsAnalyzing(false);
          }
          return;
        }

        const userPose = buildPoseRepresentation(
          userLandmarks,
          detection.segmentationMask,
          detection.imageWidth,
          detection.imageHeight
        );

        const evaluated = comparePoses(referencePose, userPose);
        if (!cancelled) {
          setScoringResult(evaluated);
          setIsAnalyzing(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setAnalysisError("Couldn't analyze the pose in this photo.");
          setIsAnalyzing(false);
        }
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        setAnalysisError("Couldn't load captured image for analysis.");
        setIsAnalyzing(false);
      }
    };
    img.src = photoUrl;

    return () => {
      cancelled = true;
    };
  }, [photoUrl, referencePose, initialResult]);

  const overallScore = scoringResult ? Math.round(scoringResult.overallScore) : 0;
  const isStrong = overallScore >= 90;
  const isGood = overallScore >= 75 && overallScore < 90;

  return (
    <div className="flex w-full flex-col gap-4 animate-in fade-in duration-200">
      {/* Result Header */}
      <header className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-bold text-neutral-800">
            Pose <span className="text-pink-500">Result</span> ✨
          </h2>
          <p className="text-xs text-neutral-500">Match score and feedback</p>
        </div>

        {scoringResult && (
          <div
            className={`flex items-center gap-1.5 rounded-2xl px-3 py-1.5 shadow-sm border ${
              isStrong
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : isGood
                ? "bg-pink-50 text-pink-700 border-pink-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            <span className="text-base">♡</span>
            <span className="text-lg font-bold leading-none">{overallScore}%</span>
          </div>
        )}
      </header>

      {/* Captured Photo Card */}
      <div
        className="relative overflow-hidden rounded-[28px] bg-neutral-950 shadow-md border border-neutral-200/50"
        style={{ aspectRatio: "3 / 4" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt="Captured pose result"
          className="h-full w-full object-cover"
        />

        {/* Quality Status Badge */}
        {scoringResult && (
          <div className="absolute top-4 left-4 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold text-neutral-800 shadow-md backdrop-blur-md border border-white/60 flex items-center gap-1.5">
            <span>{isStrong ? "🌟" : isGood ? "✨" : "⚡"}</span>
            <span>
              {isStrong
                ? "Strong Match"
                : isGood
                ? "Good Match"
                : "Needs Improvement"}
            </span>
          </div>
        )}

        {isAnalyzing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs">
            <div className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-neutral-800 shadow-md">
              Analyzing pose... ✨
            </div>
          </div>
        )}
      </div>

      {/* Body-Part Accuracy Breakdown */}
      <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm border border-neutral-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
            Body-Zone Feedback
          </h3>
          {scoringResult && (
            <span className="text-[11px] font-medium text-neutral-500">
              {isStrong
                ? "All required zones matched!"
                : "Target 90% across zones"}
            </span>
          )}
        </div>

        {scoringResult ? (
          <div className="grid grid-cols-2 gap-2 mt-1">
            {ZONE_KEYS.map((key) => {
              const zone = scoringResult.zones[key];
              const score = zone.score !== null ? Math.round(zone.score) : null;
              const isPassed = zone.passed === true;
              const isReliable = zone.reliable;

              return (
                <div
                  key={key}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 border text-xs font-medium transition-colors ${
                    !isReliable
                      ? "bg-neutral-50 border-neutral-200 text-neutral-400"
                      : isPassed
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                      : "bg-pink-50/70 border-pink-200 text-pink-800"
                  }`}
                >
                  <span className="truncate pr-1">{ZONE_LABELS[key]}</span>
                  <span className="font-bold shrink-0">
                    {!isReliable ? "—" : isPassed ? `✓ ${score}%` : `${score}%`}
                  </span>
                </div>
              );
            })}
          </div>
        ) : analysisError ? (
          <div className="rounded-xl bg-amber-50/80 p-3 text-xs text-amber-800 border border-amber-200">
            <p className="font-semibold">Photo captured ✨</p>
            <p className="mt-0.5 text-amber-700">{analysisError}</p>
          </div>
        ) : (
          <p className="text-xs text-neutral-500 py-1">
            {isAnalyzing ? "Reading body zones..." : "Pose scoring details unavailable for this photo."}
          </p>
        )}
      </div>

      {/* Action Buttons: Retake and Back to Coach */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onRetake}
          className="flex-1 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm border border-neutral-300 hover:bg-neutral-50 transition-all active:scale-95 cursor-pointer text-center"
        >
          Retake
        </button>
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-full bg-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-pink-600 transition-all active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1.5"
        >
          <span>Back to Coach</span>
          <span>✨</span>
        </button>
      </div>
    </div>
  );
}
