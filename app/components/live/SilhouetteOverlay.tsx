"use client";

import { useEffect, useRef } from "react";
import { drawSilhouette } from "@/lib/pose-processing";
import type { PoseRepresentation } from "@/lib/pose-processing";

export interface SilhouetteOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  referencePose: PoseRepresentation | null;
}

/**
 * Draws the STATIC outer body silhouette guide derived from the reference photograph.
 * It is completely locked to the camera viewport and acts as a photographic framing/composition guide.
 * It preserves the reference person's original scale, aspect ratio, and composition position.
 * It does NOT track the user's live motion and contains NO skeletal lines, dots, or bones.
 */
export default function SilhouetteOverlay({ videoRef, referencePose }: SilhouetteOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !referencePose) return;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const displayWidth = Math.round(rect.width || canvas.clientWidth || 390);
      const displayHeight = Math.round(rect.height || canvas.clientHeight || 520);

      if (displayWidth === 0 || displayHeight === 0) return;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(dpr, dpr);

      // Render static reference outer silhouette (0.75 outline, 0.25 fill)
      drawSilhouette(ctx, referencePose, displayWidth, displayHeight, {
        fillColor: "#ffffff",
        fillOpacity: 0.25,
        outlineColor: "#ffffff",
        outlineOpacity: 0.75,
        outlineWidth: 1.75,
        dash: [6, 5],
      });

      ctx.restore();
    };

    render();

    const resizeObserver = new ResizeObserver(() => {
      render();
    });
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [videoRef, referencePose]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
