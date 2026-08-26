/**
 * Shared MediaPipe Tasks Vision WASM runtime loader.
 *
 * All three landmarkers (pose, face, hand) need a `FilesetResolver` pointed
 * at the same WASM build. Centralizing it here means the version string
 * only lives in one place — bump it here when `@mediapipe/tasks-vision` is
 * upgraded in package.json, instead of hunting through multiple files.
 */

import { FilesetResolver } from "@mediapipe/tasks-vision";

// Must match the installed "@mediapipe/tasks-vision" version in package.json.
const WASM_FILESET_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

let filesetPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null =
  null;

/** Lazily creates (and caches) the shared vision WASM fileset. */
export function getVisionFileset() {
  if (!filesetPromise) {
    filesetPromise = FilesetResolver.forVisionTasks(WASM_FILESET_URL);
  }
  return filesetPromise;
}
