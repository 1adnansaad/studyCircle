import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { exploreView } from "@/lib/view";
import { Screen, PinnedHeader, ScrollBody } from "@/components/layout-bits";
import { PostCard } from "@/components/post-card";
import { ExploreSearch } from "@/components/screen-widgets";
import { DeadButton } from "@/components/screen-widgets";
import { LockIcon, ChevronRight } from "@/components/icons";

export const dynamic = "force-dynamic";

/** S8 Explore — AI search (collapsed → composer), trending promo, default trending posts. */
export default function ExplorePage() {
  const session = getCurrentSession()!;
  const { trending, used, cap } = exploreView(session.id);

  return (
    <Screen>
      <PinnedHeader style={{ padding: "16px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 800, fontSize: 22, color: "var(--ll-on-surface)" }}>Explore</span>
          <Link href="/studycircle" style={{ display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none", fontSize: 14, fontWeight: 700, color: "var(--ll-primary)" }}>
            Feed <ChevronRight size={16} />
          </Link>
        </div>
      </PinnedHeader>

      <ScrollBody style={{ padding: "14px 14px 96px", display: "flex", flexDirection: "column", gap: 16 }}>
        <ExploreSearch used={used} cap={cap} />

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

        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ll-on-surface-variant)", margin: "2px 2px 0" }}>Trending posts</div>
        {trending.map((p) => <PostCard key={p.id} post={p} />)}
      </ScrollBody>
    </Screen>
  );
}
