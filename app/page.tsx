import Link from "next/link";
import PoseDebugger from "@/app/components/PoseDebugger";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10">
      <div className="mx-auto mb-8 max-w-3xl">
        <h1 className="text-2xl font-semibold text-neutral-100">
          Pose Coach — CV foundation debug
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Milestone 1: upload a reference photo, run MediaPipe Pose Landmarker on it, and
          visualize the detected landmarks. This skeleton overlay is for development only and
          will not appear in the final product.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/scoring" className="text-cyan-400 hover:underline">
            → Milestone 3: pose similarity scoring debug
          </Link>
        </p>
      </div>
      <PoseDebugger />
    </main>
  );
}
