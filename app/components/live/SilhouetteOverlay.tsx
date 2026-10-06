"use client";

import { useEffect, useRef } from "react";
import { computeGuidePlacement } from "@/lib/pose-processing";
import type { ReferenceSilhouette } from "@/lib/pose-processing";

export interface SilhouetteOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Real, photo-derived silhouette (faded photo cutout + traced contour) built once from the reference photo. */
  silhouette: ReferenceSilhouette | null;
}

/**
 * Draws the target-pose silhouette guide, fixed to the camera frame.
 *
 * This does not read the live user's pose at all — the guide's shape,
 * size, and position are derived entirely from the reference photo (via
 * `silhouette`, built once in ReferencePosePicker) and a fixed placement
 * within the frame. It never resizes, rotates, or repositions itself
 * based on the user: it's a locked tracing guide the user moves into,
 * not something that tracks them.
 */
export default function SilhouetteOverlay({ videoRef, silhouette }: SilhouetteOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const draw = () => {
      if (video.videoWidth === 0 || video.videoHeight === 0) return;
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!silhouette || silhouette.bounds.width === 0 || silhouette.bounds.height === 0) return;

      const { fillCanvas, contour, bounds } = silhouette;

      // Fixed fit-to-frame transform: scale the reference person's bounding
      // box to fill most of the frame's height, centered. Computed fresh
      // each time (photo change / video metadata becomes available) but
      // never touches anything about the live user. Shared with the
      // framing-check logic in usePoseCoachingLoop so both always agree on
      // exactly where the guide is.
      const placement = computeGuidePlacement(bounds, canvas.width, canvas.height);
      const { x: destX, y: destY, width: targetWidth, height: targetHeight } = placement;
      const scale = bounds.height > 0 ? targetHeight / bounds.height : 0;

      // 1. Flat white silhouette fill, cropped to the person's bounding box.
      ctx.drawImage(
        fillCanvas,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        destX,
        destY,
        targetWidth,
        targetHeight
      );

      // 2. Traced dotted outline, mapped through the same fixed transform.
      const mapX = (x: number) => destX + (x - bounds.x) * scale;
      const mapY = (y: number) => destY + (y - bounds.y) * scale;

      ctx.save();
      ctx.lineCap = "round";
      ctx.setLineDash([1, 8]);
      ctx.strokeStyle = "rgba(107, 114, 128, 0.8)"; // darker shade of the same blue-grey fill, for a visible boundary
      ctx.lineWidth = 3;
      ctx.beginPath();
      contour.forEach((p, i) => {
        const x = mapX(p.x);
        const y = mapY(p.y);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    };

    draw();
    video.addEventListener("loadedmetadata", draw);
    return () => video.removeEventListener("loadedmetadata", draw);
  }, [videoRef, silhouette]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
    />
  );
}
