"use client";

import { useCallback, useRef, useState } from "react";
import { detectFullBodyInImage, drawFullBodyDetection } from "@/lib/pose";
import { buildPoseRepresentation } from "@/lib/pose-processing";
import type { PoseRepresentation } from "@/lib/pose-processing";

type Status = "idle" | "loading-model" | "detecting" | "done" | "error";

export interface PoseUploadSlotProps {
  label: string;
  /** Called with the normalized pose representation whenever a new detection completes, or null on error/no-pose-found. */
  onPoseChange: (representation: PoseRepresentation | null) => void;
}

/**
 * Upload an image, run the existing detection + normalization pipeline on
 * it, and report the resulting PoseRepresentation up to the parent. Used
 * twice by PoseScoringDebugger (reference slot + comparison slot) so the
 * upload/detect/draw logic isn't duplicated between them.
 */
export default function PoseUploadSlot({ label, onPoseChange }: PoseUploadSlotProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const runDetection = useCallback(
    async (image: HTMLImageElement) => {
      setErrorMessage(null);
      setStatus("loading-model");
      try {
        setStatus("detecting");
        const detection = await detectFullBodyInImage(image);

        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          drawFullBodyDetection(canvas, detection);
        }

        const primaryPose = detection.poses[0];
        if (!primaryPose) {
          setErrorMessage("No pose detected. Try a clearer, fully-visible photo.");
          onPoseChange(null);
        } else {
          onPoseChange(buildPoseRepresentation(primaryPose));
        }
        setStatus("done");
      } catch (err) {
        console.error(err);
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong running pose detection."
        );
        onPoseChange(null);
      }
    },
    [onPoseChange]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      onPoseChange(null);
      const objectUrl = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        setHasImage(true);
        void runDetection(img);
      };
      img.onerror = () => {
        setStatus("error");
        setErrorMessage("Could not load that image file.");
      };
      img.src = objectUrl;
    },
    [runDetection, onPoseChange]
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-neutral-300">{label}</label>
        <StatusBadge status={status} />
      </div>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="block w-full cursor-pointer rounded-md border border-neutral-700 bg-neutral-950 text-xs text-neutral-300 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-cyan-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-cyan-500"
      />

      {errorMessage && (
        <p className="rounded-md border border-amber-800 bg-amber-950/40 px-3 py-2 text-xs text-amber-300">
          {errorMessage}
        </p>
      )}

      <div className="relative flex min-h-[160px] items-center justify-center overflow-hidden rounded-md bg-black/40">
        {!hasImage && <p className="p-6 text-xs text-neutral-600">Upload an image</p>}
        <canvas ref={canvasRef} className="h-auto max-w-full" />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; className: string }> = {
    idle: { label: "Waiting", className: "bg-neutral-800 text-neutral-400" },
    "loading-model": { label: "Loading…", className: "bg-amber-900/50 text-amber-300" },
    detecting: { label: "Detecting…", className: "bg-amber-900/50 text-amber-300" },
    done: { label: "Done", className: "bg-emerald-900/50 text-emerald-300" },
    error: { label: "Error", className: "bg-red-900/50 text-red-300" },
  };
  const { label, className } = map[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${className}`}>{label}</span>
  );
}
