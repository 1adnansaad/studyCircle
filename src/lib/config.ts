/**
 * Central env-derived config. Read these EVERYWHERE a limit is enforced,
 * shown in a meter, or printed in copy — so editing .env changes the rule
 * and the UI text together. Never hardcode a cap or a path elsewhere.
 *
 * Server-only module (reads process.env, including secrets). Do not import
 * from a client component.
 */

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  // Database
  dbPath: process.env.DB_PATH?.trim() || "./data/app.db",
  // Optional SQLite file used as the DEFAULT-SEED TEMPLATE on first run. When set
  // and valid, the live DB is initialized by copying this template (then the
  // mutable user layer is cleared). Empty → seed from src/data/seed.json.
  seedDbPath: process.env.SEED_DB_PATH?.trim() || "",

  // Free-trial caps (env-configurable; drive enforcement + meters + copy)
  bookmarkCap: intEnv("BOOKMARK_CAP", 5),
  joinGroupCap: intEnv("JOIN_GROUP_CAP", 2),
  searchWeeklyCap: intEnv("SEARCH_WEEKLY_CAP", 7),
  // Follow is uncapped unless FOLLOW_CAP is set.
  followCap: process.env.FOLLOW_CAP ? intEnv("FOLLOW_CAP", 0) : null,

  // LLM provider (server-side only)
  llmProvider: (process.env.LLM_PROVIDER?.trim().toLowerCase() || "gemini") as
    | "gemini"
    | "anthropic",
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() || "",
  // Current, fast/cheap defaults for a ranking call — override via env.
  geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
  anthropicModel: process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5",

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
  followCap: config.followCap,
} as const;

export type PublicCaps = typeof publicCaps;
