import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { classTag } from "@/lib/format";
import { Screen, ScrollBody } from "@/components/layout-bits";
import { SidebarTrigger } from "@/components/screen-chrome";
import { DeadButton } from "@/components/screen-widgets";
import { SparkleIcon, PlayIcon, UsersIcon, ChevronRight } from "@/components/icons";

export const dynamic = "force-dynamic";

/** S2 Home — a Shikho home replica. Toggle (in nav) → StudyCircle. */
export default function HomePage() {
  const session = getCurrentSession()!;
  const cls = classTag(session.class);

  return (
    <Screen>
      <ScrollBody style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ background: "var(--ll-wash-lavender)" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 6px", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--ll-gradient-deep)" }} />
            <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 800, fontSize: 18, color: "var(--ll-primary)" }}>Shikho</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <DeadButton style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 999, background: "var(--ll-gradient-deep)", color: "#fff", fontWeight: 600, fontSize: 13 }}><SparkleIcon size={15} />AI</DeadButton>
            <span style={{ display: "inline-flex", alignItems: "center", padding: "5px 12px", borderRadius: 999, border: "1.5px solid var(--ll-outline-variant)", fontSize: 12, fontWeight: 600, color: "var(--ll-on-surface)" }}>{cls}</span>
            <SidebarTrigger />
          </div>
        </header>
      </div>

      <div style={{ padding: "8px 16px 96px", display: "flex", flexDirection: "column", gap: 22 }}>
        {/* Free-trial hero */}
        <div style={{ background: "var(--ll-wash-lavender)", margin: "-8px -16px 0", padding: "14px 16px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: "0 0 4px", fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 28, lineHeight: 1.15, color: "var(--ll-on-surface)" }}>৩ দিন সব ফ্রি!</h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--ll-on-surface-variant)" }}>ফ্রি ট্রায়ালে তুমি যা যা পাচ্ছ —</p>
            </div>
            <div style={{ fontSize: 46, lineHeight: 1, flex: "none" }}>🎁</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            <Perk bg="var(--ll-primary-fixed)" fg="var(--ll-on-primary-fixed-variant)" label="লাইভ ক্লাস" />
            <Perk bg="var(--ll-secondary-tint)" fg="var(--ll-secondary)" label="অ্যানিমেটেড লেসন ও রেকর্ডেড ক্লাস" />
            <Perk bg="var(--ll-success-container)" fg="var(--ll-on-success-container)" label="লাইভ ও প্র্যাকটিস MCQ টেস্ট" />
            <Perk bg="var(--ll-tertiary-fixed)" fg="var(--ll-on-tertiary-fixed-variant)" label="স্মার্ট নোট ও প্র্যাকটিস বই" />
          </div>
        </div>

        {/* Continue learning */}
        <DeadButton style={{ background: "var(--ll-surface-container-lowest)", borderRadius: "var(--ll-radius-lg)", boxShadow: "var(--ll-shadow-card)", padding: 14, display: "flex", gap: 12, cursor: "pointer", textAlign: "left", border: "none", width: "100%" }}>
          <div style={{ width: 60, height: 60, borderRadius: 14, background: "var(--ll-gradient-deep)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 22 }}>{session.class}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "var(--ll-on-surface-variant)" }}>শেখা চালিয়ে যাও</div>
            <div style={{ fontFamily: "var(--ll-font-display)", fontWeight: 600, fontSize: 15, color: "var(--ll-on-surface)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>পদার্থবিজ্ঞান — অধ্যায় ৩: নিউটনের সূত্র</div>
            <div style={{ marginTop: 9, height: 8, borderRadius: 999, background: "var(--ll-surface-container-high)", overflow: "hidden" }}><div style={{ width: "64%", height: "100%", background: "var(--ll-gradient-progress)" }} /></div>
          </div>
        </DeadButton>

        {/* Recommended courses */}
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 18, color: "var(--ll-on-surface)" }}>তোমার জন্য কোর্স</span>
          </div>
          <div className="sc-scroll" style={{ display: "flex", gap: 14, overflowX: "auto", margin: "0 -16px", padding: "0 16px 6px" }}>
            <CourseCard title={`${cls} — SSC '২৮ সায়েন্স`} original="২৪,০০০" effective="১৮,৬০০" />
            <CourseCard title="HSC কেমিস্ট্রি — MCQ ব্যাচ" original="৮,০০০" effective="৫,৫০০" />
          </div>
        </div>

        {/* StudyCircle entry */}
        <Link href="/studycircle" style={{ textDecoration: "none", border: "none", cursor: "pointer", background: "var(--ll-surface-container-lowest)", borderRadius: "var(--ll-radius-lg)", boxShadow: "var(--ll-shadow-card)", padding: 16, display: "flex", alignItems: "center", gap: 13 }}>
          <span style={{ width: 46, height: 46, borderRadius: 13, background: "var(--ll-secondary-tint)", color: "var(--ll-secondary)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><UsersIcon size={24} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 16, color: "var(--ll-on-surface)" }}>StudyCircle is live</div>
            <div style={{ fontSize: 13, color: "var(--ll-on-surface-variant)", marginTop: 2 }}>See what your class is posting — join in.</div>
          </div>
          <span style={{ color: "var(--ll-on-surface-variant)", flex: "none", display: "flex" }}><ChevronRight size={20} /></span>
        </Link>

        {/* Jump back in */}
        <div>
          <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 18, color: "var(--ll-on-surface)", display: "block", marginBottom: 12 }}>আবার শুরু করো</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SubjectChip bg="var(--ll-primary-fixed)" fg="var(--ll-on-primary-fixed-variant)" label="পদার্থবিজ্ঞান" />
            <SubjectChip bg="var(--ll-secondary-tint)" fg="var(--ll-secondary)" label="রসায়ন" />
            <SubjectChip bg="var(--ll-success-container)" fg="var(--ll-on-success-container)" label="গণিত" />
            <SubjectChip bg="var(--ll-tertiary-fixed)" fg="var(--ll-on-tertiary-fixed-variant)" label="জীববিজ্ঞান" />
          </div>
        </div>
      </div>
      </ScrollBody>
    </Screen>
  );
}

