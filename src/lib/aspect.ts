/**
 * App-frame aspect ratio (env `ASPECT_RATIO`).
 *
 * Pure + side-effect free so it's safe to import from BOTH server and client
 * components (no `process.env` reads here — `config.ts` parses the env once and
 * passes the resulting value down). `null` = "device" (full-bleed, the default).
 */
export type Aspect = { w: number; h: number } | null;

/** Parse `ASPECT_RATIO`: "device"/empty → null; "W:H" (e.g. "9:16") → {w,h}; junk → null. */
export function parseAspect(raw?: string): Aspect {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v || v === "device") return null;
  const m = v.match(/^(\d+)\s*:\s*(\d+)$/);
  if (!m) return null;
  const w = Number.parseInt(m[1], 10);
  const h = Number.parseInt(m[2], 10);
  if (!w || !h) return null;
  return { w, h };
}

/**
 * Frame width/height for a given aspect. Device → fill the viewport. Fixed ratio
 * → the largest W:H box that fits the viewport (letterboxed, centered by the shell).
 */
export function frameSize(aspect: Aspect): { width: string; height: string } {
  if (!aspect) return { width: "100%", height: "100dvh" };
  const { w, h } = aspect;
  return {
    width: `min(100vw, calc(100dvh * ${w} / ${h}))`,
    height: `min(100dvh, calc(100vw * ${h} / ${w}))`,
  };
}
