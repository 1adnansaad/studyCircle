import type { Metadata, Viewport } from "next";
import { config } from "@/lib/config";
import { fontFaces } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyCircle by Shikho",
  description: "StudyCircle — a social feature demo inside the Shikho app.",
  openGraph: {
  title: "StudyCircle by Shikho",          // og:title — overrides metadata.title if set
  description: "StudyCircle — a community layer inside Shikho",   // og:description — overrides metadata.description if set
  url: "vercel.app",   // og:url — canonical page URL
  type: "website",      // og:type — "website" | "article" | "profile" etc.
  siteName: "StudyCircle",   // og:site_name
  images: [             // og:image (array, but most platforms use first)
    {
      url: "https://raw.githubusercontent.com/1adnansaad/storage/main/og.banner.png",   // og:image — must be absolute
      width: 600,          // og:image:width
      height: 315,          // og:image:height
      alt: "Parsing from GitHub. Might produce error...",           // og:image:alt
    },
  ],
  locale: "bn_BD",      // og:locale — optional, e.g. "en_US" or "bn_BD"
},
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
