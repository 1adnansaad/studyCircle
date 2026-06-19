/**
 * View-models for the screens. Server-only. Returns PLAIN serializable objects
 * (no functions) so they can cross into client components. Reads are always
 * free (§1); these never mutate. Numbers are pre-formatted to Bengali numerals.
 */
import {
  listFeedPosts,
  listProfiles,
  listGroups,
  getGroup,
  getProfile,
  getPost,
  getEmbed,
  listComments,
  listPostsByProfile,
  listGroupPosts,
  listProfileGroups,
  listLessons,
  getLesson,
  listBookmarkedPosts,
  listBookmarks,
  listFollows,
  listJoinedGroups,
  bookmarkCount,
  joinedGroupCount,
  followingCount,
  displayedFollowerCount,
  searchesUsed,
  postsUsed,
  type PostRow,
  type GroupRow,
} from "./repo";
import { getCurrentSession } from "./session";
import { publicCaps } from "./config";
import { bn, bnCount, classTag, rankTag, relativeTime, initials, ownTag } from "./format";

export type EmbedVM = { lessonId: string | null; title: string; subject: string | null };

export type PostCardVM = {
  id: string;
  authorProfileId: string;
  tag: string;
  klass: string;
  rank: string | null;
  privacy: string;
  time: string;
  body: string;
  imagePath: string | null;
  embed: EmbedVM | null;
  likes: string;
  comments: string;
  reposts: string;
  bookmarked: boolean;
  groupId: string | null;
};

export type CommentVM = {
  id: string;
  tag: string;
  authorProfileId: string;
  klass: string;
  rank: string | null;
  privacy: string;
  time: string;
  body: string;
  isReply: boolean;
};

export type GroupCardVM = {
  id: string;
  name: string;
  initials: string;
  subject: string | null;
  topic: string | null;
  description: string | null;
  privacy: string;
  active: string;
  perDay: string;
  joined: boolean;
};

function groupInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "");
}

function postToVM(p: PostRow, bookmarks: Set<string>): PostCardVM {
  const author = getProfile(p.author_profile_id);
  const embed = getEmbed(p.id);
  return {
    id: p.id,
    authorProfileId: p.author_profile_id,
    tag: author?.user_tag ?? "@unknown",
    klass: classTag(author?.class ?? 0),
    rank: rankTag(author?.leaderboard_pos ?? null),
    privacy: p.privacy,
    time: relativeTime(p.created_at),
    body: p.body,
    imagePath: p.image_path,
    embed: embed ? { lessonId: embed.lesson_id, title: embed.lesson_title, subject: embed.subject } : null,
    likes: bnCount(p.like_count),
    comments: bnCount(p.comment_count),
    reposts: bnCount(p.repost_count),
    bookmarked: bookmarks.has(p.id),
    groupId: p.group_id,
  };
}

function groupToVM(g: GroupRow, joined: Set<string>): GroupCardVM {
  return {
    id: g.id,
    name: g.name,
    initials: groupInitials(g.name).toUpperCase(),
    subject: g.subject,
    topic: g.topic,
    description: g.description,
    privacy: g.privacy,
    active: bnCount(g.active_users),
    perDay: bn(g.posts_per_day),
    joined: joined.has(g.id),
  };
}

// ── Per-screen builders ──────────────────────────────────────────────────────

export function feedView(sessionId: string): PostCardVM[] {
  const bm = new Set(listBookmarks(sessionId));
  return listFeedPosts().map((p) => postToVM(p, bm));
}

export function postDetailView(postId: string, sessionId: string) {
  const post = getPost(postId);
  if (!post) return null;
  const bm = new Set(listBookmarks(sessionId));
  const comments: CommentVM[] = listComments(postId).map((c) => {
    const a = getProfile(c.author_profile_id);
    return {
      id: c.id,
      tag: a?.user_tag ?? "@unknown",
      authorProfileId: c.author_profile_id,
      klass: classTag(a?.class ?? 0),
      rank: rankTag(a?.leaderboard_pos ?? null),
      privacy: "Public",
      time: relativeTime(c.created_at),
      body: c.body,
      isReply: !!c.parent_comment_id,
    };
  });
  return { post: postToVM(post, bm), comments };
}

