"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "streaming" | "error";

export interface UseCameraStreamResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  errorMessage: string | null;
  /** Ask for camera access again (e.g. after the user denied it and wants to retry). */
  requestCamera: () => void;
}

/**
 * Requests webcam access and attaches the resulting stream to a `<video>`
 * element. Ensures the stream is always reattached and playing if the video
 * element remounts or updates.
 */
export function useCameraStream(): UseCameraStreamResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const attachStream = useCallback(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream && stream.active) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.play().catch(() => {
        // Autoplay may already be active or handled by browser
      });
    }
  }, []);

  const requestCamera = useCallback(() => {
    // If stream is already alive, simply reattach and continue
    if (
      streamRef.current &&
      streamRef.current.active &&
      streamRef.current.getVideoTracks().some((t) => t.readyState === "live")
    ) {
      attachStream();
      setStatus("streaming");
      return;
    }

    setStatus("requesting");
    setErrorMessage(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMessage("This browser doesn't support camera access.");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        attachStream();
        setStatus("streaming");
      })
      .catch((err: unknown) => {
        setStatus("error");
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setErrorMessage("Camera access was denied. Allow camera access to use live coaching.");
        } else if (err instanceof DOMException && err.name === "NotFoundError") {
          setErrorMessage("No camera was found on this device.");
        } else if (err instanceof DOMException && err.name === "NotReadableError") {
          setErrorMessage("The camera is already in use by another app.");
        } else {
          setErrorMessage("Couldn't access the camera.");
        }
      });
  }, [attachStream]);

  useEffect(() => {
    queueMicrotask(() => requestCamera());
    return () => stopStream();
  }, [requestCamera, stopStream]);

  // Ensure stream is always attached whenever the video DOM element is present
  useEffect(() => {
    attachStream();
  });

  return { videoRef, status, errorMessage, requestCamera };
}
