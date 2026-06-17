"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import type { PostCardVM, GroupCardVM } from "@/lib/view";
import { useApp } from "./app-shell";
import { PostCard } from "./post-card";
import { SparkleIcon, ImageIcon, InfoIcon, PlayIcon } from "./icons";

// ── Generic dead/out-of-scope button ─────────────────────────────────────────
export function DeadButton({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const { deadEnd } = useApp();
  return <button onClick={deadEnd} style={style}>{children}</button>;
}

// ── Upsell trigger (the subscribe funnel → C9–C12 courses) ────────────────────
export function UpsellButton({ children, style, title, body }: { children: React.ReactNode; style?: React.CSSProperties; title?: string; body?: string }) {
  const { upsell } = useApp();
  return <button onClick={() => upsell({ title, body })} style={style}>{children}</button>;
}

// ── Feed | Groups tabs (route-based) ──────────────────────────────────────────
export function FeedTabs() {
  const router = useRouter();
  const path = usePathname();
  const onGroups = path.startsWith("/studycircle/groups");
  return (
    <div style={{ display: "flex", gap: 26 }}>
      <Tab active={!onGroups} onClick={() => router.push("/studycircle")}>Feed</Tab>
      <Tab active={onGroups} onClick={() => router.push("/studycircle/groups")}>Groups</Tab>
    </div>
  );
}
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "0 0 10px", fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 15, color: active ? "var(--ll-on-surface)" : "var(--ll-on-surface-variant)", borderBottom: `3px solid ${active ? "var(--ll-secondary)" : "transparent"}` }}>{children}</button>
  );
}

// ── Group meter chip (Groups tab + bookmarks) ─────────────────────────────────
export function MeterChip({ text, title, body }: { text: string; title: string; body: string }) {
  const { chipInfo } = useApp();
  return (
    <button onClick={() => chipInfo({ title, body, showCta: true })} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "var(--ll-secondary-tint)", color: "var(--ll-secondary)" }}>
      <InfoIcon size={12} />{text}
    </button>
  );
}

// ── Profile tabs (Posts | Groups) ─────────────────────────────────────────────
export function ProfileTabs({ posts, groups }: { posts: PostCardVM[]; groups: GroupCardVM[] }) {
  const [tab, setTab] = useState<"posts" | "groups">("posts");
  const router = useRouter();
  return (
    <>
      <div style={{ display: "flex", gap: 26, margin: "18px 2px 14px" }}>
        <Tab active={tab === "posts"} onClick={() => setTab("posts")}>Posts</Tab>
        <Tab active={tab === "groups"} onClick={() => setTab("groups")}>Groups</Tab>
      </div>
      {tab === "posts" ? (
        posts.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
        ) : <Empty title="No posts yet" body="When they post, it'll show up here." />
      ) : groups.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groups.map((g) => (
            <button key={g.id} onClick={() => router.push(`/group/${g.id}`)} style={miniRow}>
              <span style={miniBadge}>{g.initials}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 14, color: "var(--ll-on-surface)" }}>{g.name}</div>
                <div style={{ fontSize: 12, color: "var(--ll-on-surface-variant)" }}>{g.topic}</div>
              </div>
            </button>
          ))}
        </div>
      ) : <Empty title="No groups yet" body="Groups this student joins will appear here." />}
    </>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: "26px 18px", textAlign: "center", borderRadius: "var(--ll-radius-lg)", background: "var(--ll-surface-container-low)" }}>
      <div style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 15, color: "var(--ll-on-surface)" }}>{title}</div>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ll-on-surface-variant)" }}>{body}</p>
    </div>
  );
}

// ── Gated reply bar (post detail) ─────────────────────────────────────────────
export function ReplyBar() {
  const { upsell } = useApp();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--ll-surface-container-lowest)", boxShadow: "0 -2px 16px rgba(25,28,30,.06)", flex: "none" }}>
      <button onClick={() => upsell()} style={{ flex: 1, textAlign: "left", border: "none", background: "var(--ll-surface-container-low)", color: "var(--ll-on-surface-variant)", borderRadius: 999, padding: "12px 16px", fontSize: 14, cursor: "pointer" }}>Write a reply…</button>
      <button onClick={() => upsell()} style={{ border: "none", background: "var(--ll-secondary)", color: "#fff", borderRadius: 999, padding: "10px 18px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Reply</button>
    </div>
  );
}