export function groupsTabView(sessionId: string) {
  const joined = new Set(listJoinedGroups(sessionId));
  const all = listGroups().map((g) => groupToVM(g, joined));
  return {
    joined: all.filter((g) => g.joined),
    suggested: all.filter((g) => !g.joined),
    joinedCount: joinedGroupCount(sessionId),
    cap: publicCaps.joinGroupCap,
  };
}

export function groupView(groupId: string, sessionId: string) {
  const g = getGroup(groupId);
  if (!g) return null;
  const joined = new Set(listJoinedGroups(sessionId));
  const bm = new Set(listBookmarks(sessionId));
  return {
    group: groupToVM(g, joined),
    posts: listGroupPosts(groupId).map((p) => postToVM(p, bm)),
  };
}

export function profileView(profileIdOrMe: string, sessionId: string) {
  const session = getCurrentSession();
  const isOwn = profileIdOrMe === "me";
  const bm = new Set(listBookmarks(sessionId));

  if (isOwn && session) {
    return {
      isOwn: true,
      profileId: "me",
      tag: ownTag(session.name),
      name: session.name,
      klass: classTag(session.class),
      rank: null as string | null,
      privacy: "Public",
      followers: bnCount(0),
      following: bnCount(followingCount(sessionId)),
      isFollowing: false,
      posts: [] as PostCardVM[],
      groups: listJoinedGroups(sessionId)
        .map((id) => getGroup(id))
        .filter((g): g is GroupRow => !!g)
        .map((g) => groupToVM(g, new Set(listJoinedGroups(sessionId)))),
    };
  }

  const p = getProfile(profileIdOrMe);
  if (!p) return null;
  const following = new Set(listFollows(sessionId));
  const joined = new Set(listJoinedGroups(sessionId));
  return {
    isOwn: false,
    profileId: p.id,
    tag: p.user_tag,
    name: p.user_tag,
    klass: classTag(p.class),
    rank: rankTag(p.leaderboard_pos),
    privacy: "Public",
    followers: bnCount(displayedFollowerCount(p.id, sessionId)),
    following: bnCount(p.following_count_seed),
    isFollowing: following.has(p.id),
    posts: listPostsByProfile(p.id).map((post) => postToVM(post, bm)),
    groups: listProfileGroups(p.id).map((g) => groupToVM(g, joined)),
  };
}

export function bookmarksView(sessionId: string) {
  const bm = new Set(listBookmarks(sessionId));
  return {
    posts: listBookmarkedPosts(sessionId).map((p) => postToVM(p, bm)),
    count: bookmarkCount(sessionId),
    cap: publicCaps.bookmarkCap,
  };
}

/** Map ranked post ids → PostCard view-models, preserving rank order. */
export function searchResultsView(sessionId: string, postIds: string[]): PostCardVM[] {
  const bm = new Set(listBookmarks(sessionId));
  return postIds
    .map((id) => getPost(id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => postToVM(p, bm));
}

export function exploreView(sessionId: string) {
  // Default state shows trending = the most-engaged seeded posts.
  const bm = new Set(listBookmarks(sessionId));
  const trending = [...listFeedPosts()]
    .sort((a, b) => b.like_count + b.repost_count - (a.like_count + a.repost_count))
    .slice(0, 6)
    .map((p) => postToVM(p, bm));
  return {
    trending,
    used: searchesUsed(sessionId),
    cap: publicCaps.searchWeeklyCap,
  };
}

export function lessonView(lessonId: string) {
  const l = getLesson(lessonId);
  if (!l) return null;
  return {
    id: l.id,
    title: l.title,
    subject: l.subject,
    klass: l.class != null ? classTag(l.class) : null,
    duration: l.duration ? bn(l.duration) : null,
    courseRef: l.course_ref,
  };
}

/** Weekly post-budget meter for the composer (post/comment/repost/quote share it). */
export function postMeter(sessionId: string) {
  return { used: postsUsed(sessionId), cap: publicCaps.postWeeklyCap };
}

export function composerLessons() {
  return listLessons().map((l) => ({
    id: l.id,
    title: l.title,
    subject: l.subject,
    klass: l.class != null ? classTag(l.class) : null,
    duration: l.duration ? bn(l.duration) : null,
  }));
}

export type ProfileView = NonNullable<ReturnType<typeof profileView>>;
export type ExploreView = ReturnType<typeof exploreView>;
export type LessonVM = NonNullable<ReturnType<typeof lessonView>>;
export type ComposerLessonVM = ReturnType<typeof composerLessons>[number];
