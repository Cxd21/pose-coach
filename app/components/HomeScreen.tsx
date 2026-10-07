"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type CameraMode = "user" | "environment";

function Icon({ name, size = 20 }: { name: "camera" | "check" | "chevron" | "upload"; size?: number }) {
  const shapes = {
    camera: <><path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z" /><circle cx="12" cy="13" r="3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    upload: <><path d="M12 16V4m0 0L7 9m5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">{shapes[name]}</g></svg>;
}

export default function HomeScreen() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>("user");
  const [error, setError] = useState<string | null>(null);

  const chooseImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => setError("Could not read that image. Please choose another photo.");
    reader.readAsDataURL(file);
    event.target.value = "";
    setError(null);
  };

  const continueToCoach = () => {
    if (!image) return;
    try {
      sessionStorage.setItem("pose-coach:reference-image", image);
      sessionStorage.setItem("pose-coach:camera-mode", cameraMode);
      router.push("/live");
    } catch {
      setError("This image is too large to pass to the coaching screen. Try a smaller photo.");
    }
  };

  return (
    <div className="page figma-home">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <main className="shell">
        <header className="app-header">
          <span className="header-spacer" aria-hidden="true" />
          <div className="brand"><span className="pose-mark" aria-hidden="true"><span /><span /><span /></span><span>Pose Coach</span></div>
          <span className="header-spacer" aria-hidden="true" />
        </header>
        <section className="welcome">
          <div className="hero-panel">
            <span className="gold-glint gold-glint-left" aria-hidden="true" />
            <span className="gold-glint gold-glint-right" aria-hidden="true" />
            <h1>Pick a pose.<br /><span>Make it yours.</span></h1>
            <div className="how-it-works" aria-label="Choose a reference, then match the pose">
              <div className="visual-blob visual-blob-one" />
              <div className="visual-blob visual-blob-two" />
              <div className="visual-card reference-visual"><img src="/images/pose-reference.jpg" alt="Pose reference" /><span className="visual-step">1</span></div>
              <div className="visual-connector"><span /><Icon name="chevron" size={16} /></div>
              <div className="visual-card guide-visual"><svg viewBox="0 0 100 120" aria-hidden="true"><circle cx="50" cy="18" r="10" /><path d="M50 34c-7 0-11 4-13 10-2 6-3 11-5 16l-9 14c-2 3-1 7 2 9 3 2 6 0 8-3l7-12c-1 5 0 9 1 12l-6 24c-1 4 1 7 5 7h3c3 0 4-2 5-5l2-18 2 18c1 3 2 5 5 5h3c4 0 6-3 5-7l-6-24c1-3 2-7 1-12l7 12c2 3 5 5 8 3 3-2 4-6 2-9l-9-14c-2-5-3-10-5-16-2-6-6-10-13-10Z" /></svg><span className="visual-step">2</span></div>
              <div className="pose-popover">Ready to pose</div>
            </div>
          </div>
          {image ? (
            <div className="selected-reference">
              <button className="reference-preview" onClick={() => inputRef.current?.click()}>
                {/* The local preview comes from a user-selected image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}<img src={image} alt="Selected pose reference" />
                <span className="upload-copy"><strong>Reference selected</strong><span>Tap to choose a different photo</span></span><span className="change-label">Change</span>
              </button>
              <button className="continue-button" onClick={continueToCoach}>Continue<Icon name="chevron" size={18} /></button>
            </div>
          ) : (
            <button className="upload-card" onClick={() => inputRef.current?.click()}>
              <span className="upload-icon"><Icon name="upload" size={20} /></span>
              <span className="upload-copy"><strong>Upload reference</strong><span>Select a photo to begin your session</span></span>
              <span className="round-arrow"><Icon name="chevron" size={18} /></span>
            </button>
          )}
          <input ref={inputRef} className="sr-only" type="file" accept="image/*" onChange={chooseImage} />
          {error && <p className="home-error" role="alert">{error}</p>}
          <section className="shooting-card" aria-labelledby="shooting-title">
            <div className="shooting-heading"><span className="shooting-icon"><Icon name="camera" size={17} /></span><div><small>SHOOT YOUR WAY</small><strong id="shooting-title">Any camera works</strong></div></div>
            <div className="shooting-modes">
              <button className={`shooting-mode ${cameraMode === "user" ? "selected" : ""}`} onClick={() => setCameraMode("user")} aria-pressed={cameraMode === "user"}>
                <span className="mini-phone selfie-phone" aria-hidden="true"><i className="phone-lens" /><i className="selfie-head" /><i className="selfie-body" /></span><span><strong>Selfie</strong><small>Quick &amp; close</small></span><i className="selection-check"><Icon name="check" size={12} /></i>
              </button>
              <button className={`shooting-mode ${cameraMode === "environment" ? "selected" : ""}`} onClick={() => setCameraMode("environment")} aria-pressed={cameraMode === "environment"}>
                <span className="mini-phone back-phone" aria-hidden="true"><i className="camera-lenses" /><i className="full-body-head" /><i className="full-body-shape" /></span><span><strong>Back camera</strong><small>Full-body shots</small></span><i className="selection-check"><Icon name="check" size={12} /></i>
              </button>
            </div>
            <p className="sr-only" aria-live="polite">{cameraMode === "user" ? "Selfie camera selected" : "Back camera selected"}</p>
            <div className="shooting-footer"><span><Icon name="check" size={12} /></span>Private by default</div>
          </section>
          <nav className="developer-links" aria-label="Developer tools">
            <Link href="/debug">Pose detection debug</Link>
            <Link href="/scoring">Pose scoring debug</Link>
          </nav>
        </section>
      </main>
    </div>
  );
}
