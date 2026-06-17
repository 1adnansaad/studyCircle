/* Server-safe layout primitives (no hooks). Each screen is a flex column that
   fills the phone frame: a pinned header (flex:none) + a scrolling body. */
import type { ReactNode, CSSProperties } from "react";

export function Screen({ children, bg = "var(--ll-surface)" }: { children: ReactNode; bg?: string }) {
  return <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: bg }}>{children}</div>;
}

export function ScrollBody({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="sc-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", ...style }}>
      {children}
    </div>
  );
}

export function PinnedHeader({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <header style={{ flex: "none", background: "var(--ll-surface-container-lowest)", boxShadow: "var(--ll-shadow-sm)", ...style }}>
      {children}
    </header>
  );
}
