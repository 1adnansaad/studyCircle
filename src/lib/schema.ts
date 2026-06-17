/**
 * SQLite schema (spec §7). Idempotent — safe to run on every boot.
 *
 * Two layers:
 *   • Seeded "world" tables — never cleared on logout.
 *   • Mutable "user layer" tables — scoped to a session row; logout deletes the
 *     session row and ON DELETE CASCADE wipes the rest. Follower/following
 *     counts are DERIVED (§3), never stored mutably.
 */
export const SCHEMA_SQL = `
-- ── meta ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ══ SEEDED WORLD (never cleared on logout) ═══════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
  id                   TEXT PRIMARY KEY,
  user_tag             TEXT NOT NULL UNIQUE,
  class                INTEGER NOT NULL,
  leaderboard_pos      INTEGER,
  follower_count_seed  INTEGER NOT NULL DEFAULT 0,
  following_count_seed INTEGER NOT NULL DEFAULT 0,
  bio                  TEXT
);

CREATE TABLE IF NOT EXISTS groups (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  subject       TEXT,
  topic         TEXT,
  description   TEXT,
  privacy       TEXT NOT NULL DEFAULT 'Public',
  active_users  INTEGER NOT NULL DEFAULT 0,
  posts_per_day INTEGER NOT NULL DEFAULT 0,
  is_suggested  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  subject        TEXT,
  class          INTEGER,
  duration       TEXT,
  thumbnail_path TEXT,
  course_ref     TEXT
);

CREATE TABLE IF NOT EXISTS posts (
  id                TEXT PRIMARY KEY,
  author_profile_id TEXT NOT NULL REFERENCES profiles(id),
  body              TEXT NOT NULL,
  image_path        TEXT,
  privacy           TEXT NOT NULL DEFAULT 'Public',
  group_id          TEXT REFERENCES groups(id),   -- NULL = main feed
  like_count        INTEGER NOT NULL DEFAULT 0,
  comment_count     INTEGER NOT NULL DEFAULT 0,
  repost_count      INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_group ON posts(group_id);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_profile_id);

CREATE TABLE IF NOT EXISTS post_embeds (
  id             TEXT PRIMARY KEY,
  post_id        TEXT NOT NULL REFERENCES posts(id),
  lesson_id      TEXT REFERENCES lessons(id),
  lesson_title   TEXT NOT NULL,
  subject        TEXT,
  thumbnail_path TEXT,
  course_ref     TEXT
);
CREATE INDEX IF NOT EXISTS idx_embeds_post ON post_embeds(post_id);

CREATE TABLE IF NOT EXISTS comments (
  id                TEXT PRIMARY KEY,
  post_id           TEXT NOT NULL REFERENCES posts(id),
  author_profile_id TEXT NOT NULL REFERENCES profiles(id),
  parent_comment_id TEXT REFERENCES comments(id),
  body              TEXT NOT NULL,
  created_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

-- seed association: which groups show on a profile's "Groups" tab
CREATE TABLE IF NOT EXISTS profile_groups (
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  group_id   TEXT NOT NULL REFERENCES groups(id),
  PRIMARY KEY (profile_id, group_id)
);

-- ══ MUTABLE USER LAYER (cleared on logout) ═══════════════════════════════════

CREATE TABLE IF NOT EXISTS session (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  class      INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookmarks (
  session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  post_id    TEXT NOT NULL REFERENCES posts(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (session_id, post_id)
);

CREATE TABLE IF NOT EXISTS joined_groups (
  session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  group_id   TEXT NOT NULL REFERENCES groups(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (session_id, group_id)
);

CREATE TABLE IF NOT EXISTS follows (
  session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (session_id, profile_id)
);

CREATE TABLE IF NOT EXISTS search_usage (
  session_id    TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  searches_used INTEGER NOT NULL DEFAULT 0,
  week_start    TEXT NOT NULL,
  PRIMARY KEY (session_id, week_start)
);
`;

/** Bump when the schema changes in a non-additive way. */
export const SCHEMA_VERSION = "1";