// ── Group compose button (group view) → upsell ────────────────────────────────
export function GroupComposeButton() {
  const { upsell } = useApp();
  return (
    <button onClick={() => upsell({ title: "Posting in groups is a subscriber feature", body: "Subscribe to post inside study groups." })} style={{ position: "absolute", right: 18, bottom: 22, display: "flex", alignItems: "center", gap: 8, border: "none", cursor: "pointer", background: "var(--ll-secondary)", color: "#fff", boxShadow: "var(--ll-shadow-cta)", padding: "14px 20px", borderRadius: 999, fontWeight: 600, fontSize: 15, zIndex: 20 }}>
      <SparkleIcon size={18} />Post in group
    </button>
  );
}

// (Explore AI search now lives in explore-client.tsx — it owns search state + results.)

// ── Composer (S9) ─────────────────────────────────────────────────────────────
const PRIVACY = ["Public", "Followers", "Only me"] as const;
export function Composer({ authorTag, classTag, lessons }: { authorTag: string; classTag: string; lessons: { id: string; title: string; subject: string | null; klass: string | null; duration: string | null }[] }) {
  const { upsell, deadEnd } = useApp();
  const [text, setText] = useState("");
  const [privacy, setPrivacy] = useState<(typeof PRIVACY)[number]>("Public");
  const [embed, setEmbed] = useState<{ title: string; subject: string | null } | null>(null);
  const [picker, setPicker] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 16px 0", display: "flex", flexDirection: "column" }} className="sc-scroll">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ll-primary)" }}>{authorTag}</div>
          <button onClick={() => setPrivacy(PRIVACY[(PRIVACY.indexOf(privacy) + 1) % PRIVACY.length])} style={{ border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "var(--ll-surface-container-high)", color: "var(--ll-on-surface-variant)" }}>{privacy} ▾</button>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: "var(--ll-primary-fixed)", color: "var(--ll-on-primary-fixed-variant)" }}>{classTag}</span>
        </div>
        <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Share something with your class…" style={{ flex: 1, marginTop: 12, border: "none", outline: "none", resize: "none", background: "transparent", fontSize: 16, lineHeight: 1.55, color: "var(--ll-on-surface)", fontFamily: "var(--ll-font-latin)", minHeight: 120 }} />
        {embed && (
          <div style={{ borderRadius: "var(--ll-radius-lg)", overflow: "hidden", background: "var(--ll-gradient-deep)", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(255,255,255,.16)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><PlayIcon size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--ll-font-display)", fontWeight: 600, fontSize: 14, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{embed.title}</div>
                {embed.subject && <div style={{ fontSize: 12, color: "rgba(255,255,255,.78)" }}>{embed.subject}</div>}
              </div>
              <button onClick={() => setEmbed(null)} style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: "none", borderTop: "1px solid var(--ll-surface-container-high)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setPicker(true)} style={toolBtn} aria-label="Embed from Shikho"><PlayIcon size={20} stroke="var(--ll-primary)" /></button>
        <button onClick={deadEnd} style={toolBtn} aria-label="Attach image"><ImageIcon size={20} /></button>
        <div style={{ flex: 1 }} />
        <button onClick={() => upsell()} style={{ border: "none", cursor: "pointer", background: "var(--ll-secondary)", color: "#fff", fontWeight: 600, fontSize: 14, padding: "10px 22px", borderRadius: 999, boxShadow: "var(--ll-shadow-cta)" }}>Post</button>
      </div>

      {picker && (
        <>
          <div onClick={() => setPicker(false)} style={{ position: "absolute", inset: 0, background: "rgba(25,28,30,.45)", zIndex: 32 }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 33, background: "var(--ll-surface-container-lowest)", borderRadius: "24px 24px 0 0", padding: "18px 18px 24px", maxHeight: "78%", overflowY: "auto" }} className="sc-scroll">
            <h3 style={{ margin: "0 0 12px", fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 18 }}>Embed from Shikho</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lessons.map((l) => (
                <button key={l.id} onClick={() => { setEmbed({ title: l.title, subject: l.subject }); setPicker(false); }} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", border: "none", cursor: "pointer", background: "var(--ll-surface-container-low)", borderRadius: 12, padding: "10px 12px" }}>
                  <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--ll-gradient-deep)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><PlayIcon size={18} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ll-on-surface)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.title}</div>
                    <div style={{ fontSize: 12, color: "var(--ll-on-surface-variant)" }}>{l.subject} · {l.klass} · {l.duration}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const miniRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, textAlign: "left", border: "none", cursor: "pointer", background: "var(--ll-surface-container-lowest)", borderRadius: "var(--ll-radius-lg)", boxShadow: "var(--ll-shadow-card)", padding: 12, width: "100%" };
const miniBadge: React.CSSProperties = { width: 40, height: 40, borderRadius: 11, background: "var(--ll-gradient-deep)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 15 };
const toolBtn: React.CSSProperties = { border: "none", background: "transparent", cursor: "pointer", color: "var(--ll-on-surface-variant)", display: "flex", padding: 6 };
