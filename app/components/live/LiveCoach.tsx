"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useCameraStream } from "./useCameraStream";
import { usePoseCoachingLoop } from "./usePoseCoachingLoop";
import { useBodyPartChecklist } from "./useBodyPartChecklist";
import { useCoachingTip } from "./useCoachingTip";
import { useAutoCapture } from "./useAutoCapture";
import ReferencePosePicker from "./ReferencePosePicker";
import type { ReferencePoseData } from "./ReferencePosePicker";
import SilhouetteOverlay from "./SilhouetteOverlay";
import BodyPartChecklist from "./BodyPartChecklist";
import type { PoseRepresentation, ReferenceSilhouette } from "@/lib/pose-processing";
import { DEFAULT_SCORING_CONFIG } from "@/lib/pose-scoring";

type CaptureMode = "auto" | "manual";

/** Grabs the current video frame as a data URL, flipped to match the mirrored preview the user actually saw. */
function captureFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export default function LiveCoach() {
  const {
    videoRef,
    status: cameraStatus,
    errorMessage: cameraError,
    requestCamera,
  } = useCameraStream();
  const [referencePose, setReferencePose] = useState<PoseRepresentation | null>(null);
  const [referenceSilhouette, setReferenceSilhouette] = useState<ReferenceSilhouette | null>(null);
  const [mode, setMode] = useState<CaptureMode>("auto");
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);

  const handleReferenceChange = useCallback((data: ReferencePoseData | null) => {
    setReferencePose(data?.representation ?? null);
    setReferenceSilhouette(data?.silhouette ?? null);
  }, []);

  const isStreaming = cameraStatus === "streaming";

  const { result, framing, personDetected } = usePoseCoachingLoop(
    videoRef,
    referencePose,
    referenceSilhouette,
    isStreaming && !capturedPhotoUrl,
    DEFAULT_SCORING_CONFIG.passThreshold
  );

  const checklistItems = useBodyPartChecklist(result);
  const tipState = useCoachingTip(result, framing);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCapturedPhotoUrl(captureFrame(video));
  }, [videoRef]);

  useAutoCapture(result, framing, mode === "auto" && isStreaming && !capturedPhotoUrl, handleCapture);

  const overallScore = result ? Math.round(result.overallScore) : 0;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 font-sans select-none">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-1 py-1">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label="Back to home"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-200/60 transition-colors"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold tracking-tight text-neutral-800">
            Pose <span className="text-pink-500">Coach</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <ReferencePosePicker onPoseChange={handleReferenceChange} />
          <button
            type="button"
            aria-label="Settings"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-200/60 transition-colors"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Camera Viewport */}
      <div
        className="relative overflow-hidden rounded-[32px] bg-neutral-950 shadow-lg border border-neutral-200/50"
        style={{ aspectRatio: "3 / 4" }}
      >
        {capturedPhotoUrl ? (
          <div className="relative h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedPhotoUrl}
              alt="Captured pose"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-6 flex justify-center gap-3">
              <button
                onClick={() => setCapturedPhotoUrl(null)}
                className="rounded-full bg-white/90 backdrop-blur-md px-6 py-2.5 text-sm font-semibold text-neutral-800 shadow-md hover:bg-white transition-all active:scale-95"
              >
                Retake
              </button>
              <a
                href={capturedPhotoUrl}
                download="pose-capture.png"
                className="rounded-full bg-pink-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-pink-600 transition-all active:scale-95 flex items-center gap-1.5"
              >
                Save
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Mirrored Camera Stream */}
            <div className="absolute inset-0 -scale-x-100">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            </div>

            {/* Locked Reference Outer Silhouette (fixed target overlay) */}
            {referenceSilhouette && (
              <div className="absolute inset-0 -scale-x-100 pointer-events-none">
                <SilhouetteOverlay videoRef={videoRef} silhouette={referenceSilhouette} />
              </div>
            )}

            {/* Top-Left: Overall Similarity Card */}
            {isStreaming && referencePose && result && (
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-2xl bg-white/90 px-3.5 py-2 shadow-sm backdrop-blur-md border border-white/60">
                <span className="text-xl text-pink-500">♡</span>
                <div className="flex flex-col">
                  <span className="text-xl font-bold leading-none text-neutral-800">
                    {overallScore}%
                  </span>
                  <span className="text-[10px] font-medium text-neutral-500 leading-tight">
                    Overall similarity
                  </span>
                </div>
              </div>
            )}

            {/* Left: Dynamic 3-item Focus List (icon + name only) */}
            {isStreaming && referencePose && checklistItems.length > 0 && (
              <div className="absolute left-4 top-20">
                <BodyPartChecklist items={checklistItems} />
              </div>
            )}

            {/* Right: Speech Bubble Coaching Tip */}
            {isStreaming && referencePose && personDetected && tipState && (
              <div className="absolute right-4 bottom-24 max-w-[175px] rounded-3xl bg-white/90 p-3 shadow-md backdrop-blur-md border border-white/60 text-xs">
                <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-700">
                  <span className="text-pink-400">✨</span>
                  <span>Tip</span>
                </div>
                <p className="mt-1 text-neutral-700 leading-snug">
                  {tipState.structured ? (
                    <>
                      {tipState.structured.prefix}{" "}
                      <span className="font-bold text-pink-500">
                        {tipState.structured.highlight}
                      </span>{" "}
                      {tipState.structured.suffix}
                    </>
                  ) : (
                    tipState.text
                  )}
                </p>
                <div className="mt-1 flex justify-end">
                  <span className="text-[11px]">💗</span>
                </div>
              </div>
            )}

            {/* Edge Cases & Status Overlays */}
            {cameraStatus === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-900/90 p-6 text-center">
                <p className="text-sm text-white">{cameraError}</p>
                <button
                  onClick={requestCamera}
                  className="rounded-full bg-pink-500 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-pink-600 transition-colors"
                >
                  Enable camera access
                </button>
              </div>
            )}

            {isStreaming && !referencePose && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <div className="rounded-2xl bg-white/90 px-5 py-3 shadow-sm backdrop-blur-md border border-white/60">
                  <p className="text-xs font-semibold text-neutral-700">
                    Choose a reference photo above to start coaching 💗
                  </p>
                </div>
              </div>
            )}

            {isStreaming && referencePose && !personDetected && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <p className="rounded-full bg-white/90 px-5 py-2 text-xs font-semibold text-neutral-700 shadow-sm backdrop-blur-md border border-white/60">
                  Step into frame ✨
                </p>
              </div>
            )}

            {/* Bottom Controls Bar */}
            {isStreaming && referencePose && (
              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between">
                {/* Auto Mode Toggle Pill */}
                <button
                  type="button"
                  onClick={() => setMode((m) => (m === "auto" ? "manual" : "auto"))}
                  className="flex items-center gap-2 rounded-full bg-white/90 px-3.5 py-1.5 shadow-sm backdrop-blur-md border border-white/60 cursor-pointer hover:bg-white transition-colors"
                >
                  <span className="text-xs text-pink-500">✨</span>
                  <span className="text-xs font-semibold text-neutral-700">Auto</span>
                  <div
                    className={`relative h-4 w-7 rounded-full transition-colors ${
                      mode === "auto" ? "bg-pink-400" : "bg-neutral-300"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                        mode === "auto" ? "translate-x-3.5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </button>

                {/* Central Shutter Button */}
                <button
                  onClick={handleCapture}
                  aria-label="Capture photo"
                  className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-pink-500 shadow-xl transition-transform active:scale-90 hover:scale-105"
                >
                  <div className="h-12 w-12 rounded-full bg-pink-400/90 border border-white/40" />
                </button>

                {/* Manual Mode Indicator / Pill */}
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-md border transition-colors ${
                    mode === "manual"
                      ? "bg-pink-100 text-pink-600 border-pink-300"
                      : "bg-white/90 text-neutral-700 border-white/60 hover:bg-white"
                  }`}
                >
                  <span>📷</span>
                  <span>Manual</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Subtext */}
      <footer className="text-center">
        <p className="flex items-center justify-center gap-1 text-[11px] font-medium text-neutral-500">
          <span className="text-pink-400">✨</span>
          Auto capture when pose and framing both match, held for 1 second
        </p>
      </footer>
    </div>
  );
}

