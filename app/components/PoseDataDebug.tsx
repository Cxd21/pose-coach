"use client";

import type { JointAngle, PoseRepresentation, ZoneLandmark } from "@/lib/pose-processing";

function formatDegrees(angle: JointAngle): string {
  if (angle.degrees === null) return "—";
  return `${angle.degrees.toFixed(1)}°`;
}

function formatCoord(v: number): string {
  return v.toFixed(2);
}

function ZoneCard({
  title,
  landmarks,
  angles,
}: {
  title: string;
  landmarks: ZoneLandmark[];
  angles: JointAngle[];
}) {
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {title}
      </h3>

      {angles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {angles.map((a) => (
            <span key={a.name} title={`confidence: ${Math.round(a.visibility * 100)}%`}>
              <span className="text-neutral-500">{a.name}: </span>
              <span className={a.degrees === null ? "text-neutral-600" : "text-neutral-100"}>
                {formatDegrees(a)}
              </span>
            </span>
          ))}
        </div>
      )}

      <table className="w-full text-xs text-neutral-400">
        <tbody>
          {landmarks.map((lm) => (
            <tr key={lm.name} className="border-t border-neutral-900">
              <td className="py-1 pr-2 text-neutral-500">{lm.name}</td>
              <td className="py-1 pr-2 tabular-nums">x {formatCoord(lm.x)}</td>
              <td className="py-1 pr-2 tabular-nums">y {formatCoord(lm.y)}</td>
              <td className="py-1 tabular-nums">{Math.round(lm.visibility * 100)}% vis</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PoseDataDebug({ representation }: { representation: PoseRepresentation }) {
  const { normalization } = representation;

  return (
    <details className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4" open>
      <summary className="cursor-pointer text-sm font-medium text-neutral-300">
        Normalized pose data (debug)
      </summary>

      <p className="mb-3 mt-2 text-xs text-neutral-500">
        Coordinates are in &ldquo;torso units&rdquo; centered on the hip midpoint (0, 0) — not
        pixels. Scale reference: {normalization.referenceMetric} ={" "}
        {normalization.scale.toFixed(4)} (in the original [0,1] image space).
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ZoneCard title="Head" landmarks={representation.head.landmarks} angles={representation.head.angles} />
        <ZoneCard
          title="Torso"
          landmarks={representation.torso.landmarks}
          angles={representation.torso.angles}
        />
        <ZoneCard
          title="Left arm"
          landmarks={representation.leftArm.landmarks}
          angles={representation.leftArm.angles}
        />
        <ZoneCard
          title="Right arm"
          landmarks={representation.rightArm.landmarks}
          angles={representation.rightArm.angles}
        />
        <ZoneCard
          title="Left leg"
          landmarks={representation.leftLeg.landmarks}
          angles={representation.leftLeg.angles}
        />
        <ZoneCard
          title="Right leg"
          landmarks={representation.rightLeg.landmarks}
          angles={representation.rightLeg.angles}
        />
      </div>
    </details>
  );
}