function Perk({ bg, fg, label }: { bg: string; fg: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ width: 34, height: 34, borderRadius: 9, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><PlayIcon size={18} /></span>
      <span style={{ fontSize: 15, color: "var(--ll-on-surface)", fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function CourseCard({ title, original, effective }: { title: string; original: string; effective: string }) {
  return (
    <div style={{ width: 280, flex: "none", background: "var(--ll-surface-container-lowest)", borderRadius: "var(--ll-radius-lg)", boxShadow: "var(--ll-shadow-card)", overflow: "hidden" }}>
      <div style={{ height: 120, background: "var(--ll-gradient-deep)", position: "relative" }}>
        <span style={{ position: "absolute", top: 10, left: 10, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "var(--ll-secondary-tint)", color: "var(--ll-secondary)" }}>৩১৭ দিন বাকি</span>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 15, color: "var(--ll-on-surface)" }}>{title}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "8px 0 12px" }}>
          <span style={{ textDecoration: "line-through", color: "var(--ll-on-surface-variant)", fontSize: 13 }}>৳{original}</span>
          <span style={{ color: "var(--ll-success)", fontWeight: 700, fontSize: 17 }}>৳{effective}</span>
        </div>
        <DeadButton style={{ width: "100%", border: "none", cursor: "pointer", background: "var(--ll-secondary)", color: "#fff", fontWeight: 600, fontSize: 14, padding: 11, borderRadius: 999 }}></DeadButton>
      </div>
    </div>
  );
}

function SubjectChip({ bg, fg, label }: { bg: string; fg: string; label: string }) {
  return <DeadButton style={{ border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "7px 14px", borderRadius: 999, background: bg, color: fg }}>{label}</DeadButton>;
}
