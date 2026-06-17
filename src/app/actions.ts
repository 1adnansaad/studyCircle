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
  type BookmarkResult,
  type JoinResult,
} from "@/lib/repo";

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
  if (!name || !Number.isFinite(klass)) return;
  createSession(name, klass);
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

/** Records a search against the weekly cap (LLM call lands in Step 6). */
export async function recordSearchAction() {
  const sid = requireSession();
  const res = recordSearch(sid);
  refresh();
  return res;
}
