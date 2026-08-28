import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pose Coach — CV Debug",
  description: "Milestone 1: reference-image pose detection debug tool",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
