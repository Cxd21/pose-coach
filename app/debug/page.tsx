import PoseDebugger from "@/app/components/PoseDebugger";

export default function PoseDetectionDebugPage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10">
      <div className="mx-auto mb-8 max-w-3xl">
        <h1 className="text-2xl font-semibold text-neutral-100">
          Pose Coach — pose detection debug
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Upload a reference photo to inspect MediaPipe pose, face, and hand detection.
        </p>
      </div>
      <PoseDebugger />
    </main>
  );
}
