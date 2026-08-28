import { PoseLandmarkIndex, type NormalizedLandmark } from "@/lib/pose/types";
import type {
  PoseRepresentation,
  ReferenceSilhouette,
} from "./types";

export interface Point2D {
  x: number;
  y: number;
}

export interface SilhouetteDrawOptions {
  fillColor?: string;
  fillOpacity?: number;
  outlineColor?: string;
  outlineOpacity?: number;
  outlineWidth?: number;
  dash?: number[];
}

export const DEFAULT_SILHOUETTE_OPTIONS: Required<SilhouetteDrawOptions> = {
  fillColor: "#ffffff",
  fillOpacity: 0.25, // Soft translucent ghost fill (25%)
  outlineColor: "#ffffff",
  outlineOpacity: 0.75, // Crisp dashed outer outline (75%)
  outlineWidth: 1.75,
  dash: [6, 5],
};

function chaikinSmooth(points: Point2D[]): Point2D[] {
  if (points.length < 3) return points;
  const result: Point2D[] = [];
  const len = points.length;

  for (let i = 0; i < len; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % len];

    result.push({
      x: 0.75 * p0.x + 0.25 * p1.x,
      y: 0.75 * p0.y + 0.25 * p1.y,
    });
    result.push({
      x: 0.25 * p0.x + 0.75 * p1.x,
      y: 0.25 * p0.y + 0.75 * p1.y,
    });
  }

  return result;
}

function getPerpUnit(p1: Point2D, p2: Point2D): Point2D {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: -dy / len, y: dx / len };
}

