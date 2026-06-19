"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { PostCardVM, CommentVM } from "@/lib/view";
import { useApp } from "./app-shell";
import { toggleBookmarkAction, repostAction } from "@/app/actions";
import {
  CommentIcon, HeartIcon, RepostIcon, QuoteIcon, ShareIcon, BookmarkIcon, PlayIcon,
} from "./icons";

// ── Clickable NameCard chips → explainer dialog ──────────────────────────────

export function ClassChip({ label }: { label: string }) {
  const { chipInfo } = useApp();
  return (
    <Chip bg="var(--ll-primary-fixed)" fg="var(--ll-on-primary-fixed-variant)"
      onClick={() => chipInfo({ title: "Class tag", body: "Shows the student's class. StudyCircle leans on class so you see work relevant to your level." })}>
      {label}
    </Chip>
  );
}
export function RankChip({ label }: { label: string }) {
  const { chipInfo } = useApp();
  return (
    <Chip bg="var(--ll-tertiary-fixed)" fg="var(--ll-on-tertiary-fixed-variant)"
      onClick={() => chipInfo({ title: "Leaderboard rank", body: "Their position on the Shikho leaderboard — earned through quizzes, streaks, and participation." })}>
      {label}
    </Chip>
  );
}
export function PrivacyChip({ label }: { label: string }) {
  const { chipInfo } = useApp();
  const body =
    label === "Public" ? "Anyone on Shikho can see this post."
    : label === "Followers" ? "Only this person's followers can see this post."
    : label === "Only me" ? "Only the author can see this post."
    : "Controls who can see this post.";
  return (
    <Chip bg="var(--ll-surface-container-high)" fg="var(--ll-on-surface-variant)"
      onClick={() => chipInfo({ title: `Post privacy · ${label}`, body })}>
      {label}
    </Chip>
  );
}

function Chip({ children, bg, fg, onClick }: { children: React.ReactNode; bg: string; fg: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap", border: "none", cursor: "pointer", background: bg, color: fg }}>{children}</button>
  );
}

export function NameLink({ tag, profileId }: { tag: string; profileId: string }) {
  const router = useRouter();
  return (
    <button onClick={() => router.push(`/profile/${profileId}`)} style={{ minWidth: 0, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: "none", background: "transparent", padding: 0, cursor: "pointer", fontWeight: 700, fontSize: 14, color: "var(--ll-primary)" }}>{tag}</button>
  );
}

// ── PostCard ─────────────────────────────────────────────────────────────────

