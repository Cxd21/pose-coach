"use client";

import { useCallback, useRef, useState } from "react";
import { detectPoseInImage, drawAllPoses } from "@/lib/pose";
import type { PoseDetectionResult } from "@/lib/pose";

type Status = "idle" | "loading-model" | "detecting" | "done" | "error";

export default function PoseDebugger() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<PoseDetectionResult | null>(null);
  const [hasImage, setHasImage] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runDetection = useCallback(async (image: HTMLImageElement) => {
    setErrorMessage(null);
    setStatus("loading-model");
    try {
      // detectPoseInImage lazily loads the model on first call, so the
      // "loading-model" vs "detecting" distinction is approximate but
      // gives the user useful feedback on the first run.
      setStatus("detecting");
      const detection = await detectPoseInImage(image);
      setResult(detection);

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        drawAllPoses(canvas, detection.poses);
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

  const totalLandmarksDetected = result?.poses[0]?.length ?? 0;

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
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Poses found" value={result.poses.length} />
            <Stat label="Landmarks / pose" value={totalLandmarksDetected} />
            <Stat label="Image width" value={`${result.imageWidth}px`} />
            <Stat label="Image height" value={`${result.imageHeight}px`} />
          </dl>
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

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; className: string }> = {
    idle: { label: "Waiting for image", className: "bg-neutral-800 text-neutral-400" },
    "loading-model": { label: "Loading model…", className: "bg-amber-900/50 text-amber-300" },
    detecting: { label: "Detecting pose…", className: "bg-amber-900/50 text-amber-300" },
    done: { label: "Done", className: "bg-emerald-900/50 text-emerald-300" },
    error: { label: "Error", className: "bg-red-900/50 text-red-300" },
  };
  const { label, className } = map[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{label}</span>
  );
}
