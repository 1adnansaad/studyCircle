/**
 * Data access for StudyCircle. Reads from the seeded world; writes to the
 * mutable user layer with server-side cap enforcement (spec §1, §2). Follower
 * and following counts are DERIVED here (§3), never stored mutably.
 *
 * Server-only. The terminal gated writes (comment/reply/like/repost/quote/
 * share/post) are NOT here — they never change state (handled as upsell in the
 * UI, Step 5). The four allowed writes are: bookmark, join, search, follow.
 */
import { getDb } from "./db";
import { config } from "./config";

// ── Reads ────────────────────────────────────────────────────────────────────

export type ProfileRow = {
  id: string;
  user_tag: string;
  class: number;
  leaderboard_pos: number | null;
  follower_count_seed: number;
  following_count_seed: number;
  bio: string | null;
};

export type PostRow = {
  id: string;
  author_profile_id: string;
  body: string;
  image_path: string | null;
  privacy: string;
  group_id: string | null;
  like_count: number;
  comment_count: number;
  repost_count: number;
  created_at: string;
};

export type GroupRow = {
  id: string;
  name: string;
  subject: string | null;
  topic: string | null;
  description: string | null;
  privacy: string;
  active_users: number;
  posts_per_day: number;
  is_suggested: number;
};

export function listProfiles(): ProfileRow[] {
  return getDb()
    .prepare("SELECT * FROM profiles ORDER BY leaderboard_pos")
    .all() as ProfileRow[];
}

export function getProfile(id: string): ProfileRow | undefined {
  return getDb().prepare("SELECT * FROM profiles WHERE id = ?").get(id) as
    | ProfileRow
    | undefined;
}

export function listFeedPosts(): PostRow[] {
  return getDb()
    .prepare("SELECT * FROM posts WHERE group_id IS NULL ORDER BY created_at DESC")
    .all() as PostRow[];
}

export function listGroups(): GroupRow[] {
  return getDb().prepare("SELECT * FROM groups").all() as GroupRow[];
}

export function getGroup(id: string): GroupRow | undefined {
  return getDb().prepare("SELECT * FROM groups WHERE id = ?").get(id) as
    | GroupRow
    | undefined;
}

// ── Derived follower / following counts (§3) ─────────────────────────────────

/** displayed = follower_count_seed + (1 if this session follows the profile). */
export function displayedFollowerCount(profileId: string, sessionId: string | null): number {
  const p = getProfile(profileId);
  if (!p) return 0;
  return p.follower_count_seed + (sessionId && isFollowing(sessionId, profileId) ? 1 : 0);
}

/** For the OWN profile, "following" = size of the follow set (§3). */
export function followingCount(sessionId: string): number {
  return (
    getDb().prepare("SELECT COUNT(*) AS n FROM follows WHERE session_id = ?").get(sessionId) as {
      n: number;
    }
  ).n;
}

// ── Bookmarks (allowed, capped ≤ BOOKMARK_CAP) ───────────────────────────────

export function listBookmarks(sessionId: string): string[] {
  return (
    getDb()
      .prepare("SELECT post_id FROM bookmarks WHERE session_id = ? ORDER BY created_at DESC")
      .all(sessionId) as { post_id: string }[]
  ).map((r) => r.post_id);
}

export function bookmarkCount(sessionId: string): number {
  return (
    getDb().prepare("SELECT COUNT(*) AS n FROM bookmarks WHERE session_id = ?").get(sessionId) as {
      n: number;
    }
  ).n;
}

export function isBookmarked(sessionId: string, postId: string): boolean {
  return !!getDb()
    .prepare("SELECT 1 FROM bookmarks WHERE session_id = ? AND post_id = ?")
    .get(sessionId, postId);
}

export type BookmarkResult =
  | { ok: true; bookmarked: boolean; count: number }
  | { ok: false; reason: "at_cap"; count: number };

/** Add a bookmark; blocks at cap (UI offers the remove-modal, Step 5). */
export function addBookmark(sessionId: string, postId: string): BookmarkResult {
  const db = getDb();
  if (isBookmarked(sessionId, postId)) return { ok: true, bookmarked: true, count: bookmarkCount(sessionId) };
  if (bookmarkCount(sessionId) >= config.bookmarkCap)
    return { ok: false, reason: "at_cap", count: bookmarkCount(sessionId) };
  db.prepare("INSERT INTO bookmarks (session_id, post_id, created_at) VALUES (?, ?, ?)").run(
    sessionId,
    postId,
    new Date().toISOString()
  );
  return { ok: true, bookmarked: true, count: bookmarkCount(sessionId) };
}

