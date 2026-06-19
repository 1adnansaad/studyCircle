"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PostCardVM } from "@/lib/view";
import type { TopicVM } from "@/app/actions";
import { useApp } from "./app-shell";
import { PostCard } from "./post-card";
import { searchAction, summarizeTrendingAction } from "@/app/actions";
import { SparkleIcon, ChevronUp, ChevronRight, LockIcon } from "./icons";
import { DeadButton } from "./screen-widgets";

const MAX = 120;

export function ExploreClient({ trending, used, cap, premium, aiDebug }: { trending: PostCardVM[]; used: number; cap: number; premium?: boolean; aiDebug?: boolean }) {
  const { upsell, chipInfo, toast } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [usedNow, setUsedNow] = useState(used);
  const [results, setResults] = useState<PostCardVM[] | null>(null);
  const [queryLabel, setQueryLabel] = useState("");
  const [pending, start] = useTransition();

  // AI_DEBUG popup: the step log returned by the last AI call.
  const [debugLog, setDebugLog] = useState<{ title: string; lines: string[] } | null>(null);

  // Trending topic summaries (the AI card).
  const [topics, setTopics] = useState<TopicVM[] | null>(null);
  const [topicsFallback, setTopicsFallback] = useState(false);
  const [topicsPending, startTopics] = useTransition();

  function summarize() {
    startTopics(async () => {
      const res = await summarizeTrendingAction();
      if (res.debug) setDebugLog({ title: "Trending topics · AI log", lines: res.debug });
      setTopics(res.topics);
      setTopicsFallback(res.fallback);
      if (!res.topics.length) toast("No trending topics to summarize right now.");
    });
  }

  function openTopic(t: TopicVM) {
    setResults(t.posts);
    setQueryLabel(`Topic · ${t.title}`);
  }

  function submit() {
    const q = text.trim();
    if (!q) return;
    start(async () => {
      const res = await searchAction(q);
      if (res.debug) setDebugLog({ title: "AI search · log", lines: res.debug });
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
              <button onClick={() => chipInfo(premium ? { title: "Premium — no limits", body: "You're on the Premium demo account — AI search is unlimited.", showCta: false } : { title: "Free-trial search limit", body: `On the free trial you get ${cap} AI searches per week. Subscribe for unlimited search.`, showCta: true })} style={meterChip}>{premium ? "Unlimited ✦" : `${usedNow}/${cap} free`}</button>
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

      {/* Trending now — locked promo for free users; AI topic summaries for premium */}
      {!premium ? (
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
      ) : (
        <div style={{ background: "var(--ll-gradient-deep)", borderRadius: "var(--ll-radius-lg)", boxShadow: "var(--ll-shadow-deep)", padding: 18, color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SparkleIcon size={16} stroke="#fff" />
            <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 17 }}>Trending now</span>
          </div>
          <p style={{ margin: "10px 0 12px", fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,.85)" }}>
            {topics === null
              ? "Let Shikho AI read the feed and group what your class is studying into a few trending topics."
              : topicsFallback
              ? "LLM unavailable — showing demo topics. Tap one to see its posts."
              : "Tap a topic to see the posts it summarized."}
          </p>

          {topics === null ? (
            <button onClick={summarize} disabled={topicsPending} style={ctaBtn}>
              <SparkleIcon size={16} stroke="var(--ll-primary)" />
              {topicsPending ? "Summarizing…" : "Summarize trending topics"}
            </button>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {topics.map((t, i) => (
                  <button key={t.title + i} onClick={() => openTopic(t)} style={topicRow}>
                    <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 15, opacity: 0.7 }}>#{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
                      <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.summary || `${t.posts.length} post${t.posts.length === 1 ? "" : "s"}`}</span>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
              <button onClick={summarize} disabled={topicsPending} style={{ ...ctaBtn, background: "rgba(255,255,255,.16)", color: "#fff", marginTop: 12 }}>
                <SparkleIcon size={15} stroke="#fff" />{topicsPending ? "Summarizing…" : "Re-summarize"}
              </button>
            </>
          )}
        </div>
      )}

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

      {/* AI_DEBUG popup — step log of the last AI call (gated by the AI_DEBUG env). */}
      {debugLog && (
        <div onClick={() => setDebugLog(null)} style={dbgOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={dbgCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 15, color: "var(--ll-on-surface)" }}>{debugLog.title}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ll-secondary)", background: "var(--ll-secondary-tint)", padding: "2px 8px", borderRadius: 999 }}>AI_DEBUG</span>
            </div>
            <pre style={dbgPre}>{debugLog.lines.length ? debugLog.lines.join("\n") : "(no log lines)"}</pre>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => { navigator.clipboard?.writeText(debugLog.lines.join("\n")); toast("AI log copied."); }}
                style={{ flex: 1, border: "1px solid var(--ll-outline-variant)", background: "var(--ll-surface-container-low)", color: "var(--ll-on-surface)", borderRadius: 10, padding: "10px 12px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >Copy</button>
              <button
                onClick={() => setDebugLog(null)}
                style={{ flex: 1, border: "none", background: "var(--ll-secondary)", color: "#fff", borderRadius: 10, padding: "10px 12px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const collapsedBar: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", cursor: "pointer", background: "var(--ll-surface-container-lowest)", borderRadius: 999, boxShadow: "var(--ll-shadow-card)", padding: "14px 18px" };
const composerBox: React.CSSProperties = { background: "var(--ll-surface-container-lowest)", borderRadius: "var(--ll-radius-lg)", boxShadow: "var(--ll-shadow-card)", padding: "14px 16px" };
const iconRound: React.CSSProperties = { border: "none", background: "var(--ll-surface-container-high)", color: "var(--ll-on-surface-variant)", width: 32, height: 32, borderRadius: 999, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const meterChip: React.CSSProperties = { border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "5px 10px", borderRadius: 999, background: "var(--ll-secondary-tint)", color: "var(--ll-secondary)" };
const ctaBtn: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", border: "none", cursor: "pointer", background: "#fff", color: "var(--ll-primary)", fontWeight: 700, fontSize: 15, padding: 13, borderRadius: 999 };
const topicRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#fff", borderRadius: 12, padding: "10px 12px" };
const dbgOverlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 60, background: "rgba(25,28,30,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14 };
const dbgCard: React.CSSProperties = { width: "100%", maxWidth: 560, maxHeight: "70vh", display: "flex", flexDirection: "column", background: "var(--ll-surface-container-lowest)", borderRadius: "var(--ll-radius-lg)", boxShadow: "0 -10px 40px rgba(0,0,0,.3)", padding: 16 };
const dbgPre: React.CSSProperties = { flex: 1, overflow: "auto", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, lineHeight: 1.5, color: "var(--ll-on-surface)", background: "var(--ll-surface-container-low)", borderRadius: 10, padding: "10px 12px" };
