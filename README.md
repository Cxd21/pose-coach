# Pose Coach — Milestone 5: Gen-Z Live Posing Assistant

This is the complete Pose Coach application featuring the real-time AI posing assistant matching the clean, Gen-Z friendly photo coaching design.

## Features

- **Minimal Focus on List**:
  - Dynamic 3-item queue prioritizing body portions furthest from the target.
  - Icon + name only (no raw numbers or progress bars).
  - Horizontal dotted strike-through animation when reaching $\ge 90\%$.
  - 85% hysteresis re-entry threshold to prevent boundary flickering.
  - Automatically hidden/empty when all body parts are matched.
- **Camera-Locked Outer Silhouette**:
  - Derived from the reference image/pose and locked to the camera frame.
  - Does not track user motion, acting as a static ghost guide.
  - Low outline and fill opacity for an unobtrusive target guide.
- **Speech Bubble Coaching Tip**:
  - Frosted speech bubble with `✨ Tip`, body-part highlighting in pink, and `💗` icon.
  - Celebratory hold prompt when all body parts are matched.
- **Gen-Z Camera Controls**:
  - `✨ Auto` toggle switch.
  - Central pink shutter button (instant manual click and hold-to-capture visual in auto mode).
  - `📷 Manual` pill mode indicator.
  - Auto-capture triggers after all body parts remain $\ge 90\%$ for ~1 second.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000/live to use the live camera coaching assistant.
