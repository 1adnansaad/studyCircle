/**
 * SQLite connection (better-sqlite3). Server-only.
 *
 * One shared connection per process, cached across hot-reloads via globalThis
 * so `next dev` doesn't open a new handle on every change. The DB file lives at
 * DB_PATH (default ./data/app.db) so a future `docker compose` can mount it.
 *
 * Schema creation + seeding land in Step 2; this module just owns the handle.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";
import { seedWorld, backfillSearchCorpus } from "./seed";

type DB = Database.Database;

const globalForDb = globalThis as unknown as { __studycircleDb?: DB };

function openDb(): DB {
  const dbPath = path.resolve(process.cwd(), config.dbPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const fromTemplate = maybeCopyTemplate(dbPath);

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  ensureInitialized(db, fromTemplate);
  return db;
}

/**
 * First-run only: if SEED_DB_PATH points to a valid SQLite file and the live DB
 * doesn't exist yet, copy the template as the starting DB (its tables become the
 * default-seeded world). Returns true if it copied. Invalid/missing template →
 * false (caller falls back to seed.json). Copies the -wal sidecar too so an
 * un-checkpointed template isn't truncated.
 */
function maybeCopyTemplate(dbPath: string): boolean {
  if (fs.existsSync(dbPath)) return false; // not first run
  const raw = config.seedDbPath;
  if (!raw) return false;
  const tpl = path.resolve(process.cwd(), raw);
  if (!fs.existsSync(tpl)) {
    console.warn(`[db] SEED_DB_PATH not found: ${tpl} — falling back to seed.json`);
    return false;
  }
  try {
    const probe = new Database(tpl, { readonly: true });
    probe.prepare("SELECT 1").get();
    probe.close();
  } catch {
    console.warn(`[db] SEED_DB_PATH is not a valid SQLite DB: ${tpl} — falling back to seed.json`);
    return false;
  }
  fs.copyFileSync(tpl, dbPath);
  if (fs.existsSync(`${tpl}-wal`)) fs.copyFileSync(`${tpl}-wal`, `${dbPath}-wal`);
  console.log(`[db] initialized from seed template: ${path.relative(process.cwd(), tpl)}`);
  return true;
}

/**
 * First-run init: create the schema (idempotent) and populate the world. Runs
 * once per process when the connection opens.
 *  - fromTemplate: the DB was copied from SEED_DB_PATH — its world is kept, and
 *    the mutable user layer is cleared so the demo starts on a clean session.
 *  - otherwise: if the world is empty, load src/data/seed.json (spec §8).
 */
function ensureInitialized(db: DB, fromTemplate: boolean): void {
  db.exec(SCHEMA_SQL);
  const setMeta = db.prepare(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  setMeta.run("schema_version", SCHEMA_VERSION);

  if (fromTemplate) {
    // Template supplies the seeded world; never inherit its mutable user layer.
    db.prepare("DELETE FROM session").run(); // ON DELETE CASCADE clears the rest
    setMeta.run("seeded_from", "template");
  }

  const seeded =
    (db.prepare("SELECT COUNT(*) AS n FROM profiles").get() as { n: number }).n > 0;
  if (!seeded) {
    seedWorld(db);
    setMeta.run("seeded_from", "seed.json");
    setMeta.run("seeded_at", new Date().toISOString());
  }

  // Idempotent: fill search_corpus for worlds (template or seed) that lack it.
  backfillSearchCorpus(db);
}

export function getDb(): DB {
  if (!globalForDb.__studycircleDb) {
    globalForDb.__studycircleDb = openDb();
  }
  return globalForDb.__studycircleDb;
}

/** Absolute path of the live DB file (for diagnostics). */
export function dbFilePath(): string {
  return path.resolve(process.cwd(), config.dbPath);
}
