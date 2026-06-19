/**
 * Env-selectable webfonts. Pure + side-effect free (no process.env here — config.ts
 * reads the env once and passes the names in), so it's importable from the server
 * layout. Builds (1) the Google Fonts stylesheet URL, (2) any local `@font-face`
 * rules, and (3) the CSS-var overrides that point `--ll-font-*` at the chosen faces.
 *
 * Each FONT_* value is one of:
 *   • a Google Fonts family — "Poppins", "Baloo Da 2", or "Poppins:wght@400;700"
 *   • a LOCAL font file under public/ — "/fonts/MyFont.ttf" (.ttf/.otf/.woff/.woff2).
 *     The family name is derived from the filename; weights are synthesized.
 * Bengali falls back to the display face (keep it Bengali-capable).
 */
export type FontInput = { display: string; body: string; bengali: string };

const WEIGHTS = "400;500;600;700;800";
const FONT_EXT = /\.(ttf|otf|woff2|woff)$/i;
const FORMAT: Record<string, string> = { ttf: "truetype", otf: "opentype", woff: "woff", woff2: "woff2" };

type Resolved = { family: string; googleQuery?: string; faceCss?: string };

function resolve(value: string): Resolved {
  const v = value.trim();
  const ext = v.match(FONT_EXT);

  if (ext) {
    // Local file served from public/. Normalise "./public/fonts/x.ttf",
    // "public/fonts/x.ttf", "fonts/x.ttf" → "/fonts/x.ttf".
    const url = ("/" + v.replace(/^\.?\/?(public\/)?/i, "")).replace(/\/{2,}/g, "/");
    const family = (url.split("/").pop() || "font").replace(FONT_EXT, "");
    const faceCss =
      `@font-face{font-family:'${family}';` +
      `src:url('${url}') format('${FORMAT[ext[1].toLowerCase()]}');` +
      `font-display:swap;}`;
    return { family, faceCss };
  }

  // Google Fonts family — bare name or full "Name:wght@…" spec.
  const [namePart, axis] = v.split(":");
  const family = namePart.replace(/\+/g, " ").trim();
  const name = family.replace(/\s+/g, "+");
  return { family, googleQuery: axis ? `${name}:${axis}` : `${name}:wght@${WEIGHTS}` };
}

export function fontFaces(input: FontInput): { href: string | null; faceCss: string; vars: Record<string, string> } {
  const display = resolve(input.display);
  const body = resolve(input.body);
  const bengali = resolve(input.bengali.trim() || input.display);
  const all = [display, body, bengali];

  // One Google stylesheet request for the non-local families (dedupe identical queries).
  const queries = [...new Set(all.map((r) => r.googleQuery).filter((q): q is string => !!q))];
  const href = queries.length
    ? `https://fonts.googleapis.com/css2?${queries.map((q) => `family=${q}`).join("&")}&display=swap`
    : null;

  // @font-face rules for the local files (deduped).
  const faceCss = [...new Set(all.map((r) => r.faceCss).filter((c): c is string => !!c))].join("\n");

  // Override the design tokens. Bengali-/system-safe fallbacks so text never
  // disappears if a chosen font lacks a glyph or fails to load.
  const vars = {
    "--ll-font-display": `'${display.family}', 'Hind Siliguri', system-ui, sans-serif`,
    "--ll-font-bengali": `'${bengali.family}', 'Hind Siliguri', system-ui, sans-serif`,
    "--ll-font-latin": `'${body.family}', system-ui, -apple-system, sans-serif`,
    "--ll-font-body": `'${body.family}', system-ui, -apple-system, sans-serif`,
  };
  return { href, faceCss, vars };
}
