import { Screen, PinnedHeader } from "@/components/layout-bits";
import { SidebarTrigger, ComposeFab } from "@/components/screen-chrome";
import { FeedTabs } from "@/components/screen-widgets";

/** Shared StudyCircle chrome (avatar → sidebar, title, Feed|Groups tabs, FAB). */
export default function StudyCircleLayout({ children }: { children: React.ReactNode }) {
  return (
    <Screen>
      <PinnedHeader style={{ padding: "14px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <SidebarTrigger small />
          <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 800, fontSize: 18, color: "var(--ll-on-surface)" }}>StudyCircle</span>
          <span style={{ width: 34, flex: "none" }} />
        </div>
        <FeedTabs />
      </PinnedHeader>
      {children}
      <ComposeFab />
    </Screen>
  );
}
