import { getCurrentSession } from "@/lib/session";
import { composerLessons } from "@/lib/view";
import { ownTag, classTag } from "@/lib/format";
import { Screen } from "@/components/layout-bits";
import { BackHeader } from "@/components/screen-chrome";
import { Composer } from "@/components/screen-widgets";

export const dynamic = "force-dynamic";

/** S9 Composer — fully clickable; only the terminal Post is gated (→ upsell). */
export default function ComposerPage() {
  const session = getCurrentSession()!;
  return (
    <Screen bg="var(--ll-surface-container-lowest)">
      <BackHeader title="New post" />
      <Composer authorTag={ownTag(session.name)} classTag={classTag(session.class)} lessons={composerLessons()} />
    </Screen>
  );
}
