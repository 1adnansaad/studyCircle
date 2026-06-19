"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, getCurrentSession, logout } from "@/lib/session";
import {
  addBookmark,
  removeBookmark,
  isBookmarked,
  joinGroup,
  toggleFollow,
  recordSearch,
  searchesUsed,
  isPremium,
  createPost,
  createComment,
  createRepost,
  listSearchCorpus,
  llmTokensUsed,
  addLlmTokens,
  hasTokenBudget,
  type BookmarkResult,
  type JoinResult,
} from "@/lib/repo";
import { config, publicCaps } from "@/lib/config";
import { rankSearch, summarizeTopics } from "@/lib/llm";
import { searchResultsView } from "@/lib/view";
import type { PostCardVM } from "@/lib/view";

function refresh() {
  revalidatePath("/", "layout");
}

function requireSession(): string {
  const s = getCurrentSession();
  if (!s) throw new Error("No active session");
  return s.id;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function loginAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const klass = Number.parseInt(String(formData.get("class") ?? ""), 10);
  const tier = String(formData.get("tier") ?? "free") === "premium" ? "premium" : "free";
  if (!name || !Number.isFinite(klass)) return;
  createSession(name, klass, tier);
  redirect("/home");
}

export async function logoutAction() {
  logout();
  redirect("/");
}

// ── Allowed writes (work + persist) ──────────────────────────────────────────

/** Toggle bookmark: remove if set; otherwise add (returns at_cap if full). */
export async function toggleBookmarkAction(postId: string): Promise<BookmarkResult> {
  const sid = requireSession();
  const res = isBookmarked(sid, postId) ? removeBookmark(sid, postId) : addBookmark(sid, postId);
  refresh();
  return res;
}

export async function removeBookmarkAction(postId: string): Promise<BookmarkResult> {
  const sid = requireSession();
  const res = removeBookmark(sid, postId);
  refresh();
  return res;
}

export async function followAction(profileId: string) {
  const sid = requireSession();
  const res = toggleFollow(sid, profileId);
  refresh();
  return res;
}

export async function joinGroupAction(groupId: string): Promise<JoinResult> {
  const sid = requireSession();
  const res = joinGroup(sid, groupId);
  refresh();
  return res;
}

/**
 * Spec §1 (revised): post / comment / reply / repost / quote are real writes that
 * persist as user-authored content AND share the weekly POST_WEEKLY_CAP budget
 * (monotonic — un-reposting never refunds). The content is scoped to the demo
 * session, so it appears in the feed/threads and is cleared on logout. At the cap
 * the write is blocked → the UI shows the upsell. Like and share stay gated.
 */

type PostEmbedInput = { lessonId: string | null; title: string; subject: string | null } | null;

export type CreatePostResponse =
  | { status: "ok"; postId: string }
  | { status: "at_cap" }
  | { status: "empty" };

export async function createPostAction(input: {
  body: string;
  privacy: string;
  embed?: PostEmbedInput;
}): Promise<CreatePostResponse> {
  const sid = requireSession();
  const body = input.body.trim();
  if (!body && !input.embed) return { status: "empty" };
  const res = createPost(sid, { body, privacy: input.privacy, embed: input.embed ?? null });
  if (!res.ok) return { status: "at_cap" };
  refresh();
  return { status: "ok", postId: res.postId };
}

export type WriteResponse = { status: "ok" } | { status: "at_cap" } | { status: "empty" };

export async function createCommentAction(postId: string, body: string): Promise<WriteResponse> {
  const sid = requireSession();
  const text = body.trim();
  if (!text) return { status: "empty" };
  const res = createComment(sid, postId, text);
  if (!res.ok) return { status: "at_cap" };
  refresh();
  return { status: "ok" };
}

/** Repost (`quote=false`) or quote (`quote=true`) a post → a new referencing feed post. */
export async function repostAction(postId: string): Promise<{ status: "ok"; postId: string } | { status: "at_cap" }> {
  const sid = requireSession();
  const res = createRepost(sid, postId);
  if (!res.ok) return { status: "at_cap" };
  refresh();
  return { status: "ok", postId: res.postId };
}

// ── Trending topic summaries (Explore card, spec §9) ─────────────────────────

export type TopicVM = { title: string; summary: string; posts: PostCardVM[] };
export type TopicsResponse = { status: "ok"; topics: TopicVM[]; fallback: boolean; provider: string };

/**
 * Summarize the trending posts into up to 5 topics via the LLM (server-side).
 * Each topic resolves to the real posts it grouped, so the UI can open them.
 * No key / call failure → deterministic demo topics (`fallback: true`).
 */
export async function summarizeTrendingAction(): Promise<TopicsResponse> {
  const sid = requireSession();
  const candidates = listSearchCorpus(config.llmCandidateRows);
  const res = await summarizeTopics(candidates);
  const topics: TopicVM[] = res.topics
    .map((t) => ({ title: t.title, summary: t.summary, posts: searchResultsView(sid, t.postIds) }))
    .filter((t) => t.posts.length > 0);
  return { status: "ok", topics, fallback: res.fallback, provider: res.provider };
}

export type SearchResponse =
  | { status: "search_cap"; used: number; cap: number }
  | { status: "token_exhausted"; budget: number }
  | { status: "empty" }
  | {
      status: "ok";
      results: PostCardVM[];
      used: number;
      cap: number;
      provider: string;
      model: string;
      fallback: boolean;
      tokensUsed: number;
      tokenBudget: number;
    };

/**
 * Explore search (spec §9): weekly-cap gate → token-budget gate → LLM ranks
 * LLM_CANDIDATE_ROWS candidates from search_corpus → record tokens + the search.
 * LLM runs server-side only.
 */
export async function searchAction(query: string): Promise<SearchResponse> {
  const sid = requireSession();
  const q = query.trim();
  if (!q) return { status: "empty" };

  const premium = isPremium(sid);
  const used = searchesUsed(sid);
  if (!premium && used >= publicCaps.searchWeeklyCap)
    return { status: "search_cap", used, cap: publicCaps.searchWeeklyCap };

  if (!premium && !hasTokenBudget(sid))
    return { status: "token_exhausted", budget: config.llmSessionTokenBudget };

  const candidates = listSearchCorpus(config.llmCandidateRows);
  const ranked = await rankSearch(q, candidates);

  addLlmTokens(sid, ranked.tokensUsed);
  recordSearch(sid); // count the weekly search only once it actually ran

  const results = searchResultsView(sid, ranked.postIds);
  refresh();
  return {
    status: "ok",
    results,
    used: used + 1,
    cap: publicCaps.searchWeeklyCap,
    provider: ranked.provider,
    model: ranked.model,
    fallback: ranked.fallback,
    tokensUsed: llmTokensUsed(sid),
    tokenBudget: config.llmSessionTokenBudget,
  };
}
