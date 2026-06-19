import { notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { lessonView } from "@/lib/view";
import { Screen, ScrollBody } from "@/components/layout-bits";
import { BackHeader } from "@/components/screen-chrome";
import { UpsellButton, DeadButton } from "@/components/screen-widgets";
import { PlayIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

/** S10 Lesson preview — the bridge from any embed toward the paid course. */
export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lesson = lessonView(id);
  if (!lesson) notFound();
  const premium = getCurrentSession()?.tier === "premium";

  return (
    <Screen>
      <BackHeader title="Lesson preview" />
      <ScrollBody style={{ padding: "0 0 24px" }}>
        <div style={{ height: 200, background: "var(--ll-gradient-deep)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <span style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,.2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><PlayIcon size={30} /></span>
          {lesson.duration && <span style={{ position: "absolute", bottom: 12, right: 12, fontSize: 12, fontWeight: 600, color: "#fff", background: "rgba(0,0,0,.4)", padding: "4px 10px", borderRadius: 999 }}>{lesson.duration}</span>}
        </div>

        <div style={{ padding: "20px 18px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {lesson.subject && <Tag>{lesson.subject}</Tag>}
            {lesson.klass && <Tag>{lesson.klass}</Tag>}
          </div>
          <h1 style={{ margin: "0 0 8px", fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 24, lineHeight: 1.25, color: "var(--ll-on-surface)" }}>{lesson.title}</h1>
          <p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.6, color: "var(--ll-on-surface-variant)" }}>
            {premium
              ? "A lesson from the Shikho course library — included with your Premium plan. Animated lessons, notes, and MCQ practice."
              : "A free preview from the Shikho course library. Unlock the full chapter — animated lessons, notes, and MCQ practice — with your 3-day free trial."}
          </p>
          {premium ? (
            <DeadButton style={{ width: "100%", border: "none", cursor: "pointer", background: "var(--ll-secondary)", color: "#fff", fontWeight: 600, fontSize: 16, padding: 15, borderRadius: 999, boxShadow: "var(--ll-shadow-cta)" }}>
              শুরু করো
            </DeadButton>
          ) : (
            <UpsellButton
              title="শুরু করো · ৩ দিন ফ্রি"
              body={`Start this lesson free for 3 days — then keep your full ${lesson.klass ?? ""} course.`.trim()}
              style={{ width: "100%", border: "none", cursor: "pointer", background: "var(--ll-secondary)", color: "#fff", fontWeight: 600, fontSize: 16, padding: 15, borderRadius: 999, boxShadow: "var(--ll-shadow-cta)" }}
            >
              শুরু করো · ৩ দিন ফ্রি
            </UpsellButton>
          )}
        </div>
      </ScrollBody>
    </Screen>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: "var(--ll-primary-fixed)", color: "var(--ll-on-primary-fixed-variant)" }}>{children}</span>;
}
