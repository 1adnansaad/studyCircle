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
  migrateUserAuthoredContent(db);
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

/**
 * Idempotent migration for DBs created before user-authored content existed:
 * relax `author_profile_id` to nullable and add `session_id` (+ `repost_of_post_id`
 * on posts) so posts/comments can be authored by the demo session and cleared on
 * logout. Detected by the absence of `posts.session_id`. Rebuilds both tables
 * (SQLite can't drop a NOT NULL in place); ids are preserved so child FKs stay
 * valid. No-op on fresh DBs (SCHEMA_SQL already has the new shape).
 */
function migrateUserAuthoredContent(db: DB): void {
  const cols = db.prepare("PRAGMA table_info(posts)").all() as { name: string }[];
  if (cols.some((c) => c.name === "session_id")) return;

  db.pragma("foreign_keys = OFF");
  db.transaction(() => {
    db.exec(`
      CREATE TABLE posts_new (
        id                TEXT PRIMARY KEY,
        author_profile_id TEXT REFERENCES profiles(id),
        body              TEXT NOT NULL,
        image_path        TEXT,
        privacy           TEXT NOT NULL DEFAULT 'Public',
        group_id          TEXT REFERENCES groups(id),
        like_count        INTEGER NOT NULL DEFAULT 0,
        comment_count     INTEGER NOT NULL DEFAULT 0,
        repost_count      INTEGER NOT NULL DEFAULT 0,
        repost_of_post_id TEXT REFERENCES posts(id),
        session_id        TEXT REFERENCES session(id) ON DELETE CASCADE,
        created_at        TEXT NOT NULL
      );
      INSERT INTO posts_new (id, author_profile_id, body, image_path, privacy, group_id,
        like_count, comment_count, repost_count, repost_of_post_id, session_id, created_at)
        SELECT id, author_profile_id, body, image_path, privacy, group_id,
        like_count, comment_count, repost_count, NULL, NULL, created_at FROM posts;
      DROP TABLE posts;
      ALTER TABLE posts_new RENAME TO posts;
      CREATE INDEX IF NOT EXISTS idx_posts_group ON posts(group_id);
      CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_profile_id);

      CREATE TABLE comments_new (
        id                TEXT PRIMARY KEY,
        post_id           TEXT NOT NULL REFERENCES posts(id),
        author_profile_id TEXT REFERENCES profiles(id),
        parent_comment_id TEXT REFERENCES comments(id),
        body              TEXT NOT NULL,
        session_id        TEXT REFERENCES session(id) ON DELETE CASCADE,
        created_at        TEXT NOT NULL
      );
      INSERT INTO comments_new (id, post_id, author_profile_id, parent_comment_id, body, session_id, created_at)
        SELECT id, post_id, author_profile_id, parent_comment_id, body, NULL, created_at FROM comments;
      DROP TABLE comments;
      ALTER TABLE comments_new RENAME TO comments;
      CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
    `);
  })();
  db.pragma("foreign_keys = ON");
  console.log("[db] migrated posts/comments for user-authored content");
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