export function PostCard({ post }: { post: PostCardVM }) {
  const router = useRouter();
  const { upsell, bookmarkAtCap, toast, caps, postCapUpsell } = useApp();
  const [, startTransition] = useTransition();

  function bookmark() {
    startTransition(async () => {
      const res = await toggleBookmarkAction(post.id);
      if (!res.ok && res.reason === "at_cap") bookmarkAtCap();
      else if (res.ok && res.bookmarked) toast(`Bookmarked. ${res.count} of ${caps.bookmarkCap} free-trial bookmarks used.`);
      else if (res.ok && !res.bookmarked) toast("Removed from bookmarks.");
      router.refresh();
    });
  }

  function repost(quote: boolean) {
    startTransition(async () => {
      const res = await repostAction(post.id);
      if (res.status === "at_cap") postCapUpsell();
      else toast(quote ? "Quoted to your feed." : "Reposted to your feed.");
      router.refresh();
    });
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <NameLink tag={post.tag} profileId={post.authorProfileId} />
        <span style={{ fontSize: 12, color: "var(--ll-on-surface-variant)", flex: "none" }}>{post.time}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>
        <ClassChip label={post.klass} />
        {post.rank && <RankChip label={post.rank} />}
        <PrivacyChip label={post.privacy} />
      </div>

      {post.repostOf && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12, fontWeight: 600, color: "var(--ll-secondary)" }}>
          <RepostIcon size={14} />{post.isOwn ? "You reposted" : "Reposted"} {post.repostOf.tag}
        </div>
      )}

      {post.body && <button onClick={() => router.push(`/post/${post.id}`)} style={bodyBtn}>{post.body}</button>}

      {post.repostOf && (
        <button onClick={() => router.push(`/post/${post.id}`)} style={quoteBox}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ll-primary)" }}>{post.repostOf.tag}</div>
          <div style={{ marginTop: 4, fontSize: 14, lineHeight: 1.5, color: "var(--ll-on-surface)" }}>{post.repostOf.body}</div>
        </button>
      )}

      {post.embed && (
        <button
          onClick={() => router.push(post.embed!.lessonId ? `/lesson/${post.embed!.lessonId}` : `/post/${post.id}`)}
          style={embedBtn}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 15px" }}>
            <span style={embedIcon}><PlayIcon size={22} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.7)" }}>Shikho Lesson</div>
              <div style={{ fontFamily: "var(--ll-font-display)", fontWeight: 600, fontSize: 15, color: "#fff", lineHeight: 1.25, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{post.embed.title}</div>
              {post.embed.subject && <div style={{ fontSize: 12, color: "rgba(255,255,255,.78)", marginTop: 2 }}>{post.embed.subject}</div>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "var(--ll-secondary)", color: "#fff", fontWeight: 600, fontSize: 13, padding: 9 }}>শুরু করো · ৩ দিন ফ্রি</div>
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <Action onClick={() => router.push(`/post/${post.id}`)} label={post.comments}><CommentIcon size={19} /></Action>
        <Action onClick={upsell} label={post.likes}><HeartIcon size={19} /></Action>
        <Action onClick={() => repost(false)} label={post.reposts}><RepostIcon size={19} /></Action>
        <Action onClick={() => repost(true)}><QuoteIcon size={19} /></Action>
        <Action onClick={() => toast("Shareable link copied to clipboard!")}><ShareIcon size={19} /></Action>
        <button onClick={bookmark} style={{ ...actionBtn, color: post.bookmarked ? "var(--ll-secondary)" : "var(--ll-on-surface-variant)" }} aria-label="Bookmark">
          <BookmarkIcon size={19} filled={post.bookmarked} />
        </button>
      </div>
    </div>
  );
}

/** Comment row in the post-detail thread — uses the same NameCard chips. */
export function CommentCard({ comment }: { comment: CommentVM }) {
  return (
    <div style={{ ...card, marginLeft: comment.isReply ? 22 : 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <NameLink tag={comment.tag} profileId={comment.authorProfileId} />
        <span style={{ fontSize: 12, color: "var(--ll-on-surface-variant)", flex: "none" }}>{comment.time}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>
        <ClassChip label={comment.klass} />
        {comment.rank && <RankChip label={comment.rank} />}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.5, color: "var(--ll-on-surface)" }}>{comment.body}</p>
    </div>
  );
}

function Action({ onClick, label, children }: { onClick: () => void; label?: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={actionBtn}>
      {children}
      {label != null && <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>}
    </button>
  );
}

const card: React.CSSProperties = { background: "var(--ll-surface-container-lowest)", borderRadius: "var(--ll-radius-lg)", boxShadow: "var(--ll-shadow-card)", padding: 16, fontFamily: "var(--ll-font-latin)" };
const bodyBtn: React.CSSProperties = { display: "block", width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "12px 0 0", cursor: "pointer", fontFamily: "var(--ll-font-latin)", fontSize: 15, lineHeight: 1.55, color: "var(--ll-on-surface)" };
const quoteBox: React.CSSProperties = { display: "block", width: "100%", textAlign: "left", marginTop: 12, cursor: "pointer", border: "1px solid var(--ll-outline-variant)", background: "var(--ll-surface-container-low)", borderRadius: "var(--ll-radius-md)", padding: "12px 14px", fontFamily: "var(--ll-font-latin)" };
const embedBtn: React.CSSProperties = { display: "block", width: "100%", textAlign: "left", marginTop: 12, border: "none", cursor: "pointer", padding: 0, borderRadius: "var(--ll-radius-lg)", overflow: "hidden", background: "var(--ll-gradient-deep)", boxShadow: "var(--ll-shadow-deep)" };
const embedIcon: React.CSSProperties = { width: 46, height: 46, borderRadius: 12, background: "rgba(255,255,255,.16)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" };
const actionBtn: React.CSSProperties = { display: "flex", alignItems: "center", gap: 5, border: "none", background: "transparent", cursor: "pointer", color: "var(--ll-on-surface-variant)", padding: 0 };
