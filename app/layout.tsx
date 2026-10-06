import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pose Coach — CV Debug",
  description: "Milestone 1: reference-image pose detection debug tool",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      {/*
        suppressHydrationWarning: some browser extensions (e.g. Grammarly)
        inject data-gr-* attributes into <body> before React hydrates.
        That's a real DOM difference, but it's caused by the extension, not
        by our render output, so it isn't a bug to fix here — this only
        silences the warning for this one element.
      */}
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
