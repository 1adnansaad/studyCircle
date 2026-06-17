import { notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { postDetailView } from "@/lib/view";
import { Screen, ScrollBody } from "@/components/layout-bits";
import { BackHeader } from "@/components/screen-chrome";
import { PostCard, CommentCard } from "@/components/post-card";
import { ReplyBar } from "@/components/screen-widgets";

export const dynamic = "force-dynamic";

/** S5 Post detail — pinned post + comment thread; reply is gated (→ upsell). */
export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getCurrentSession()!;
  const data = postDetailView(id, session.id);
  if (!data) notFound();

  return (
    <Screen>
      <BackHeader title="Post" />
      <ScrollBody style={{ padding: "12px 14px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <PostCard post={data.post} />
        {data.comments.length > 0 && (
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ll-on-surface-variant)", margin: "4px 2px 0" }}>
            {data.comments.length} replies
          </div>
        )}
        {data.comments.map((c) => (
          <CommentCard key={c.id} comment={c} />
        ))}
      </ScrollBody>
      <ReplyBar />
    </Screen>
  );
}
