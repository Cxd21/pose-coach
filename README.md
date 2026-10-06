# Pose Coach — Milestone 1: CV Foundation

This is the first development milestone for Pose Coach: a pose-detection
debug tool. Upload a reference photo, and it runs the official MediaPipe
Tasks Vision Pose Landmarker on it, then overlays the detected skeleton
for visual verification.

**Scope note:** per the milestone spec, there is no camera UI, auth,
database, backend, or pose library here — just the CV foundation.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000, upload an image with a person in it, and
you should see the skeleton overlay plus landmark counts within a
second or two (the pose model downloads from Google's CDN on first use
and is cached by the browser after that).

## Structure

- `lib/pose/` — all MediaPipe logic, framework-agnostic
  - `landmarker.ts` — loads the model, runs detection
  - `drawLandmarks.ts` — debug-only canvas rendering of the skeleton
  - `types.ts` — shared types + landmark index enum + bone connections
  - `index.ts` — barrel export
- `app/components/PoseDebugger.tsx` — upload UI + orchestration (client component)
- `app/page.tsx` — page shell

## Notes

- Detection runs entirely client-side (WASM). Nothing is uploaded to a server.
- The model file (`pose_landmarker_lite.task`) and WASM runtime are fetched
  from Google's/MediaPipe's CDN at runtime, not bundled into the app.
- The skeleton overlay is for development debugging only, per the product
  spec — it will not ship to end users.
