"use client";

import { useRouter } from "next/navigation";
import { useApp, Disc } from "./app-shell";
import { ChevronLeft, PlusIcon } from "./icons";

/** Back header with a title (S5/S6/S7/S9/S10). */
export function BackHeader({ title, fallback = "/studycircle" }: { title: string; fallback?: string }) {
  const router = useRouter();
  return (
    <header style={head}>
      <button onClick={() => { if (window.history.length > 1) router.back(); else router.push(fallback); }} style={iconBtn} aria-label="Back">
        <ChevronLeft size={24} />
      </button>
      <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 800, fontSize: 17, color: "var(--ll-on-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
    </header>
  );
}

/** Avatar that opens the sidebar drawer (feed top-left, home top-right). */
export function SidebarTrigger({ small }: { small?: boolean }) {
  const { openSidebar, session } = useApp();
  return (
    <button onClick={openSidebar} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "flex" }} aria-label="Open menu">
      <Disc initials={session.initials} size={small ? 34 : 36} />
    </button>
  );
}

/** Floating compose button → composer (S9). */
export function ComposeFab() {
  const router = useRouter();
  return (
    <button onClick={() => router.push("/composer")} style={fab} aria-label="Compose">
      <PlusIcon size={26} stroke="#fff" strokeWidth={2.4} />
    </button>
  );
}

const head: React.CSSProperties = { display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--ll-surface-container-lowest)", boxShadow: "var(--ll-shadow-sm)", flex: "none" };
const iconBtn: React.CSSProperties = { border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", color: "var(--ll-on-surface)" };
const fab: React.CSSProperties = { position: "absolute", right: 18, bottom: 84, width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer", background: "var(--ll-secondary)", color: "#fff", boxShadow: "var(--ll-shadow-cta)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 };
