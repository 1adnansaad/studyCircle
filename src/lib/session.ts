/**
 * Session model (spec §3). Single active demo session, persisted in SQLite, so
 * it survives a server restart AND a browser close — reopening restores the
 * user exactly where they were. No cookie needed: the "current session" is the
 * single row in `session`.
 *
 * Logout is the only reset: deleting the session row cascades (ON DELETE
 * CASCADE) to bookmarks / joined_groups / follows / search_usage. The seeded
 * world is untouched, so derived follower counts revert to seed automatically.
 */
import { randomUUID } from "node:crypto";
import { getDb } from "./db";

export type Tier = "free" | "premium";

export type Session = {
  id: string;
  name: string;
  class: number;
  tier: Tier;
  createdAt: string;
};

type SessionRow = { id: string; name: string; class: number; tier: string; created_at: string };

function toSession(row: SessionRow): Session {
  return { id: row.id, name: row.name, class: row.class, tier: row.tier === "premium" ? "premium" : "free", createdAt: row.created_at };
}

/** The single active session, or null if logged out. */
export function getCurrentSession(): Session | null {
  const row = getDb()
    .prepare("SELECT id, name, class, tier, created_at FROM session LIMIT 1")
    .get() as SessionRow | undefined;
  return row ? toSession(row) : null;
}

/**
 * Create the demo session from the login form (Name + Class + tier). Single
 * active session, so any existing session is logged out first (clean slate).
 * `premium` removes every freemium cap (§1); `free` keeps them.
 */
export function createSession(name: string, klass: number, tier: Tier = "free"): Session {
  const db = getDb();
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM session").run(); // cascades away any prior mutable state
    db.prepare(
      "INSERT INTO session (id, name, class, tier, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, name, klass, tier, createdAt);
  });
  tx();

  return { id, name, class: klass, tier, createdAt };
}

/**
 * Logout = the only reset. Clears the mutable layer; the seeded world stays.
 *
 * Most mutable tables clear via `ON DELETE CASCADE` when the session row goes.
 * But user-authored *posts* (session_id set) are referenced by rows whose FK to
 * posts(id) does NOT cascade — `post_embeds`, `comments`, `bookmarks`, and other
 * posts via `repost_of_post_id`. Cascade order is unspecified, so we explicitly
 * remove those dependents (and the user posts) in dependency order first, then
 * delete the session row to cascade-clear the remaining mutable tables.
 */
export function logout(): void {
  const db = getDb();
  const userPosts = "SELECT id FROM posts WHERE session_id IS NOT NULL";
  db.transaction(() => {
    db.prepare(`DELETE FROM post_embeds WHERE post_id IN (${userPosts})`).run();
    db.prepare(`DELETE FROM comments   WHERE post_id IN (${userPosts})`).run();
    db.prepare(`DELETE FROM bookmarks  WHERE post_id IN (${userPosts})`).run();
    // Reposts/quotes reference other posts via repost_of_post_id → drop them first.
    db.prepare(`DELETE FROM posts WHERE session_id IS NOT NULL AND repost_of_post_id IS NOT NULL`).run();
    db.prepare(`DELETE FROM posts WHERE session_id IS NOT NULL`).run();
    db.prepare("DELETE FROM session").run(); // cascade clears the rest of the mutable layer
  })();
}
