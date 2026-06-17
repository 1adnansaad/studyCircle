/**
 * Dev helper: delete the live SQLite files so the next `npm run dev` recreates
 * the schema and reloads the seed (spec §8). Does NOT touch the committed seed
 * source. Honors DB_PATH from .env (falls back to ./data/app.db).
 *
 *   npm run db:reset
 */
import fs from "node:fs";
import path from "node:path";

function readEnvDbPath() {
  try {
    const env = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
    const m = env.match(/^\s*DB_PATH\s*=\s*(.+)\s*$/m);
    if (m) return m[1].trim();
  } catch {
    /* no .env — use default */
  }
  return process.env.DB_PATH || "./data/app.db";
}

const dbPath = path.resolve(process.cwd(), readEnvDbPath());
const targets = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];

let removed = 0;
for (const f of targets) {
  if (fs.existsSync(f)) {
    fs.rmSync(f);
    removed++;
    console.log(`  removed ${path.relative(process.cwd(), f)}`);
  }
}

console.log(
  removed
    ? `\nDeleted ${removed} file(s). Run \`npm run dev\` to recreate + reseed.`
    : "Nothing to delete — DB already absent. `npm run dev` will create + seed it."
);
