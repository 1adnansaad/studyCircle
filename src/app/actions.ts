"use server";

import { revalidatePath } from "next/cache";
import { createSession, getCurrentSession, logout } from "@/lib/session";
import {
  addBookmark,
  removeBookmark,
  joinGroup,
  toggleFollow,
} from "@/lib/repo";

export async function loginAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const klass = Number.parseInt(String(formData.get("class") ?? ""), 10);
  if (!name || !Number.isFinite(klass)) return;
  createSession(name, klass);
  revalidatePath("/");
}

export async function logoutAction() {
  logout();
  revalidatePath("/");
}

function requireSession(): string {
  const s = getCurrentSession();
  if (!s) throw new Error("No active session");
  return s.id;
}

export async function bookmarkAction(formData: FormData) {
  const sid = requireSession();
  const postId = String(formData.get("postId") ?? "");
  const remove = String(formData.get("remove") ?? "") === "1";
  if (remove) removeBookmark(sid, postId);
  else addBookmark(sid, postId);
  revalidatePath("/");
}

export async function followAction(formData: FormData) {
  const sid = requireSession();
  toggleFollow(sid, String(formData.get("profileId") ?? ""));
  revalidatePath("/");
}

export async function joinGroupAction(formData: FormData) {
  const sid = requireSession();
  joinGroup(sid, String(formData.get("groupId") ?? ""));
  revalidatePath("/");
}
