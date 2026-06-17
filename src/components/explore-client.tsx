"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PostCardVM } from "@/lib/view";
import { useApp } from "./app-shell";
import { PostCard } from "./post-card";
import { searchAction } from "@/app/actions";
import { SparkleIcon, ChevronUp, LockIcon } from "./icons";
import { DeadButton } from "./screen-widgets";

const MAX = 120;

export function ExploreClient({ trending, used, cap }: { trending: PostCardVM[]; used: number; cap: number }) {
  const { upsell, chipInfo, toast } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [usedNow, setUsedNow] = useState(used);
  const [results, setResults] = useState<PostCardVM[] | null>(null);
  const [queryLabel, setQueryLabel] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    const q = text.trim();
    if (!q) return;
    start(async () => {
      const res = await searchAction(q);
      if (res.status === "search_cap") {
        upsell({ title: `You've used all ${res.cap} of your weekly searches`, body: "Subscribe for unlimited AI search across StudyCircle." });
        return;
      }
      if (res.status === "token_exhausted") {
        toast("AI tokens exhausted for this demo session. Log out to reset.");
        return;
      }
      if (res.status === "empty") return;
      setResults(res.results);
      setQueryLabel(q);
      setUsedNow(res.used);
      setText("");
      setOpen(false);
      toast(
        `${res.results.length ? res.results.length : "No"} result${res.results.length === 1 ? "" : "s"} · ${res.used} of ${res.cap} weekly searches used${res.fallback ? " · keyword fallback" : ` · ${res.provider}`}`
      );
      router.refresh();
    });
  }

  return (
    <>
      {/* AI search bar / composer */}
      {!open ? (
        <button onClick={() => setOpen(true)} style={collapsedBar}>
          <SparkleIcon size={18} stroke="var(--ll-primary)" />
          <span style={{ flex: 1, textAlign: "left", color: "var(--ll-on-surface-variant)", fontSize: 14 }}>Ask StudyCircle anything…</span>
        </button>
      ) : (
        <div style={composerBox}>
          <textarea
            autoFocus value={text} maxLength={MAX}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. best posts on Newton's laws for SSC"
            style={{ width: "100%", border: "none", outline: "none", resize: "none", background: "transparent", fontSize: 15, lineHeight: 1.5, color: "var(--ll-on-surface)", fontFamily: "var(--ll-font-latin)", minHeight: 64 }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setOpen(false)} aria-label="Collapse" style={iconRound}><ChevronUp size={18} /></button>
              <button onClick={() => chipInfo({ title: "Free-trial search limit", body: `On the free trial you get ${cap} AI searches per week. Subscribe for unlimited search.`, showCta: true })} style={meterChip}>{usedNow}/{cap} free</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: text.length >= MAX ? "var(--ll-error)" : "var(--ll-on-surface-variant)" }}>{text.length} / {MAX}</span>
              <button onClick={submit} disabled={pending} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer", background: "var(--ll-gradient-deep)", color: "#fff", fontWeight: 600, fontSize: 13, padding: "9px 14px", borderRadius: 999, opacity: pending ? 0.7 : 1 }}>
                <SparkleIcon size={15} />{pending ? "Searching…" : "Ask Shikho AI"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trending promo (premium, locked) */}
      <div style={{ background: "var(--ll-gradient-deep)", borderRadius: "var(--ll-radius-lg)", boxShadow: "var(--ll-shadow-deep)", padding: 18, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", background: "rgba(255,255,255,.18)", padding: "4px 10px", borderRadius: 999 }}>Premium</span>
          <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 17 }}>Trending now</span>
        </div>
        <p style={{ margin: "10px 0 12px", fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,.85)" }}>See what every class is studying right now — the hottest topics of the last hour, day, and week.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {["তাপগতিবিদ্যা", "জৈব বিক্রিয়া", "ক্যালকুলাস"].map((t, i) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.12)", borderRadius: 12, padding: "10px 12px" }}>
              <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 15, opacity: 0.7 }}>#{i + 1}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, filter: "blur(3px)" }}>{t}</span>
              <LockIcon size={16} />
            </div>
          ))}
        </div>
        <DeadButton style={{ width: "100%", marginTop: 14, border: "none", cursor: "pointer", background: "#fff", color: "var(--ll-primary)", fontWeight: 700, fontSize: 15, padding: 13, borderRadius: 999 }}>Unlock trending topics</DeadButton>
      </div>

      {/* Results, or default trending posts */}
      {results !== null ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "2px 2px 0" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ll-on-surface-variant)" }}>Results for “{queryLabel}”</span>
            <button onClick={() => setResults(null)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--ll-primary)" }}>Clear</button>
          </div>
          {results.length ? results.map((p) => <PostCard key={p.id} post={p} />) : (
            <div style={{ padding: "26px 18px", textAlign: "center", borderRadius: "var(--ll-radius-lg)", background: "var(--ll-surface-container-low)" }}>
              <div style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 15 }}>No matches</div>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ll-on-surface-variant)" }}>Try a different query.</p>
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ll-on-surface-variant)", margin: "2px 2px 0" }}>Trending posts</div>
          {trending.map((p) => <PostCard key={p.id} post={p} />)}
        </>
      )}
    </>
  );
}

const collapsedBar: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", cursor: "pointer", background: "var(--ll-surface-container-lowest)", borderRadius: 999, boxShadow: "var(--ll-shadow-card)", padding: "14px 18px" };
const composerBox: React.CSSProperties = { background: "var(--ll-surface-container-lowest)", borderRadius: "var(--ll-radius-lg)", boxShadow: "var(--ll-shadow-card)", padding: "14px 16px" };
const iconRound: React.CSSProperties = { border: "none", background: "var(--ll-surface-container-high)", color: "var(--ll-on-surface-variant)", width: 32, height: 32, borderRadius: 999, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const meterChip: React.CSSProperties = { border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "5px 10px", borderRadius: 999, background: "var(--ll-secondary-tint)", color: "var(--ll-secondary)" };
