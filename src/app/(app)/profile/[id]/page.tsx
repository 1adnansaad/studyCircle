import { notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { profileView } from "@/lib/view";
import { Screen, ScrollBody } from "@/components/layout-bits";
import { BackHeader } from "@/components/screen-chrome";
import { ClassChip, RankChip, PrivacyChip } from "@/components/post-card";
import { FollowButton } from "@/components/follow-button";
import { ProfileTabs } from "@/components/screen-widgets";

export const dynamic = "force-dynamic";

/** S6 Profile (own or any user) — follower/following counts, Follow persists (§3). */
export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getCurrentSession()!;
  const p = profileView(id, session.id);
  if (!p) notFound();

  return (
    <Screen>
      <BackHeader title="Profile" />
      <ScrollBody style={{ padding: "18px 16px 24px" }}>
        <div style={{ background: "var(--ll-surface-container-lowest)", borderRadius: "var(--ll-radius-lg)", boxShadow: "var(--ll-shadow-card)", padding: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 22, color: "var(--ll-primary)" }}>{p.tag}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                <ClassChip label={p.klass} />
                {p.rank && <RankChip label={p.rank} />}
                <PrivacyChip label={p.privacy} />
              </div>
            </div>
            {!p.isOwn && <FollowButton profileId={p.profileId} tag={p.tag} isFollowing={p.isFollowing} />}
          </div>
          <div style={{ display: "flex", gap: 22, marginTop: 16 }}>
            <Stat n={p.followers} label="followers" />
            <Stat n={p.following} label="following" />
          </div>
          {p.isOwn && <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--ll-on-surface-variant)" }}>This is your StudyCircle profile.</p>}
        </div>

        <ProfileTabs posts={p.posts} groups={p.groups} />
      </ScrollBody>
    </Screen>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 18, color: "var(--ll-on-surface)" }}>{n}</span>{" "}
      <span style={{ fontSize: 13, color: "var(--ll-on-surface-variant)" }}>{label}</span>
    </div>
  );
}
