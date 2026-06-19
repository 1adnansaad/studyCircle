import type { Metadata, Viewport } from "next";
import { config } from "@/lib/config";
import { fontFaces } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyCircle · Shikho",
  description: "StudyCircle — a social feature demo inside the Shikho app.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Env-selected fonts: Google families load via <link>, local .ttf/.otf files via
  // an injected @font-face; both point the --ll-font-* tokens at the chosen faces
  // (inline on <html> overrides tokens.css :root).
  const { href, faceCss, vars } = fontFaces({
    display: config.fontDisplay,
    body: config.fontBody,
    bengali: config.fontBengali,
  });
  return (
    <html lang="en" style={vars as React.CSSProperties}>
      <body>
        {href && <link rel="preconnect" href="https://fonts.googleapis.com" />}
        {href && <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />}
        {href && <link rel="stylesheet" href={href} />}
        {faceCss && <style dangerouslySetInnerHTML={{ __html: faceCss }} />}
        {children}
      </body>
    </html>
  );
}
