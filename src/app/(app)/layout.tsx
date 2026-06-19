import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { publicCaps } from "@/lib/config";
import { bookmarksView } from "@/lib/view";
import { initials, ownTag, classTag } from "@/lib/format";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");

  const bm = bookmarksView(session.id);

  return (
    <AppShell
      session={{
        name: session.name,
        klass: session.class,
        classTag: classTag(session.class),
        tag: ownTag(session.name),
        initials: initials(session.name),
        premium: session.tier === "premium",
      }}
      caps={{
        bookmarkCap: publicCaps.bookmarkCap,
        joinGroupCap: publicCaps.joinGroupCap,
        searchWeeklyCap: publicCaps.searchWeeklyCap,
        postWeeklyCap: publicCaps.postWeeklyCap,
      }}
      bookmarks={bm.posts.map((p) => ({ id: p.id, tag: p.tag, body: p.body }))}
    >
      {children}
    </AppShell>
  );
}
