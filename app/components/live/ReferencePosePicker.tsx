"use client";

import { useCallback, useState } from "react";
import { detectPoseInImage } from "@/lib/pose";
import { buildPoseRepresentation, buildReferenceSilhouette } from "@/lib/pose-processing";
import type { PoseRepresentation, ReferenceSilhouette } from "@/lib/pose-processing";

export interface ReferencePoseData {
  representation: PoseRepresentation;
  /** Real, photo-derived silhouette (faded photo cutout + traced contour) for the fixed overlay guide. */
  silhouette: ReferenceSilhouette;
}

export interface ReferencePosePickerProps {
  onPoseChange: (data: ReferencePoseData | null) => void;
}

type Status = "idle" | "detecting" | "ready" | "error";

export default function ReferencePosePicker({ onPoseChange }: ReferencePosePickerProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setErrorMessage(null);
      onPoseChange(null);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setStatus("detecting");

      const img = new window.Image();
      img.onload = async () => {
        try {
          // detectPoseInImage (not the combined face+hand detector) is all
          // we need here — this component only ever used the body pose
          // landmarks, and this call also gives us the segmentation mask
          // needed to build a real, photo-shaped silhouette below.
          const detection = await detectPoseInImage(img);
          const primaryPose = detection.poses[0];
          if (!primaryPose) {
            setStatus("error");
            setErrorMessage("No pose found — try a clearer full-body shot.");
            onPoseChange(null);
            return;
          }
          if (!detection.segmentationMask) {
            setStatus("error");
            setErrorMessage("Couldn't extract a silhouette from that photo. Try another.");
            onPoseChange(null);
            return;
          }

          const representation = buildPoseRepresentation(primaryPose);
          const silhouette = buildReferenceSilhouette(img, detection.segmentationMask);

          if (silhouette.bounds.width === 0 || silhouette.bounds.height === 0) {
            setStatus("error");
            setErrorMessage(
              "Couldn't get a clean outline from that photo (low contrast with the background?). Try another."
            );
            onPoseChange(null);
            return;
          }

          setStatus("ready");
          onPoseChange({ representation, silhouette });
        } catch (err) {
          console.error(err);
          setStatus("error");
          setErrorMessage("Couldn't read pose. Try another photo.");
          onPoseChange(null);
        }
      };
      img.onerror = () => {
        setStatus("error");
        setErrorMessage("Couldn't load image file.");
        onPoseChange(null);
      };
      img.src = objectUrl;
    },
    [onPoseChange]
  );

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-neutral-500 hidden xs:inline">Reference</span>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Reference pose"
          className="h-8 w-8 rounded-full border-2 border-pink-300 object-cover shadow-xs"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-pink-300 bg-pink-50 text-[11px] text-pink-400">
          📷
        </div>
      )}

      <label className="cursor-pointer rounded-full bg-pink-100/90 px-3 py-1.5 text-xs font-semibold text-pink-500 shadow-xs transition-colors hover:bg-pink-200/80">
        {status === "detecting" ? "Reading..." : status === "ready" ? "Change reference" : "Choose reference"}
        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </label>

      {errorMessage && (
        <span className="text-[10px] text-red-500 max-w-[100px] truncate" title={errorMessage}>
          {errorMessage}
        </span>
      )}
    </div>
  );
}

