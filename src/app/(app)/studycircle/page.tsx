import { getCurrentSession } from "@/lib/session";
import { feedView } from "@/lib/view";
import { ScrollBody } from "@/components/layout-bits";
import { PostCard } from "@/components/post-card";

export const dynamic = "force-dynamic";

/** S3 Feed — seeded posts render regardless of follow state (never an empty wall). */
export default function FeedPage() {
  const session = getCurrentSession()!;
  const posts = feedView(session.id);
  return (
    <ScrollBody style={{ padding: "12px 14px 96px", display: "flex", flexDirection: "column", gap: 12 }}>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </ScrollBody>
  );
}
