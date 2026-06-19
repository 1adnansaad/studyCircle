import { getCurrentSession } from "@/lib/session";
import { groupsTabView } from "@/lib/view";
import { ScrollBody } from "@/components/layout-bits";
import { JoinedGroupRow, SuggestedGroupCard } from "@/components/group-card";
import { MeterChip, Empty } from "@/components/screen-widgets";

export const dynamic = "force-dynamic";

/** S4 Groups — your groups (empty until joined) + suggested; join capped server-side. */
export default function GroupsPage() {
  const session = getCurrentSession()!;
  const { joined, suggested, joinedCount, cap, premium } = groupsTabView(session.id);

  return (
    <ScrollBody style={{ padding: "16px 14px 96px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 15, color: "var(--ll-on-surface)" }}>Your groups</span>
          <MeterChip
            premium={premium}
            text={`${joinedCount} of ${cap}`}
            title="Free-trial group limit"
            body={`On the free trial you can join up to ${cap} study groups, and you can't leave a group once joined. Subscribe to join unlimited groups.`}
          />
        </div>
        {joined.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {joined.map((g) => <JoinedGroupRow key={g.id} group={g} />)}
          </div>
        ) : (
          <Empty title="Groups empty" body="Join a group below to study together." />
        )}
      </div>

      <div>
        <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 15, color: "var(--ll-on-surface)", display: "block", marginBottom: 10 }}>Suggested for you</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {suggested.map((g) => <SuggestedGroupCard key={g.id} group={g} joinedCount={joinedCount} />)}
        </div>
      </div>
    </ScrollBody>
  );
}
