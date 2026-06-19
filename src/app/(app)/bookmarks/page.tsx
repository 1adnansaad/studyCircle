import { getCurrentSession } from "@/lib/session";
import { bookmarksView } from "@/lib/view";
import { Screen, ScrollBody } from "@/components/layout-bits";
import { BackHeader } from "@/components/screen-chrome";
import { PostCard } from "@/components/post-card";
import { MeterChip, Empty } from "@/components/screen-widgets";

export const dynamic = "force-dynamic";

/** My Bookmarks — the bookmark set; the cap chip explains the free-trial limit. */
export default function BookmarksPage() {
  const session = getCurrentSession()!;
  const { posts, count, cap, premium } = bookmarksView(session.id);

  return (
    <Screen>
      <BackHeader title="My Bookmarks" />
      <ScrollBody style={{ padding: "16px 14px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <MeterChip
            premium={premium}
            text={`${count} / ${cap}`}
            title={`Why the ${cap}-bookmark limit?`}
            body={`On the free trial you can save up to ${cap} posts. Subscribe to Shikho Premium for unlimited bookmarks.`}
          />
        </div>
        {posts.length ? posts.map((p) => <PostCard key={p.id} post={p} />) : <Empty title="Bookmarks empty" body="Bookmark a post to save it here." />}
      </ScrollBody>
    </Screen>
  );
}
