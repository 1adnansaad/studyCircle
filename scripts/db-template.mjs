/**
 * Produce a clean default-seed TEMPLATE from the current DB.
 *
 *   npm run db:template -- [destPath]    (default: ./data/seed-template.db)
 *
 * Uses SQLite's online backup (safe even while `npm run dev` holds the DB), then
 * clears the mutable user layer (session + cascade) and checkpoints WAL so the
 * result is a single-file, world-only template. Point SEED_DB_PATH at it to make
 * it the default data on the next first run.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

function readEnvDbPath() {
  try {
    const env = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
    const m = env.match(/^\s*DB_PATH\s*=\s*(.+)\s*$/m);
    if (m) return m[1].trim();
  } catch {}
  return process.env.DB_PATH || "./data/app.db";
}

const src = path.resolve(process.cwd(), readEnvDbPath());
const dest = path.resolve(process.cwd(), process.argv[2] || "./data/seed-template.db");

if (!fs.existsSync(src)) {
  console.error(`Source DB not found: ${src}. Run \`npm run dev\` once to create it.`);
  process.exit(1);
}

const src_db = new Database(src, { readonly: true });
await src_db.backup(dest); // consistent snapshot, concurrency-safe
src_db.close();

// Strip the mutable user layer and collapse WAL into the main file.
const t = new Database(dest);
t.pragma("foreign_keys = ON");
t.prepare("DELETE FROM session").run(); // cascade clears bookmarks/follows/etc.
t.pragma("wal_checkpoint(TRUNCATE)");
const n = (s) => t.prepare("SELECT COUNT(*) AS n FROM " + s).get().n;
const counts = `profiles=${n("profiles")} posts=${n("posts")} groups=${n("groups")} search_corpus=${n("search_corpus")}`;
t.close();
fs.rmSync(`${dest}-wal`, { force: true });
fs.rmSync(`${dest}-shm`, { force: true });

console.log(`Wrote template → ${path.relative(process.cwd(), dest)} (${counts})`);
console.log(`Set SEED_DB_PATH=${path.relative(process.cwd(), dest)} in .env, then \`npm run db:reset\` + \`npm run dev\` to load it.`);
