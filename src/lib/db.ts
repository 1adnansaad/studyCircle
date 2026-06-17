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

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  ensureInitialized(db);
  return db;
}

/**
 * First-run init: create the schema (idempotent) and load the seed if the world
 * is empty. Runs once per process when the connection opens. If ./data/app.db
 * is missing, SQLite creates it and this fills it (spec §8).
 */
function ensureInitialized(db: DB): void {
  db.exec(SCHEMA_SQL);
  db.prepare(
    "INSERT INTO meta (key, value) VALUES ('schema_version', ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(SCHEMA_VERSION);

  const seeded =
    (db.prepare("SELECT COUNT(*) AS n FROM profiles").get() as { n: number }).n > 0;
  if (!seeded) {
    seedWorld(db);
    db.prepare(
      "INSERT INTO meta (key, value) VALUES ('seeded_at', ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(new Date().toISOString());
  }

  // Idempotent: fill search_corpus for DBs seeded before it existed.
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
