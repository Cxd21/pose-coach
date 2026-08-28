"use client";

import { ZONE_LABELS, type ChecklistItem, type ZoneKey } from "@/lib/pose-coaching";

function ZoneIcon({ zoneKey }: { zoneKey: ZoneKey }) {
  if (zoneKey === "leftLeg" || zoneKey === "rightLeg") {
    return (
      <svg
        className="h-4 w-4 text-pink-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 3h4l2 9-3 8h-4l1-7-1-10z" />
        <circle cx="11" cy="12" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (zoneKey === "leftArm" || zoneKey === "rightArm") {
    return (
      <svg
        className="h-4 w-4 text-pink-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 6c2-1 6-1 8 2l4 7-3 4-4-6-3 1z" />
        <circle cx="15" cy="11" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (zoneKey === "torso") {
    return (
      <svg
        className="h-4 w-4 text-pink-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 11l4-5h8l4 5-2 9H6l-2-9z" />
        <path d="M9 6v3a3 3 0 0 0 6 0V6" />
      </svg>
    );
  }

  // Head
  return (
    <svg
      className="h-4 w-4 text-pink-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="10" r="6" />
      <path d="M12 16v5" />
      <path d="M9 21h6" />
    </svg>
  );
}

export default function BodyPartChecklist({ items }: { items: ChecklistItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 pointer-events-none select-none">
      {/* Title with cute curved arrow */}
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-xs font-semibold text-neutral-600">Focus on</span>
        <svg
          className="h-3.5 w-3.5 text-pink-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 8c4-4 12-4 15 3m0 0l-3-1m3 1l-1 4" />
        </svg>
      </div>

      {/* Dynamic item cards (icon + name only) */}
      <div className="flex flex-col gap-1.5">
        {items.map((item) => {
          const isCompleting = item.status === "completing";
          const isLeaving = item.status === "leaving";

          return (
            <div
              key={item.key}
              className={`relative flex items-center gap-2.5 rounded-2xl bg-white/85 px-3 py-2 shadow-sm backdrop-blur-md border border-white/60 transition-all duration-300 ${
                isLeaving
                  ? "-translate-x-6 opacity-0 scale-95"
                  : isCompleting
                  ? "bg-white/95 scale-102"
                  : "translate-x-0 opacity-100 scale-100"
              }`}
            >
              {/* Body part icon */}
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-pink-50">
                <ZoneIcon zoneKey={item.key} />
              </div>

              {/* Body part name with horizontal dotted strike-through when completing */}
              <div className="relative pr-2">
                <span
                  className={`text-xs font-semibold transition-colors duration-200 ${
                    isCompleting || isLeaving ? "text-neutral-400" : "text-neutral-700"
                  }`}
                >
                  {ZONE_LABELS[item.key]}
                </span>

                {/* Horizontal dotted strike-through line */}
                {isCompleting && (
                  <div className="absolute left-0 top-1/2 w-full -translate-y-1/2 border-b-2 border-dotted border-pink-400 animate-strike-through" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination / Incomplete Indicator Dots */}
      <div className="flex items-center gap-1.5 px-2 pt-0.5">
        {[0, 1, 2].map((idx) => (
          <div
            key={idx}
            className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
              idx < items.length ? "bg-pink-400 scale-100" : "bg-pink-200/50 scale-75"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
