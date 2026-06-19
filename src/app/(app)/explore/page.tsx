import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { config } from "@/lib/config";
import { exploreView } from "@/lib/view";
import { Screen, PinnedHeader, ScrollBody } from "@/components/layout-bits";
import { ExploreClient } from "@/components/explore-client";
import { ChevronRight } from "@/components/icons";

export const dynamic = "force-dynamic";

/** S8 Explore — AI search (server-side LLM ranking), trending promo, trending posts. */
export default function ExplorePage() {
  const session = getCurrentSession()!;
  const { trending, used, cap, premium } = exploreView(session.id);

  return (
    <Screen>
      <PinnedHeader style={{ padding: "16px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 800, fontSize: 22, color: "var(--ll-on-surface)" }}>Explore</span>
          <Link href="/studycircle" style={{ display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none", fontSize: 14, fontWeight: 700, color: "var(--ll-primary)" }}>
            
            <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 800, fontSize: 22, color: "#6366F1" }}>Feed <ChevronRight size={16} /></span>
            
          </Link>
        </div>
      </PinnedHeader>

      <ScrollBody style={{ padding: "14px 14px 96px", display: "flex", flexDirection: "column", gap: 16 }}>
        <ExploreClient trending={trending} used={used} cap={cap} premium={premium} aiDebug={config.aiDebug} />
      </ScrollBody>
    </Screen>
  );
}
