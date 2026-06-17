import { notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { groupView } from "@/lib/view";
import { Screen, ScrollBody } from "@/components/layout-bits";
import { BackHeader } from "@/components/screen-chrome";
import { PostCard } from "@/components/post-card";
import { GroupComposeButton, Empty } from "@/components/screen-widgets";

export const dynamic = "force-dynamic";

/** S7 Group view — gradient hero + member posts. Post-in-group is gated (→ upsell). */
export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getCurrentSession()!;
  const data = groupView(id, session.id);
  if (!data) notFound();
  const g = data.group;

  return (
    <Screen>
      <BackHeader title={g.name} />
      <ScrollBody>
        <div style={{ background: "var(--ll-gradient-deep)", color: "#fff", padding: "20px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <span style={{ width: 54, height: 54, borderRadius: 15, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 20 }}>{g.initials}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 19, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)", marginTop: 3 }}>{g.topic}</div>
            </div>
          </div>
          {g.description && <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,.9)" }}>{g.description}</p>}
          <div style={{ display: "flex", gap: 18, marginTop: 14 }}>
            <HeroStat n={g.active} label="active members" />
            <HeroStat n={g.perDay} label="posts / day" />
          </div>
        </div>

        <div style={{ padding: "14px 14px 96px", display: "flex", flexDirection: "column", gap: 12 }}>
          {data.posts.length ? data.posts.map((p) => <PostCard key={p.id} post={p} />) : <Empty title="No posts yet" body="Be the first to post in this group." />}
        </div>
      </ScrollBody>
      <GroupComposeButton />
    </Screen>
  );
}

function HeroStat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 18 }}>{n}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,.75)" }}>{label}</div>
    </div>
  );
}
