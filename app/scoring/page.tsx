import PoseScoringDebugger from "@/app/components/PoseScoringDebugger";

export default function ScoringDebugPage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10">
      <div className="mx-auto mb-8 max-w-4xl">
        <h1 className="text-2xl font-semibold text-neutral-100">
          Pose Coach — similarity scoring debug
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Milestone 3: upload a reference pose and a comparison pose to see the overall and
          per-zone similarity scores. This is a development/debug interface only.
        </p>
      </div>
      <PoseScoringDebugger />
    </main>
  );
}
