export interface NormalizedPoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseNormalizationInfo {
  originX: number;
  originY: number;
  scale: number;
  referenceMetric: string;
}

export interface JointAngle {
  name: string;
  degrees: number | null;
  visibility: number;
}

export interface ZoneLandmark extends NormalizedPoseLandmark {
  name: string;
}

export interface HeadZone {
  landmarks: ZoneLandmark[];
  angles: JointAngle[];
}

export interface TorsoZone {
  landmarks: ZoneLandmark[];
  angles: JointAngle[];
}

export interface LimbZone {
  landmarks: ZoneLandmark[];
  angles: JointAngle[];
}

export interface ReferenceSilhouette {
  /** Normalized outer contour polylines [0, 1] for smooth dashed outline */
  contours: Array<Array<{ x: number; y: number }>>;
  /** Offscreen canvas containing the soft white person cutout */
  maskCanvas?: HTMLCanvasElement;
  /** Width of the mask / reference */
  width: number;
  /** Height of the mask / reference */
  height: number;
}

export interface PoseRepresentation {
  head: HeadZone;
  torso: TorsoZone;
  leftArm: LimbZone;
  rightArm: LimbZone;
  leftLeg: LimbZone;
  rightLeg: LimbZone;
  normalizedLandmarks: NormalizedPoseLandmark[];
  normalization: PoseNormalizationInfo;
  silhouette?: ReferenceSilhouette;
}
