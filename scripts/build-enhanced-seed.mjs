/**
 * Build the default seed TEMPLATE database (`./data/enhanced-seed.db`) that the
 * app copies on first run when `SEED_DB_PATH` points at it.
 *
 * Sources, applied in order into a fresh SQLite file:
 *   1. the app schema  (extracted from src/lib/schema.ts — single source of truth)
 *   2. lessons         (from src/data/seed.json — the enhanced SQL omits them, and
 *                       they back the composer's "Embed from Shikho" picker)
 *   3. the enhanced world  (src/data/enhanced-seed.sql — 110 profiles, 20 groups,
 *                       234 posts incl. reposts, 551 comments, 66 corpus rows,
 *                       480 group memberships)
 *
 * The output is a single self-contained file (rollback journal, no WAL sidecar)
 * so it can be committed and copied cleanly. Re-run any time the SQL changes:
 *
 *   npm run db:build-seed
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const OUT = path.resolve(root, "data/enhanced-seed.db");
const SQL = path.resolve(root, "src/data/enhanced-seed.sql");
const SCHEMA_TS = path.resolve(root, "src/lib/schema.ts");
const SEED_JSON = path.resolve(root, "src/data/seed.json");

// 1. Pull SCHEMA_SQL out of schema.ts (the `export const SCHEMA_SQL = \`...\`` literal).
const schemaSrc = fs.readFileSync(SCHEMA_TS, "utf8");
const m = schemaSrc.match(/export const SCHEMA_SQL\s*=\s*`([\s\S]*?)`;/);
if (!m) throw new Error("Could not extract SCHEMA_SQL from src/lib/schema.ts");
const SCHEMA_SQL = m[1];

// Fresh output file (drop any stale sidecars too).
for (const f of [OUT, `${OUT}-wal`, `${OUT}-shm`]) fs.rmSync(f, { force: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const db = new Database(OUT); // default rollback journal → single self-contained file
db.exec(SCHEMA_SQL);

// 2. Lessons (kept from the committed JSON seed).
const seed = JSON.parse(fs.readFileSync(SEED_JSON, "utf8"));
const lessons = Array.isArray(seed.lessons) ? seed.lessons : [];
const insLesson = db.prepare(
  `INSERT INTO lessons (id, title, subject, class, duration, thumbnail_path, course_ref)
   VALUES (@id, @title, @subject, @class, @duration, @thumbnail_path, @course_ref)`
);
const insLessons = db.transaction((rows) => {
  for (const l of rows)
    insLesson.run({
      id: l.id,
      title: l.title,
      subject: l.subject ?? null,
      class: l.class ?? null,
      duration: l.duration ?? null,
      thumbnail_path: l.thumbnail_path ?? null,
      course_ref: l.course_ref ?? null,
    });
});
insLessons(lessons);

// 3. The enhanced world (its own PRAGMA foreign_keys=ON + BEGIN/COMMIT).
db.exec(fs.readFileSync(SQL, "utf8"));

// 4. Ensure EVERY seeded post has a search_corpus row (the SQL only ships a
//    stratified subset). Mirrors backfillSearchCorpus() in src/lib/seed.ts so
//    the template is complete on its own — AI search then covers the whole feed.
const missing = db
  .prepare(
    `SELECT p.id AS post_id, p.body, p.created_at, pr.user_tag, pr.class,
            e.lesson_title, e.subject
     FROM posts p
     JOIN profiles pr ON pr.id = p.author_profile_id
     LEFT JOIN post_embeds e ON e.post_id = p.id
     WHERE p.id NOT IN (SELECT post_id FROM search_corpus)`
  )
  .all();
const insCorpus = db.prepare(
  `INSERT INTO search_corpus (id, post_id, user_tag, class, subject, search_text, created_at)
   VALUES (@id, @post_id, @user_tag, @class, @subject, @search_text, @created_at)`
);
db.transaction((rows) => {
  for (const r of rows)
    insCorpus.run({
      id: `sc_${r.post_id}`,
      post_id: r.post_id,
      user_tag: r.user_tag,
      class: r.class,
      subject: r.subject,
      search_text: r.lesson_title ? `${r.body}\n[lesson] ${r.lesson_title}` : r.body,
      created_at: r.created_at,
    });
})(missing);

const count = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
const summary = {
  profiles: count("profiles"),
  groups: count("groups"),
  lessons: count("lessons"),
  posts: count("posts"),
  comments: count("comments"),
  search_corpus: count("search_corpus"),
  profile_groups: count("profile_groups"),
};
db.close();

console.log(`Built ${path.relative(root, OUT)}`);
console.table(summary);
