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
