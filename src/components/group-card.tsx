"use client";

import { useRouter } from "next/navigation";
import type { GroupCardVM } from "@/lib/view";
import { useApp } from "./app-shell";
import { CheckIcon } from "./icons";

/** Joined group → tap opens the group view (S7). */
export function JoinedGroupRow({ group }: { group: GroupCardVM }) {
  const router = useRouter();
  return (
    <button onClick={() => router.push(`/group/${group.id}`)} style={rowBtn}>
      <span style={badge}>{group.initials}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...nameStyle, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</div>
        <div style={meta}>{group.active} active · {group.perDay} posts/day</div>
      </div>
      <span style={joinedPill}><CheckIcon size={12} />Joined</span>
    </button>
  );
}

/** Suggested group → Join button opens the confirm dialog (cap enforced server-side). */
export function SuggestedGroupCard({ group, joinedCount }: { group: GroupCardVM; joinedCount: number }) {
  const { joinConfirm } = useApp();
  return (
    <div style={{ background: "var(--ll-surface-container-lowest)", borderRadius: "var(--ll-radius-lg)", boxShadow: "var(--ll-shadow-card)", padding: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
        <span style={badge}>{group.initials}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={nameStyle}>{group.name}</div>
          <div style={meta}>{group.topic}</div>
          <div style={{ ...meta, marginTop: 6 }}>{group.active} active · {group.perDay} posts/day</div>
        </div>
      </div>
      <p style={{ margin: "10px 0 12px", fontSize: 13, lineHeight: 1.5, color: "var(--ll-on-surface)" }}>{group.description}</p>
      <button
        onClick={() => joinConfirm({ id: group.id, name: group.name, topic: group.topic, joinedCount })}
        style={{ width: "100%", border: "none", cursor: "pointer", background: "var(--ll-secondary)", color: "#fff", fontWeight: 600, fontSize: 14, padding: 11, borderRadius: 999, boxShadow: "var(--ll-shadow-cta)" }}
      >
        Join group
      </button>
    </div>
  );
}

const rowBtn: React.CSSProperties = { textAlign: "left", border: "none", cursor: "pointer", background: "var(--ll-surface-container-lowest)", borderRadius: "var(--ll-radius-lg)", boxShadow: "var(--ll-shadow-card)", padding: 14, display: "flex", alignItems: "center", gap: 13, width: "100%" };
const badge: React.CSSProperties = { width: 46, height: 46, borderRadius: 13, background: "var(--ll-gradient-deep)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 18 };
const nameStyle: React.CSSProperties = { fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 15, color: "var(--ll-on-surface)" };
const meta: React.CSSProperties = { fontSize: 12, color: "var(--ll-on-surface-variant)", marginTop: 2 };
const joinedPill: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--ll-success)", background: "var(--ll-success-container)", padding: "4px 10px", borderRadius: 999, flex: "none" };
