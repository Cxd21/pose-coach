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
 * element. Handles the common failure modes (permission denied, no camera
 * present, camera already in use) with a plain-language message instead of
 * letting the raw DOMException surface.
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

  const requestCamera = useCallback(() => {
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
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
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
  }, []);

  useEffect(() => {
    queueMicrotask(() => requestCamera());
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { videoRef, status, errorMessage, requestCamera };
}
