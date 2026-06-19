import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { config } from "@/lib/config";
import { frameSize } from "@/lib/aspect";
import { loginAction } from "./actions";
import { TierChoice } from "@/components/tier-choice";

export const dynamic = "force-dynamic";

/** S1 Login — captures identity (Name + Class). Brand-new free-trial user. */
export default function LoginPage() {
  if (getCurrentSession()) redirect("/home");

  const aspect = config.aspectRatio;
  return (
    <main style={{ ...shell, ...(aspect ? { background: "#0c0e12", alignItems: "center" } : null) }}>
      <div style={{ ...frame, ...frameSize(aspect), overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 4 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--ll-gradient-deep)" }} />
          <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 800, fontSize: 20, color: "var(--ll-primary)" }}>Shikho</span>
        </div>

        <div style={{ margin: "auto 0", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={card}>
            <span style={pill}>New · StudyCircle</span>
            <h1 style={{ margin: "14px 0 8px", fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 27, lineHeight: 1.2, color: "var(--ll-on-surface)" }}>Welcome 👋</h1>
            <p style={{ margin: "0 0 22px", fontSize: 14, lineHeight: 1.55, color: "var(--ll-on-surface-variant)" }}>
              This is a demo from the perspective of a <b style={{ color: "var(--ll-on-surface)" }}>brand-new user on a free trial</b>. StudyCircle is a new way to learn together inside Shikho.
            </p>

            <form action={loginAction}>
              <label style={label}>Your name</label>
              <input name="name" required placeholder="e.g. Rafi Ahmed" style={input} />
              <label style={label}>Class</label>
              <div style={{ position: "relative", marginBottom: 26 }}>
                <select name="class" defaultValue="9" style={{ ...input, marginBottom: 0, appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}>
                  {[6, 7, 8, 9, 10, 11, 12].map((c) => (
                    <option key={c} value={c}>Class {c}</option>
                  ))}
                </select>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ll-on-surface-variant)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><path d="m6 9 6 6 6-6" /></svg>
              </div>
              <TierChoice />
              <button type="submit" style={cta}>Continue</button>
            </form>
          </div>
          <p style={{ margin: 0, textAlign: "center", fontSize: 12, lineHeight: 1.5, color: "var(--ll-on-surface-variant)" }}>
            Your name, bookmarks, groups, and follows are saved and survive a restart. This demo session resets only when you log out.
          </p>
        </div>
      </div>
    </main>
  );
}

const shell: React.CSSProperties = { minHeight: "100dvh", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: 0 };
const frame: React.CSSProperties = { width: "100%", height: "100dvh", background: "var(--ll-wash-lavender)", borderRadius: 0, padding: "28px 22px", display: "flex", flexDirection: "column", overflow: "hidden" };
const card: React.CSSProperties = { background: "var(--ll-surface-container-lowest)", borderRadius: "var(--ll-radius-lg)", boxShadow: "var(--ll-shadow-card)", padding: "26px 22px" };
const pill: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ll-secondary)", background: "var(--ll-secondary-tint)", padding: "5px 11px", borderRadius: 999 };
const label: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--ll-on-surface)", marginBottom: 6 };
const input: React.CSSProperties = { width: "100%", border: "2px solid transparent", background: "var(--ll-surface-container-low)", borderRadius: "var(--ll-radius)", padding: "13px 14px", fontFamily: "var(--ll-font-latin)", fontSize: 16, color: "var(--ll-on-surface)", outline: "none", marginBottom: 16 };
const cta: React.CSSProperties = { width: "100%", border: "none", cursor: "pointer", background: "var(--ll-secondary)", color: "#fff", fontWeight: 600, fontSize: 16, padding: 15, borderRadius: 999, boxShadow: "var(--ll-shadow-cta)" };
