/**
 * Loads the committed seed source (src/data/seed.json) into the seeded "world"
 * tables. Runs once on first init (when profiles is empty). Idempotent at the
 * call site — `ensureInitialized` only calls this when the world is empty.
 *
 * created_at is computed from `hours_ago` at seed time so the feed has a real
 * chronological order; the UI renders relative time + Bengali numerals.
 */
import type Database from "better-sqlite3";
import seed from "../data/seed.json";

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

/**
 * Idempotent migration: populate search_corpus from existing posts when it's
 * empty (e.g. a DB seeded before search_corpus existed). Derives rows from the
 * live tables so it works regardless of how the world was seeded. No-op once
 * the corpus has rows; never touches the mutable user layer.
 */
export function backfillSearchCorpus(db: Database.Database): void {
  const empty = (db.prepare("SELECT COUNT(*) AS n FROM search_corpus").get() as { n: number }).n === 0;
  const hasPosts = (db.prepare("SELECT COUNT(*) AS n FROM posts").get() as { n: number }).n > 0;
  if (!empty || !hasPosts) return;

  const rows = db
    .prepare(
      `SELECT p.id AS post_id, p.body, p.created_at, pr.user_tag, pr.class,
              e.lesson_title, e.subject
       FROM posts p
       JOIN profiles pr ON pr.id = p.author_profile_id
       LEFT JOIN post_embeds e ON e.post_id = p.id`
    )
    .all() as {
    post_id: string; body: string; created_at: string;
    user_tag: string; class: number | null; lesson_title: string | null; subject: string | null;
  }[];

  const insert = db.prepare(
    `INSERT INTO search_corpus (id, post_id, user_tag, class, subject, search_text, created_at)
     VALUES (@id, @post_id, @user_tag, @class, @subject, @search_text, @created_at)`
  );
  const tx = db.transaction(() => {
    for (const r of rows) {
      insert.run({
        id: `sc_${r.post_id}`,
        post_id: r.post_id,
        user_tag: r.user_tag,
        class: r.class,
        subject: r.subject,
        search_text: r.lesson_title ? `${r.body}\n[lesson] ${r.lesson_title}` : r.body,
        created_at: r.created_at,
      });
    }
  });
  tx();
}

export function seedWorld(db: Database.Database): void {
  const insertProfile = db.prepare(
    `INSERT INTO profiles (id, user_tag, class, leaderboard_pos, follower_count_seed, following_count_seed, bio)
     VALUES (@id, @user_tag, @class, @leaderboard_pos, @follower_count_seed, @following_count_seed, @bio)`
  );
  const insertGroup = db.prepare(
    `INSERT INTO groups (id, name, subject, topic, description, privacy, active_users, posts_per_day, is_suggested)
     VALUES (@id, @name, @subject, @topic, @description, @privacy, @active_users, @posts_per_day, @is_suggested)`
  );
  const insertLesson = db.prepare(
    `INSERT INTO lessons (id, title, subject, class, duration, thumbnail_path, course_ref)
     VALUES (@id, @title, @subject, @class, @duration, @thumbnail_path, @course_ref)`
  );
  const insertPost = db.prepare(
    `INSERT INTO posts (id, author_profile_id, body, image_path, privacy, group_id, like_count, comment_count, repost_count, created_at)
     VALUES (@id, @author, @body, NULL, @privacy, @group_id, @like_count, @comment_count, @repost_count, @created_at)`
  );
  const insertEmbed = db.prepare(
    `INSERT INTO post_embeds (id, post_id, lesson_id, lesson_title, subject, thumbnail_path, course_ref)
     VALUES (@id, @post_id, @lesson_id, @lesson_title, @subject, NULL, @course_ref)`
  );
  const insertComment = db.prepare(
    `INSERT INTO comments (id, post_id, author_profile_id, parent_comment_id, body, created_at)
     VALUES (@id, @post_id, @author, @parent, @body, @created_at)`
  );
  const insertProfileGroup = db.prepare(
    `INSERT INTO profile_groups (profile_id, group_id) VALUES (@profile_id, @group_id)`
  );
  const insertCorpus = db.prepare(
    `INSERT INTO search_corpus (id, post_id, user_tag, class, subject, search_text, created_at)
     VALUES (@id, @post_id, @user_tag, @class, @subject, @search_text, @created_at)`
  );
  const profileById = new Map(seed.profiles.map((p) => [p.id, p]));

  const tx = db.transaction(() => {
    for (const p of seed.profiles) insertProfile.run({ ...p, bio: p.bio ?? null });
    for (const g of seed.groups) insertGroup.run(g);
    for (const l of seed.lessons) insertLesson.run({ ...l, thumbnail_path: l.thumbnail_path ?? null });

    for (const post of seed.posts) {
      const created_at = hoursAgoIso(post.hours_ago);
      insertPost.run({
        id: post.id,
        author: post.author,
        body: post.body,
        privacy: post.privacy,
        group_id: post.group_id ?? null,
        like_count: post.like_count,
        comment_count: post.comment_count,
        repost_count: post.repost_count,
        created_at,
      });
      if (post.embed) {
        insertEmbed.run({
          id: `emb_${post.id}`,
          post_id: post.id,
          lesson_id: post.embed.lesson_id ?? null,
          lesson_title: post.embed.lesson_title,
          subject: post.embed.subject ?? null,
          course_ref: post.embed.course_ref ?? null,
        });
      }

      // Denormalized search candidate row for this post.
      const author = profileById.get(post.author);
      insertCorpus.run({
        id: `sc_${post.id}`,
        post_id: post.id,
        user_tag: author?.user_tag ?? "@unknown",
        class: author?.class ?? null,
        subject: post.embed?.subject ?? null,
        search_text: post.embed ? `${post.body}\n[lesson] ${post.embed.lesson_title}` : post.body,
        created_at,
      });
    }

    for (const c of seed.comments) {
      insertComment.run({
        id: c.id,
        post_id: c.post_id,
        author: c.author,
        parent: c.parent ?? null,
        body: c.body,
        created_at: hoursAgoIso(c.hours_ago),
      });
    }

    for (const pg of seed.profile_groups) insertProfileGroup.run(pg);
  });

  tx();
}
