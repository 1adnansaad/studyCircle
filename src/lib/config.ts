/**
 * Central env-derived config. Read these EVERYWHERE a limit is enforced,
 * shown in a meter, or printed in copy — so editing .env changes the rule
 * and the UI text together. Never hardcode a cap or a path elsewhere.
 *
 * Server-only module (reads process.env, including secrets). Do not import
 * from a client component.
 */

import { parseAspect } from "./aspect";

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function boolEnv(name: string, fallback = false): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (v == null || v === "") return fallback;
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

// Vercel's serverless filesystem is read-only except for /tmp (which is also
// ephemeral — wiped on cold starts). Detected via the platform's VERCEL env var
// so the DB defaults land somewhere writable without manual config. Fine for a
// single-session demo: state resets on cold start, which is the documented
// freemium-demo behavior anyway.
const onVercel = !!process.env.VERCEL;

export const config = {
  // App-frame aspect ratio: "device" (default, full-bleed) or "W:H" (e.g. "9:16").
  aspectRatio: parseAspect(process.env.ASPECT_RATIO),

  // Webfonts (loaded from Google Fonts at runtime; override the --ll-font-* tokens).
  // A bare family name ("Poppins") or a full spec ("Poppins:wght@400;700").
  fontDisplay: process.env.FONT_DISPLAY?.trim() || "Baloo Da 2",     // headings + Bengali
  fontBody: process.env.FONT_BODY?.trim() || "Be Vietnam Pro",       // body / Latin text
  fontBengali: process.env.FONT_BENGALI?.trim() || "",               // blank → uses fontDisplay

  // When on, AI search / trending return a step-by-step debug log that the
  // Explore UI shows in a popup (so you can see why an AI call failed). Off by
  // default. Never includes secrets — only "key present/missing", model, status.
  aiDebug: boolEnv("AI_DEBUG", false),

  // Database. On Vercel the live DB must live under /tmp (the only writable path);
  // locally it stays in ./data so Docker can mount it.
  dbPath: process.env.DB_PATH?.trim() || (onVercel ? "/tmp/app.db" : "./data/app.db"),
  // Optional SQLite file used as the DEFAULT-SEED TEMPLATE on first run. When set
  // and valid, the live DB is initialized by copying this template (then the
  // mutable user layer is cleared). Empty → seed from src/data/seed.json. On
  // Vercel it defaults to the committed enhanced world (matching the local .env)
  // so the deployed demo seeds from the same data without manual env config.
  seedDbPath:
    process.env.SEED_DB_PATH?.trim() || (onVercel ? "./data/enhanced-seed.db" : ""),

  // Free-trial caps (env-configurable; drive enforcement + meters + copy)
  bookmarkCap: intEnv("BOOKMARK_CAP", 5),
  joinGroupCap: intEnv("JOIN_GROUP_CAP", 2),
  searchWeeklyCap: intEnv("SEARCH_WEEKLY_CAP", 7),
  // Weekly budget for write-type actions (post + comment/reply + repost + quote);
  // each consumes one, monotonic per week (un-repost/un-quote never refunds).
  postWeeklyCap: intEnv("POST_WEEKLY_CAP", 5),
  // Follow is uncapped unless FOLLOW_CAP is set.
  followCap: process.env.FOLLOW_CAP ? intEnv("FOLLOW_CAP", 0) : null,

  // LLM provider (server-side only)
  llmProvider: (process.env.LLM_PROVIDER?.trim().toLowerCase() || "gemini") as
    | "gemini"
    | "anthropic",
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() || "",
  // Model selection. `LLM_MODEL` is the single knob — when set it picks the model
  // for whichever provider is active. The provider-specific vars are finer-grained
  // overrides; precedence: LLM_MODEL → GEMINI_MODEL/ANTHROPIC_MODEL → default.
  geminiModel: process.env.LLM_MODEL?.trim() || process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
  anthropicModel: process.env.LLM_MODEL?.trim() || process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5",

  // How many rows of search_corpus the LLM receives as candidates per search.
  llmCandidateRows: intEnv("LLM_CANDIDATE_ROWS", 20),
  // Per-demo-session LLM token budget; exceeding it blocks search with a toast.
  llmSessionTokenBudget: intEnv("LLM_SESSION_TOKEN_BUDGET", 20000),
} as const;

/**
 * Caps exposed to the browser/UI (no secrets). Safe to serialize into client
 * components so meters and copy stay in sync with .env.
 */
export const publicCaps = {
  bookmarkCap: config.bookmarkCap,
  joinGroupCap: config.joinGroupCap,
  searchWeeklyCap: config.searchWeeklyCap,
  postWeeklyCap: config.postWeeklyCap,
  followCap: config.followCap,
} as const;

export type PublicCaps = typeof publicCaps;
