"use client";

import { useState } from "react";

/**
 * Login segmented control for the demo account tier. Submits via a hidden
 * `tier` input so the surrounding server-action form stays unchanged.
 * Free = freemium caps apply; Premium = everything uncapped (§1).
 */
export function TierChoice() {
  const [tier, setTier] = useState<"free" | "premium">("free");
  return (
    <div style={{ marginBottom: 24 }}>
      <label style={label}>Account type</label>
      <input type="hidden" name="tier" value={tier} />
      <div style={{ display: "flex", gap: 10 }}>
        <Opt
          active={tier === "free"}
          onClick={() => setTier("free")}
          title="Free trial"
          sub="Limited bookmarks, groups, search & posts"
        />
        <Opt
          active={tier === "premium"}
          onClick={() => setTier("premium")}
          title="Premium ✦"
          sub="No caps — everything unlimited"
        />
      </div>
    </div>
  );
}

function Opt({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        textAlign: "left",
        cursor: "pointer",
        borderRadius: "var(--ll-radius-md)",
        padding: "12px 13px",
        border: `2px solid ${active ? "var(--ll-secondary)" : "transparent"}`,
        background: active ? "var(--ll-secondary-tint)" : "var(--ll-surface-container-low)",
        transition: "border-color .15s ease, background .15s ease",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, color: active ? "var(--ll-secondary)" : "var(--ll-on-surface)" }}>{title}</div>
      <div style={{ marginTop: 3, fontSize: 11, lineHeight: 1.35, color: "var(--ll-on-surface-variant)" }}>{sub}</div>
    </button>
  );
}

const label: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--ll-on-surface)", marginBottom: 6 };