export function removeBookmark(sessionId: string, postId: string): BookmarkResult {
  getDb()
    .prepare("DELETE FROM bookmarks WHERE session_id = ? AND post_id = ?")
    .run(sessionId, postId);
  return { ok: true, bookmarked: false, count: bookmarkCount(sessionId) };
}

// ── Joined groups (allowed, capped ≤ JOIN_GROUP_CAP, no leaving) ──────────────

export function listJoinedGroups(sessionId: string): string[] {
  return (
    getDb()
      .prepare("SELECT group_id FROM joined_groups WHERE session_id = ? ORDER BY created_at")
      .all(sessionId) as { group_id: string }[]
  ).map((r) => r.group_id);
}

export function joinedGroupCount(sessionId: string): number {
  return (
    getDb().prepare("SELECT COUNT(*) AS n FROM joined_groups WHERE session_id = ?").get(sessionId) as {
      n: number;
    }
  ).n;
}

export function isJoined(sessionId: string, groupId: string): boolean {
  return !!getDb()
    .prepare("SELECT 1 FROM joined_groups WHERE session_id = ? AND group_id = ?")
    .get(sessionId, groupId);
}

export type JoinResult =
  | { ok: true; count: number }
  | { ok: false; reason: "at_cap" | "already_joined"; count: number };

/** Join a group; no leaving once joined (spec §2). Blocks at cap. */
export function joinGroup(sessionId: string, groupId: string): JoinResult {
  if (isJoined(sessionId, groupId))
    return { ok: false, reason: "already_joined", count: joinedGroupCount(sessionId) };
  if (joinedGroupCount(sessionId) >= config.joinGroupCap)
    return { ok: false, reason: "at_cap", count: joinedGroupCount(sessionId) };
  getDb()
    .prepare("INSERT INTO joined_groups (session_id, group_id, created_at) VALUES (?, ?, ?)")
    .run(sessionId, groupId, new Date().toISOString());
  return { ok: true, count: joinedGroupCount(sessionId) };
}

// ── Follows (allowed, uncapped unless FOLLOW_CAP set) ─────────────────────────

export function listFollows(sessionId: string): string[] {
  return (
    getDb()
      .prepare("SELECT profile_id FROM follows WHERE session_id = ?")
      .all(sessionId) as { profile_id: string }[]
  ).map((r) => r.profile_id);
}

export function isFollowing(sessionId: string, profileId: string): boolean {
  return !!getDb()
    .prepare("SELECT 1 FROM follows WHERE session_id = ? AND profile_id = ?")
    .get(sessionId, profileId);
}

export type FollowResult =
  | { ok: true; following: boolean }
  | { ok: false; reason: "at_cap" };

/** Follow/unfollow; persists and drives the derived follower count (§3). */
export function toggleFollow(sessionId: string, profileId: string): FollowResult {
  const db = getDb();
  if (isFollowing(sessionId, profileId)) {
    db.prepare("DELETE FROM follows WHERE session_id = ? AND profile_id = ?").run(sessionId, profileId);
    return { ok: true, following: false };
  }
  if (config.followCap != null) {
    const n = (db.prepare("SELECT COUNT(*) AS n FROM follows WHERE session_id = ?").get(sessionId) as {
      n: number;
    }).n;
    if (n >= config.followCap) return { ok: false, reason: "at_cap" };
  }
  db.prepare("INSERT INTO follows (session_id, profile_id, created_at) VALUES (?, ?, ?)").run(
    sessionId,
    profileId,
    new Date().toISOString()
  );
  return { ok: true, following: true };
}

// ── Search usage (allowed, capped ≤ SEARCH_WEEKLY_CAP per week) ───────────────

/** ISO date (YYYY-MM-DD) of the Monday starting the current week. */
export function currentWeekStart(d = new Date()): string {
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

export function searchesUsed(sessionId: string): number {
  const week = currentWeekStart();
  const row = getDb()
    .prepare("SELECT searches_used FROM search_usage WHERE session_id = ? AND week_start = ?")
    .get(sessionId, week) as { searches_used: number } | undefined;
  return row?.searches_used ?? 0;
}

export type SearchResult = { ok: true; used: number } | { ok: false; reason: "at_cap"; used: number };

/** Records one search; blocks at the weekly cap (caller checks ok before calling the LLM). */
export function recordSearch(sessionId: string): SearchResult {
  const week = currentWeekStart();
  const used = searchesUsed(sessionId);
  if (used >= config.searchWeeklyCap) return { ok: false, reason: "at_cap", used };
  getDb()
    .prepare(
      `INSERT INTO search_usage (session_id, searches_used, week_start) VALUES (?, 1, ?)
       ON CONFLICT(session_id, week_start) DO UPDATE SET searches_used = searches_used + 1`
    )
    .run(sessionId, week);
  return { ok: true, used: used + 1 };
}
