import { dbFilePath } from "@/lib/db";
import { publicCaps } from "@/lib/config";
import { getCurrentSession } from "@/lib/session";
import {
  listFeedPosts,
  listProfiles,
  listGroups,
  listBookmarks,
  bookmarkCount,
  listJoinedGroups,
  joinedGroupCount,
  listFollows,
  followingCount,
  displayedFollowerCount,
} from "@/lib/repo";
import {
  loginAction,
  logoutAction,
  bookmarkAction,
  followAction,
  joinGroupAction,
} from "./actions";

export const dynamic = "force-dynamic";

/**
 * STEP 3 harness (temporary). Not the designed UI — a functional control panel
 * to prove the mutable user layer (bookmark / follow / join) persists across a
 * server restart, per spec §11 step 3. The real screens replace this in Step 4.
 */
export default function Page() {
  const session = getCurrentSession();
  return (
    <main style={shell()}>
      <div style={frame()}>
        <Brand />
        {session ? <Harness sessionId={session.id} /> : <Login />}
      </div>
    </main>
  );
}

// ── Login (S1, captures identity) ────────────────────────────────────────────

function Login() {
  return (
    <>
      <div style={card()}>
        <span style={pill()}>New · StudyCircle</span>
        <h1 style={h1()}>Welcome 👋</h1>
        <p style={muted()}>
          This is a demo from the perspective of a brand-new user on a free
          trial. Your name, bookmarks, and groups are saved — the session resets
          only when you log out.
        </p>
        <form action={loginAction} style={{ marginTop: 18 }}>
          <label style={label()}>Your name</label>
          <input name="name" required placeholder="e.g. Rafi Ahmed" style={input()} />
          <label style={label()}>Class</label>
          <select name="class" defaultValue="9" style={input()}>
            {[6, 7, 8, 9, 10, 11, 12].map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
          <button type="submit" style={cta()}>
            Continue
          </button>
        </form>
      </div>
      <Footnote />
    </>
  );
}

// ── Persistence harness ──────────────────────────────────────────────────────

function Harness({ sessionId }: { sessionId: string }) {
  const session = getCurrentSession()!;
  const posts = listFeedPosts().slice(0, 5);
  const profiles = listProfiles().slice(0, 5);
  const groups = listGroups();

  const bookmarks = listBookmarks(sessionId);
  const bmCount = bookmarkCount(sessionId);
  const joined = listJoinedGroups(sessionId);
  const jCount = joinedGroupCount(sessionId);
  const follows = listFollows(sessionId);

  return (
    <>
      <div style={{ ...card(), display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{session.name}</div>
          <div style={muted()}>Class {session.class} · session active</div>
        </div>
        <form action={logoutAction}>
          <button type="submit" style={ghost()}>
            Log out
          </button>
        </form>
      </div>

      <p style={{ ...muted(), margin: "16px 2px 0" }}>
        <b style={{ color: "var(--ll-on-surface)" }}>Step 3 — prove persistence.</b>{" "}
        Bookmark a post, follow a profile, join a group. Then stop the server
        (Ctrl-C) and run <code>npm run dev</code> again — the selections below
        must still be here. (This panel is temporary; designed screens come next.)
      </p>

      {/* Bookmarks */}
      <Section title={`Bookmark a post — ${bmCount} of ${publicCaps.bookmarkCap} used`}>
        {posts.map((p) => {
          const on = bookmarks.includes(p.id);
          return (
            <Item key={p.id} text={p.body}>
              <form action={bookmarkAction}>
                <input type="hidden" name="postId" value={p.id} />
                <input type="hidden" name="remove" value={on ? "1" : "0"} />
                <button
                  type="submit"
                  style={on ? chipOn() : chip()}
                  disabled={!on && bmCount >= publicCaps.bookmarkCap}
                >
                  {on ? "✓ Bookmarked" : bmCount >= publicCaps.bookmarkCap ? "At cap" : "Bookmark"}
                </button>
              </form>
            </Item>
          );
        })}
      </Section>

      {/* Follows */}
      <Section title={`Follow a profile — following ${followingCount(sessionId)}`}>
        {profiles.map((pr) => {
          const on = follows.includes(pr.id);
          return (
            <Item key={pr.id} text={`${pr.user_tag} · Class ${pr.class} · ${displayedFollowerCount(pr.id, sessionId)} followers`}>
              <form action={followAction}>
                <input type="hidden" name="profileId" value={pr.id} />
                <button type="submit" style={on ? chipOn() : chip()}>
                  {on ? "✓ Following" : "Follow"}
                </button>
              </form>
            </Item>
          );
        })}
      </Section>

      {/* Join groups */}
      <Section title={`Join a group — ${jCount} of ${publicCaps.joinGroupCap} joined`}>
        {groups.map((g) => {
          const on = joined.includes(g.id);
          return (
            <Item key={g.id} text={`${g.name} · ${g.topic ?? ""}`}>
              <form action={joinGroupAction}>
                <input type="hidden" name="groupId" value={g.id} />
                <button
                  type="submit"
                  style={on ? chipOn() : chip()}
                  disabled={on || (jCount >= publicCaps.joinGroupCap)}
                >
                  {on ? "✓ Joined" : jCount >= publicCaps.joinGroupCap ? "At cap" : "Join"}
                </button>
              </form>
            </Item>
          );
        })}
      </Section>

      <Footnote />
    </>
  );
}

// ── Small presentational bits (token-driven) ─────────────────────────────────

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div style={{ width: 36, height: 36, borderRadius: 11, background: "var(--ll-gradient-deep)" }} />
      <span style={{ fontFamily: "var(--ll-font-display)", fontWeight: 800, fontSize: 19, color: "var(--ll-primary)" }}>
        Shikho · StudyCircle
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ ...card(), marginTop: 16 }}>
      <div style={{ fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </section>
  );
}

function Item({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
      <span style={{ fontSize: 12, color: "var(--ll-on-surface-variant)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {text}
      </span>
      <div style={{ flex: "none" }}>{children}</div>
    </div>
  );
}

function Footnote() {
  return (
    <p style={{ ...muted(), margin: "16px 2px 0", fontSize: 11 }}>
      DB: <code>{relative(dbFilePath())}</code> · caps from .env — bookmarks{" "}
      {publicCaps.bookmarkCap}, groups {publicCaps.joinGroupCap}, searches/wk{" "}
      {publicCaps.searchWeeklyCap}.
    </p>
  );
}

// styles
function shell(): React.CSSProperties {
  return { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "28px 16px" };
}
function frame(): React.CSSProperties {
  return { width: "var(--ll-phone-width)", minHeight: "var(--ll-phone-height)", background: "var(--ll-wash-lavender)", borderRadius: 38, boxShadow: "0 28px 70px rgba(25,28,30,.28)", padding: "30px 22px" };
}
function card(): React.CSSProperties {
  return { background: "var(--ll-surface-container-lowest)", borderRadius: "var(--ll-radius-lg)", boxShadow: "var(--ll-shadow-card)", padding: "18px 18px", marginTop: 18 };
}
function pill(): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ll-secondary)", background: "var(--ll-secondary-tint)", padding: "5px 11px", borderRadius: "var(--ll-radius-full)" };
}
function h1(): React.CSSProperties {
  return { fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 26, margin: "14px 0 8px", color: "var(--ll-on-surface)" };
}
function muted(): React.CSSProperties {
  return { margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--ll-on-surface-variant)" };
}
function label(): React.CSSProperties {
  return { display: "block", fontSize: 13, fontWeight: 600, color: "var(--ll-on-surface)", margin: "10px 0 6px" };
}
function input(): React.CSSProperties {
  return { width: "100%", border: "2px solid transparent", background: "var(--ll-surface-container-low)", borderRadius: "var(--ll-radius)", padding: "12px 14px", fontFamily: "var(--ll-font-latin)", fontSize: 16, color: "var(--ll-on-surface)", outline: "none" };
}
function cta(): React.CSSProperties {
  return { width: "100%", marginTop: 18, border: "none", cursor: "pointer", background: "var(--ll-secondary)", color: "#fff", fontWeight: 600, fontSize: 15, padding: "14px", borderRadius: "var(--ll-radius-full)", boxShadow: "var(--ll-shadow-cta)" };
}
function chip(): React.CSSProperties {
  return { border: "none", cursor: "pointer", background: "var(--ll-primary-fixed)", color: "var(--ll-on-primary-fixed-variant)", fontWeight: 700, fontSize: 12, padding: "7px 12px", borderRadius: "var(--ll-radius-full)" };
}
function chipOn(): React.CSSProperties {
  return { ...chip(), background: "var(--ll-success-container)", color: "var(--ll-on-success-container)" };
}
function ghost(): React.CSSProperties {
  return { border: "none", cursor: "pointer", background: "transparent", color: "var(--ll-error)", fontWeight: 700, fontSize: 13 };
}
function relative(p: string): string {
  const cwd = process.cwd();
  return p.startsWith(cwd) ? "." + p.slice(cwd.length) : p;
}