function getUnit(p1: Point2D, p2: Point2D): Point2D {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

/**
 * Builds the SINGLE unified outer human body perimeter contour from reference landmarks.
 * Strictly contains NO internal lines, NO joint circles, and NO skeletal connections.
 */
export function buildOuterContour(
  landmarks: NormalizedLandmark[],
  refWidth: number = 1000,
  refHeight: number = 1000
): ReferenceSilhouette {
  const getLm = (idx: PoseLandmarkIndex): Point2D => ({
    x: landmarks[idx].x,
    y: landmarks[idx].y,
  });

  const isVis = (idx: PoseLandmarkIndex): boolean => {
    const lm = landmarks[idx];
    return !!lm && (lm.visibility === undefined || lm.visibility >= 0.25) && lm.y <= 1.05;
  };

  const lShoulder = getLm(PoseLandmarkIndex.LEFT_SHOULDER);
  const rShoulder = getLm(PoseLandmarkIndex.RIGHT_SHOULDER);
  const lHip = getLm(PoseLandmarkIndex.LEFT_HIP);
  const rHip = getLm(PoseLandmarkIndex.RIGHT_HIP);
  const nose = getLm(PoseLandmarkIndex.NOSE);
  const lEar = getLm(PoseLandmarkIndex.LEFT_EAR);
  const rEar = getLm(PoseLandmarkIndex.RIGHT_EAR);
  const rElbow = getLm(PoseLandmarkIndex.RIGHT_ELBOW);
  const rWrist = getLm(PoseLandmarkIndex.RIGHT_WRIST);
  const lElbow = getLm(PoseLandmarkIndex.LEFT_ELBOW);
  const lWrist = getLm(PoseLandmarkIndex.LEFT_WRIST);

  const torsoLen =
    Math.hypot(lShoulder.x - lHip.x, lShoulder.y - lHip.y) || 0.28;

  const headRadius = Math.max(
    torsoLen * 0.26,
    Math.hypot(lEar.x - rEar.x, lEar.y - rEar.y) * 0.85
  );

  // 1. Head & Neck outer boundary
  const headTop: Point2D = {
    x: (lEar.x + rEar.x + nose.x) / 3,
    y: Math.min(nose.y, lEar.y, rEar.y) - headRadius * 0.95,
  };
  const headRight: Point2D = { x: rEar.x + headRadius * 0.35, y: rEar.y };
  const headLeft: Point2D = { x: lEar.x - headRadius * 0.35, y: lEar.y };

  // 2. Right Arm Perimeter Normals
  const rUpperNorm = getPerpUnit(rShoulder, rElbow);
  const rUpperDist = torsoLen * 0.085;
  const rForeNorm = getPerpUnit(rElbow, rWrist);
  const rForeDist = torsoLen * 0.065;
  const rHandDir = getUnit(rElbow, rWrist);

  const rShoulderOut: Point2D = {
    x: rShoulder.x + rUpperNorm.x * rUpperDist,
    y: rShoulder.y + rUpperNorm.y * rUpperDist - torsoLen * 0.03,
  };
  const rElbowOut: Point2D = {
    x: rElbow.x + rUpperNorm.x * rUpperDist,
    y: rElbow.y + rUpperNorm.y * rUpperDist,
  };
  const rWristOut: Point2D = {
    x: rWrist.x + rForeNorm.x * rForeDist,
    y: rWrist.y + rForeNorm.y * rForeDist,
  };
  const rHandTip: Point2D = {
    x: rWrist.x + rHandDir.x * (torsoLen * 0.08),
    y: rWrist.y + rHandDir.y * (torsoLen * 0.08),
  };
  const rArmpit: Point2D = {
    x: rShoulder.x * 0.65 + rElbow.x * 0.35 - rUpperNorm.x * (torsoLen * 0.04),
    y: rShoulder.y * 0.65 + rElbow.y * 0.35 - rUpperNorm.y * (torsoLen * 0.04),
  };

  // 3. Right Flank & Right Leg
  const rWaist: Point2D = {
    x: rHip.x + torsoLen * 0.08,
    y: (rShoulder.y + rHip.y * 2) / 3,
  };
  const rHipOut: Point2D = {
    x: rHip.x + torsoLen * 0.10,
    y: rHip.y,
  };

  const rightLegVisible = isVis(PoseLandmarkIndex.RIGHT_KNEE);
  const leftLegVisible = isVis(PoseLandmarkIndex.LEFT_KNEE);

  // Construct clock-wise perimeter
  const perimeter: Point2D[] = [
    headTop,
    headRight,
    rShoulderOut,
    rElbowOut,
    rWristOut,
    rHandTip,
    rArmpit,
    rWaist,
    rHipOut,
  ];

  if (rightLegVisible) {
    const rKnee = getLm(PoseLandmarkIndex.RIGHT_KNEE);
    const rThighNorm = getPerpUnit(rHip, rKnee);
    const rThighDist = torsoLen * 0.10;
    const rKneeOut: Point2D = {
      x: rKnee.x + rThighNorm.x * rThighDist,
      y: rKnee.y + rThighNorm.y * rThighDist,
    };
    perimeter.push(rKneeOut);

    if (isVis(PoseLandmarkIndex.RIGHT_ANKLE)) {
      const rAnkle = getLm(PoseLandmarkIndex.RIGHT_ANKLE);
      const rShinNorm = getPerpUnit(rKnee, rAnkle);
      const rShinDist = torsoLen * 0.08;
      const rAnkleOut: Point2D = {
        x: rAnkle.x + rShinNorm.x * rShinDist,
        y: rAnkle.y + rShinNorm.y * rShinDist,
      };
      const rFoot = isVis(PoseLandmarkIndex.RIGHT_FOOT_INDEX)
        ? getLm(PoseLandmarkIndex.RIGHT_FOOT_INDEX)
        : { x: rAnkle.x, y: rAnkle.y + torsoLen * 0.05 };
      perimeter.push(rAnkleOut, rFoot);
    }
  }

  // Pelvis / Groin connection
  const groin: Point2D = {
    x: (lHip.x + rHip.x) / 2,
    y:
      (lHip.y + rHip.y) / 2 +
      (rightLegVisible || leftLegVisible ? torsoLen * 0.10 : torsoLen * 0.04),
  };
  perimeter.push(groin);

  // Left Leg
  if (leftLegVisible) {
    const lKnee = getLm(PoseLandmarkIndex.LEFT_KNEE);
    const lThighNorm = getPerpUnit(lHip, lKnee);
    const lThighDist = torsoLen * 0.10;

    if (isVis(PoseLandmarkIndex.LEFT_ANKLE)) {
      const lAnkle = getLm(PoseLandmarkIndex.LEFT_ANKLE);
      const lShinNorm = getPerpUnit(lKnee, lAnkle);
      const lShinDist = torsoLen * 0.08;
      const lFoot = isVis(PoseLandmarkIndex.LEFT_FOOT_INDEX)
        ? getLm(PoseLandmarkIndex.LEFT_FOOT_INDEX)
        : { x: lAnkle.x, y: lAnkle.y + torsoLen * 0.05 };
      const lAnkleOut: Point2D = {
        x: lAnkle.x - lShinNorm.x * lShinDist,
        y: lAnkle.y - lShinNorm.y * lShinDist,
      };
      perimeter.push(lFoot, lAnkleOut);
    }

    const lKneeOut: Point2D = {
      x: lKnee.x - lThighNorm.x * lThighDist,
      y: lKnee.y - lThighNorm.y * lThighDist,
    };
    perimeter.push(lKneeOut);
  }

  // Left Flank & Left Arm
  const lHipOut: Point2D = {
    x: lHip.x - torsoLen * 0.10,
    y: lHip.y,
  };
  const lWaist: Point2D = {
    x: lHip.x - torsoLen * 0.08,
    y: (lShoulder.y + lHip.y * 2) / 3,
  };

  const lUpperNorm = getPerpUnit(lShoulder, lElbow);
  const lUpperDist = torsoLen * 0.085;
  const lForeNorm = getPerpUnit(lElbow, lWrist);
  const lForeDist = torsoLen * 0.065;
  const lHandDir = getUnit(lElbow, lWrist);

  const lArmpit: Point2D = {
    x: lShoulder.x * 0.65 + lElbow.x * 0.35 + lUpperNorm.x * (torsoLen * 0.04),
    y: lShoulder.y * 0.65 + lElbow.y * 0.35 + lUpperNorm.y * (torsoLen * 0.04),
  };
  const lHandTip: Point2D = {
    x: lWrist.x + lHandDir.x * (torsoLen * 0.08),
    y: lWrist.y + lHandDir.y * (torsoLen * 0.08),
  };
  const lWristOut: Point2D = {
    x: lWrist.x - lForeNorm.x * lForeDist,
    y: lWrist.y - lForeNorm.y * lForeDist,
  };
  const lElbowOut: Point2D = {
    x: lElbow.x - lUpperNorm.x * lUpperDist,
    y: lElbow.y - lUpperNorm.y * lUpperDist,
  };
  const lShoulderOut: Point2D = {
    x: lShoulder.x - lUpperNorm.x * lUpperDist,
    y: lShoulder.y - lUpperNorm.y * lUpperDist - torsoLen * 0.03,
  };

  perimeter.push(
    lHipOut,
    lWaist,
    lArmpit,
    lHandTip,
    lWristOut,
    lElbowOut,
    lShoulderOut,
    headLeft
  );

  // Smooth the closed single-loop perimeter
  const smoothed = chaikinSmooth(chaikinSmooth(chaikinSmooth(perimeter)));

  return {
    contours: [smoothed],
    width: refWidth,
    height: refHeight,
  };
}

export function extractSilhouetteFromMask(
  _maskData: Float32Array | null,
  _maskWidth: number,
  _maskHeight: number,
  rawLandmarks: NormalizedLandmark[],
  refWidth: number = 1000,
  refHeight: number = 1000,
  _threshold: number = 0.4
): ReferenceSilhouette {
  return buildOuterContour(rawLandmarks, refWidth, refHeight);
}

export function buildFallbackSilhouette(
  rawLandmarks: NormalizedLandmark[],
  refWidth: number = 1000,
  refHeight: number = 1000
): ReferenceSilhouette {
  return buildOuterContour(rawLandmarks, refWidth, refHeight);
}

/**
 * Draws the STATIC reference outer body silhouette onto the camera canvas.
 * Renders ONLY the outer perimeter boundary (dashed line) and solid translucent interior fill.
 * Strictly free of skeleton lines, bones, circles, and landmark dots.
 */
export function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  pose: PoseRepresentation,
  viewportWidth: number,
  viewportHeight: number,
  options: SilhouetteDrawOptions = {}
): void {
  const opts = { ...DEFAULT_SILHOUETTE_OPTIONS, ...options };
  const silhouette = pose.silhouette;
  if (!silhouette || silhouette.contours.length === 0) return;

  const refW = silhouette.width > 0 ? silhouette.width : viewportWidth;
  const refH = silhouette.height > 0 ? silhouette.height : viewportHeight;

  // Uniform aspect contain scaling: fits inside viewport without stretching
  const scale = Math.min(viewportWidth / refW, viewportHeight / refH);
  const drawW = refW * scale;
  const drawH = refH * scale;
  const offsetX = (viewportWidth - drawW) / 2;
  const offsetY = (viewportHeight - drawH) / 2;

  ctx.save();
  for (const contour of silhouette.contours) {
    if (contour.length < 3) continue;

    ctx.beginPath();
    for (let i = 0; i < contour.length; i++) {
      const px = offsetX + contour[i].x * drawW;
      const py = offsetY + contour[i].y * drawH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    // 1. Soft translucent ghost interior fill (NO internal lines or shapes)
    ctx.save();
    ctx.fillStyle = opts.fillColor;
    ctx.globalAlpha = opts.fillOpacity;
    ctx.fill();
    ctx.restore();

    // 2. Subtle dashed outer contour stroke along perimeter ONLY
    ctx.save();
    ctx.setLineDash(opts.dash);
    ctx.strokeStyle = opts.outlineColor;
    ctx.lineWidth = opts.outlineWidth;
    ctx.globalAlpha = opts.outlineOpacity;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
