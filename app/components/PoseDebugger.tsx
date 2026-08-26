"use client";

import { useCallback, useRef, useState } from "react";
import { detectFullBodyInImage, drawFullBodyDetection } from "@/lib/pose";
import type { CombinedDetectionResult } from "@/lib/pose";

type Status = "idle" | "loading-model" | "detecting" | "done" | "error";

export default function PoseDebugger() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CombinedDetectionResult | null>(null);
  const [hasImage, setHasImage] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runDetection = useCallback(async (image: HTMLImageElement) => {
    setErrorMessage(null);
    setStatus("loading-model");
    try {
      // detectFullBodyInImage lazily loads all three models (pose, face,
      // hand) on first call, so "loading-model" vs "detecting" is
      // approximate but gives useful feedback on the first run.
      setStatus("detecting");
      const detection = await detectFullBodyInImage(image);
      setResult(detection);

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        drawFullBodyDetection(canvas, detection);
      }

      setStatus("done");
      if (detection.poses.length === 0) {
        setErrorMessage(
          "No pose detected in this image. Try a photo with a clearer, fully-visible person."
        );
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong running pose detection."
      );
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setResult(null);
      const objectUrl = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        imageRef.current = img;
        setHasImage(true);
        void runDetection(img);
      };
      img.onerror = () => {
        setStatus("error");
        setErrorMessage("Could not load that image file.");
      };
      img.src = objectUrl;
    },
    [runDetection]
  );

  const bodyLandmarkCount = result?.poses[0]?.length ?? 0;
  const faceLandmarkCount = result?.faces[0]?.length ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <label className="mb-2 block text-sm font-medium text-neutral-300">
          Reference photograph
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full cursor-pointer rounded-md border border-neutral-700 bg-neutral-950 text-sm text-neutral-300 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-cyan-500"
        />
        <p className="mt-2 text-xs text-neutral-500">
          Runs entirely in your browser via MediaPipe WASM — nothing is uploaded to a server.
        </p>
      </section>

      <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-300">Detection output</h2>
          <StatusBadge status={status} />
        </div>

        {errorMessage && (
          <p className="mb-3 rounded-md border border-amber-800 bg-amber-950/40 px-3 py-2 text-sm text-amber-300">
            {errorMessage}
          </p>
        )}

        <div className="relative flex min-h-[200px] items-center justify-center overflow-hidden rounded-md bg-black/40">
          {!hasImage && (
            <p className="p-8 text-sm text-neutral-600">Upload an image to see it here.</p>
          )}
          <canvas ref={canvasRef} className="max-w-full h-auto" />
        </div>

        {result && (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Poses found" value={result.poses.length} />
              <Stat label="Body landmarks" value={bodyLandmarkCount} />
              <Stat label="Face landmarks" value={faceLandmarkCount} />
              <Stat label="Hands found" value={result.hands.length} />
            </dl>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-500">
              <Legend color="#22d3ee" label="Body joints" />
              <Legend color="#a3e635" label="Body bones" />
              <Legend color="#f472b6" label="Face mesh" />
              <Legend color="#fbbf24" label="Hand / finger joints" />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-neutral-950 px-3 py-2">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="text-neutral-100">{value}</dd>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; className: string }> = {
    idle: { label: "Waiting for image", className: "bg-neutral-800 text-neutral-400" },
    "loading-model": { label: "Loading models…", className: "bg-amber-900/50 text-amber-300" },
    detecting: { label: "Detecting…", className: "bg-amber-900/50 text-amber-300" },
    done: { label: "Done", className: "bg-emerald-900/50 text-emerald-300" },
    error: { label: "Error", className: "bg-red-900/50 text-red-300" },
  };
  const { label, className } = map[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{label}</span>
  );
}
