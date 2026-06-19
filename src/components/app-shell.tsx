"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type UIEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { frameSize, type Aspect } from "@/lib/aspect";
import {
  logoutAction,
  joinGroupAction,
  removeBookmarkAction,
} from "@/app/actions";
import {
  SearchIcon,
  MethodIcon,
  InboxIcon,
  SparkleIcon,
  HouseIcon,
  BookIcon,
  UserIcon,
  UsersIcon,
  BookmarkIcon,
  SettingsIcon,
  LogoutIcon,
  CloseIcon,
  CheckIcon,
} from "./icons";

// ── Types ────────────────────────────────────────────────────────────────────

export type ShellSession = {
  name: string;
  klass: number;
  classTag: string;
  tag: string;
  initials: string;
  premium: boolean;
};
export type ShellCaps = { bookmarkCap: number; joinGroupCap: number; searchWeeklyCap: number; postWeeklyCap: number };
export type ShellGroup = { id: string; name: string; topic: string | null; joinedCount: number };
export type ShellBookmark = { id: string; tag: string; body: string };

type Modal =
  | null
  | { kind: "upsell"; title?: string; body?: string }
  | { kind: "deadend" }
  | { kind: "joinconfirm"; group: ShellGroup }
  | { kind: "bookmarkcap" }
  | { kind: "chipinfo"; title: string; body: string; showCta?: boolean };

type Ctx = {
  session: ShellSession;
  caps: ShellCaps;
  toast: (msg: string) => void;
  openSidebar: () => void;
  upsell: (o?: { title?: string; body?: string }) => void;
  deadEnd: () => void;
  joinConfirm: (g: ShellGroup) => void;
  bookmarkAtCap: () => void;
  chipInfo: (o: { title: string; body: string; showCta?: boolean }) => void;
  /** Standard upsell when a post/comment/repost/quote hits the weekly POST_WEEKLY_CAP. */
  postCapUpsell: () => void;
};

const AppCtx = createContext<Ctx | null>(null);
export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within <AppShell>");
  return c;
}

// Routes that show the bottom tab bar (home + StudyCircle surfaces).
const TAB_ROUTES = ["/home", "/studycircle", "/explore"];

export function AppShell({
  session,
  caps,
  bookmarks,
  aspect,
  children,
}: {
  session: ShellSession;
  caps: ShellCaps;
  bookmarks: ShellBookmark[];
  aspect: Aspect;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [modal, setModal] = useState<Modal>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((m) => (m === msg ? null : m)), 2600);
  }, []);

  const close = useCallback(() => setModal(null), []);
  const courseLine = `Class ${session.klass}`;

  const ctx: Ctx = {
    session,
    caps,
    toast,
    openSidebar: () => setSidebar(true),
    upsell: (o) => setModal({ kind: "upsell", ...o }),
    deadEnd: () => setModal({ kind: "deadend" }),
    joinConfirm: (group) => setModal({ kind: "joinconfirm", group }),
    bookmarkAtCap: () => setModal({ kind: "bookmarkcap" }),
    chipInfo: (o) => setModal({ kind: "chipinfo", ...o }),
    postCapUpsell: () =>
      setModal({
        kind: "upsell",
        title: `You've used all ${caps.postWeeklyCap} of your weekly posts`,
        body: `On the free trial, posts, comments, reposts, and quotes share a budget of ${caps.postWeeklyCap} a week. Subscribe to post without limits — and unlock your ${courseLine} courses.`,
      }),
  };

  const [sidebar, setSidebar] = useState(false);
  const showTabs = TAB_ROUTES.includes(pathname);

  // Bottom nav auto-hides on scroll-down, returns on scroll-up (§4).
  const [navHidden, setNavHidden] = useState(false);
  const lastScroll = useRef(0);
  useEffect(() => { setNavHidden(false); lastScroll.current = 0; }, [pathname]);
  function onScroll(e: UIEvent) {
    const top = (e.target as HTMLElement).scrollTop;
    const delta = top - lastScroll.current;
    if (top <= 8) setNavHidden(false);
    else if (delta > 6) setNavHidden(true);
    else if (delta < -6) setNavHidden(false);
    lastScroll.current = top;
  }

  function go(path: string) {
    setSidebar(false);
    router.push(path);
  }

  function confirmJoin(g: ShellGroup) {
    startTransition(async () => {
      const res = await joinGroupAction(g.id);
      close();
      if (res.ok) toast(session.premium ? `Joined ${g.name}.` : `Joined ${g.name}. ${res.count} of ${caps.joinGroupCap} groups joined.`);
      else if (res.reason === "at_cap")
        setModal({
          kind: "upsell",
          title: `You've joined the maximum of ${caps.joinGroupCap} groups`,
          body: `Subscribe to join unlimited study groups — and unlock your ${courseLine} courses.`,
        });
      router.refresh();
    });
  }

  function removeBm(postId: string) {
    startTransition(async () => {
      await removeBookmarkAction(postId);
      router.refresh();
    });
  }

  return (
    <AppCtx.Provider value={ctx}>
      <main style={{ ...shell, ...(aspect ? letterbox : null) }}>
        <div style={{ ...frame, ...frameSize(aspect) }}>
          {/* gradient fake-loading bar — replays on every route change */}
          <span key={`progress-${pathname}`} className="sc-progress" />
          <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }} onScrollCapture={onScroll}>
            <div key={pathname} className="sc-anim-fade" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              {children}
            </div>
            {showTabs && <BottomNav pathname={pathname} go={go} deadEnd={ctx.deadEnd} hidden={navHidden} />}
          </div>

          {sidebar && <Sidebar session={session} go={go} onClose={() => setSidebar(false)} deadEnd={ctx.deadEnd} />}

          {modal && (
            <Sheet onClose={close}>
              {modal.kind === "upsell" && (
                <Upsell
                  courseLine={courseLine}
                  title={modal.title}
                  body={modal.body}
                  onClose={close}
                  onCta={() => { close(); go("/home"); }}
                />
              )}
              {modal.kind === "deadend" && <DeadEnd onClose={close} />}
              {modal.kind === "joinconfirm" && (
                <JoinConfirm group={modal.group} cap={caps.joinGroupCap} premium={session.premium} onCancel={close} onConfirm={() => confirmJoin(modal.group)} />
              )}
              {modal.kind === "bookmarkcap" && (
                <BookmarkCap cap={caps.bookmarkCap} bookmarks={bookmarks} onRemove={removeBm} onClose={close} />
              )}
              {modal.kind === "chipinfo" && (
                <ChipInfo title={modal.title} body={modal.body} showCta={modal.showCta} courseLine={courseLine} onClose={close} onCta={() => { close(); go("/home"); }} />
              )}
            </Sheet>
          )}

          {toastMsg && <Toast msg={toastMsg} />}
        </div>
      </main>
    </AppCtx.Provider>
  );
}

// ── Bottom nav (Search · পদ্ধতি · [toggle] · ইনবক্স · শিখো AI) ─────────────────

function BottomNav({ pathname, go, deadEnd, hidden }: { pathname: string; go: (p: string) => void; deadEnd: () => void; hidden: boolean }) {
  const onHome = pathname === "/home";
  const toggleTarget = onHome ? "/studycircle" : "/home";
  return (
    <nav style={{ ...nav, transform: hidden ? "translateY(110%)" : "translateY(0)", transition: "transform .25s ease" }}>
      <NavBtn label="Search" active={pathname === "/explore"} onClick={() => go("/explore")}><SearchIcon /></NavBtn>
      <NavBtn label="পদ্ধতি" onClick={deadEnd}><MethodIcon /></NavBtn>
      <button aria-label="Switch Home / StudyCircle" onClick={() => go(toggleTarget)} style={toggleBtn}>
        <span style={toggleTrack}>
          <span style={onHome ? toggleSegActive : toggleSeg}><HouseIcon size={18} stroke={onHome ? "#fff" : "var(--ll-outline)"} /></span>
          <span style={!onHome ? toggleSegActive : toggleSeg}><BookIcon size={18} stroke={!onHome ? "#fff" : "var(--ll-outline)"} /></span>
        </span>
      </button>
      <NavBtn label="ইনবক্স" onClick={deadEnd}><InboxIcon /></NavBtn>
      <NavBtn label="শিখো AI" onClick={deadEnd}><SparkleIcon /></NavBtn>
    </nav>
  );
}

function NavBtn({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} style={{ ...navBtn, color: active ? "var(--ll-secondary)" : "var(--ll-on-surface-variant)" }}>
      {children}
      <span style={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>{label}</span>
    </button>
  );
}

// ── Sidebar drawer ────────────────────────────────────────────────────────────

function Sidebar({ session, go, onClose, deadEnd }: { session: ShellSession; go: (p: string) => void; onClose: () => void; deadEnd: () => void }) {
  return (
    <>
      <div onClick={onClose} style={scrim} className="sc-anim-fade" />
      <div style={drawer} className="sc-anim-slide-left">
        <div style={{ padding: "0 22px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--ll-surface-container-high)" }}>
          <Disc initials={session.initials} size={48} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ll-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.tag}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 12, color: "var(--ll-on-surface-variant)" }}>{session.classTag}</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 999, background: session.premium ? "var(--ll-secondary)" : "var(--ll-surface-container-high)", color: session.premium ? "#fff" : "var(--ll-on-surface-variant)" }}>{session.premium ? "Premium ✦" : "Free trial"}</span>
            </div>
          </div>
        </div>
        <DrawerItem icon={<UserIcon size={20} />} label="Profile" onClick={() => go("/profile/me")} />
        <DrawerItem icon={<BookmarkIcon size={20} />} label="My Bookmarks" onClick={() => go("/bookmarks")} />
        <DrawerItem icon={<SettingsIcon size={20} />} label="Settings" onClick={() => { onClose(); deadEnd(); }} />
        <div style={{ marginTop: "auto", padding: "0 14px" }}>
          <div style={{ height: 1, background: "var(--ll-surface-container-high)", margin: "0 8px 8px" }} />
          <form action={logoutAction}>
            <button type="submit" style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", border: "none", background: "transparent", cursor: "pointer", padding: "14px 8px", fontSize: 15, fontWeight: 600, color: "var(--ll-error)", textAlign: "left", borderRadius: 10 }}>
              <LogoutIcon size={20} />Log out
            </button>
          </form>
          <p style={{ margin: "2px 8px 4px", fontSize: 11, lineHeight: 1.4, color: "var(--ll-on-surface-variant)" }}>Logging out will reset this demo session.</p>
        </div>
      </div>
    </>
  );
}

function DrawerItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, border: "none", background: "transparent", cursor: "pointer", padding: "16px 22px", fontSize: 15, fontWeight: 600, color: "var(--ll-on-surface)", textAlign: "left", width: "100%" }}>
      <span style={{ color: "var(--ll-on-surface-variant)" }}>{icon}</span>{label}
    </button>
  );
}

// ── Modals ─────────────────────────────────────────────────────────────────────

function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={scrim} className="sc-anim-fade" />
      <div style={sheet} className="sc-anim-slide-up">{children}</div>
    </>
  );
}

function Upsell({ courseLine, title, body, onClose, onCta }: { courseLine: string; title?: string; body?: string; onClose: () => void; onCta: () => void }) {
  return (
    <SheetBody>
      <SheetTitle>{title ?? "Subscribe to unlock more"}</SheetTitle>
      <SheetText>{body ?? `Unlock likes, shares, and unlimited posting — along with your ${courseLine} courses.`}</SheetText>
      <PrimaryBtn onClick={onCta}>See {courseLine} courses</PrimaryBtn>
      <GhostBtn onClick={onClose}>Maybe later</GhostBtn>
    </SheetBody>
  );
}

function DeadEnd({ onClose }: { onClose: () => void }) {
  return (
    <SheetBody>
      <SheetTitle>Not in this demo 👋</SheetTitle>
      <SheetText>You'll be able to explore this another day — it's just not part of the current demo.</SheetText>
      <PrimaryBtn onClick={onClose}>Got it</PrimaryBtn>
    </SheetBody>
  );
}

function JoinConfirm({ group, cap, premium, onCancel, onConfirm }: { group: ShellGroup; cap: number; premium: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <SheetBody>
      <SheetTitle>Join {group.name}?</SheetTitle>
      <SheetText>
        {premium
          ? "You're on Premium — join as many groups as you like. (Leaving a group isn't part of this demo.)"
          : `On the free trial you can join up to ${cap} groups, and you can't leave a group once joined.`}
      </SheetText>
      {!premium && <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--ll-on-surface-variant)" }}>{group.joinedCount} of {cap} groups joined.</p>}
      <PrimaryBtn onClick={onConfirm}>Join group</PrimaryBtn>
      <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
    </SheetBody>
  );
}

function BookmarkCap({ cap, bookmarks, onRemove, onClose }: { cap: number; bookmarks: ShellBookmark[]; onRemove: (id: string) => void; onClose: () => void }) {
  return (
    <SheetBody>
      <SheetTitle>You've reached your {cap}-bookmark limit</SheetTitle>
      <SheetText>Delete one to save this post — or subscribe to keep them all.</SheetText>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "4px 0 14px", maxHeight: 240, overflowY: "auto" }} className="sc-scroll">
        {bookmarks.map((b) => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--ll-surface-container-low)", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ll-primary)" }}>{b.tag}</div>
              <div style={{ fontSize: 12, color: "var(--ll-on-surface-variant)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.body}</div>
            </div>
            <button onClick={() => onRemove(b.id)} style={{ flex: "none", border: "none", cursor: "pointer", background: "var(--ll-error-container)", color: "var(--ll-on-error-container)", fontWeight: 700, fontSize: 12, padding: "7px 12px", borderRadius: 999 }}>Delete</button>
          </div>
        ))}
      </div>
      <GhostBtn onClick={onClose}>Close</GhostBtn>
    </SheetBody>
  );
}

function ChipInfo({ title, body, showCta, courseLine, onClose, onCta }: { title: string; body: string; showCta?: boolean; courseLine: string; onClose: () => void; onCta: () => void }) {
  return (
    <SheetBody>
      <SheetTitle>{title}</SheetTitle>
      <SheetText>{body}</SheetText>
      {showCta ? <PrimaryBtn onClick={onCta}>See {courseLine} courses</PrimaryBtn> : null}
      <GhostBtn onClick={onClose}>{showCta ? "Maybe later" : "Got it"}</GhostBtn>
    </SheetBody>
  );
}

function Toast({ msg }: { msg: string }) {
  return <div style={toastStyle} className="sc-anim-fade-push">{msg}</div>;
}

// ── small presentational ─────────────────────────────────────────────────────

export function Disc({ initials, size = 36 }: { initials: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--ll-primary-fixed)", color: "var(--ll-on-primary-fixed-variant)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.38, flex: "none", boxShadow: "0 0 0 2px var(--ll-surface-container-lowest), 0 0 0 4px var(--ll-secondary-fixed)" }}>{initials}</div>
  );
}

function SheetBody({ children }: { children: ReactNode }) { return <div style={{ padding: "8px 4px 4px" }}>{children}</div>; }
function SheetTitle({ children }: { children: ReactNode }) { return <h3 style={{ margin: "0 0 8px", fontFamily: "var(--ll-font-display)", fontWeight: 700, fontSize: 20, color: "var(--ll-on-surface)" }}>{children}</h3>; }
function SheetText({ children }: { children: ReactNode }) { return <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.55, color: "var(--ll-on-surface-variant)" }}>{children}</p>; }
function PrimaryBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button onClick={onClick} style={{ width: "100%", border: "none", cursor: "pointer", background: "var(--ll-secondary)", color: "#fff", fontWeight: 600, fontSize: 15, padding: 13, borderRadius: 999, boxShadow: "var(--ll-shadow-cta)" }}>{children}</button>; }
function GhostBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button onClick={onClick} style={{ width: "100%", marginTop: 8, border: "none", cursor: "pointer", background: "transparent", color: "var(--ll-primary)", fontWeight: 600, fontSize: 14, padding: 11 }}>{children}</button>; }

// re-export for convenience
export { UsersIcon, CheckIcon, CloseIcon };

// ── styles ───────────────────────────────────────────────────────────────────
const shell: React.CSSProperties = { minHeight: "100dvh", display: "flex", justifyContent: "center", alignItems: "center", padding: 0 };
// Letterbox backdrop shown around a fixed-aspect frame (ASPECT_RATIO = "W:H").
const letterbox: React.CSSProperties = { background: "#0c0e12" };
// width/height come from frameSize(aspect) at render time (device = 100% / 100dvh).
const frame: React.CSSProperties = { background: "var(--ll-surface)", borderRadius: 0, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" };
const nav: React.CSSProperties = { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 15, display: "flex", background: "var(--ll-surface-container-lowest)", boxShadow: "var(--ll-shadow-bottom-nav)", padding: "6px 4px 9px" };
const navBtn: React.CSSProperties = { flex: 1, border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "7px 0" };
const toggleBtn: React.CSSProperties = { flex: 1, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 0" };
const toggleTrack: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 3, background: "var(--ll-surface-container-high)", borderRadius: 999, padding: 4 };
const toggleSeg: React.CSSProperties = { width: 30, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, color: "var(--ll-outline)" };
const toggleSegActive: React.CSSProperties = { ...toggleSeg, background: "var(--ll-gradient-deep)", boxShadow: "var(--ll-shadow-sm)" };
const scrim: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(25,28,30,.45)", zIndex: 30 };
const drawer: React.CSSProperties = { position: "absolute", top: 0, left: 0, bottom: 0, width: 280, background: "var(--ll-surface-container-lowest)", zIndex: 31, boxShadow: "4px 0 30px rgba(0,0,0,.2)", display: "flex", flexDirection: "column", padding: "24px 0" };
const sheet: React.CSSProperties = { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 32, background: "var(--ll-surface-container-lowest)", borderRadius: "24px 24px 0 0", boxShadow: "0 -10px 40px rgba(0,0,0,.25)", padding: "20px 20px 26px", maxHeight: "82%", overflowY: "auto" };
const toastStyle: React.CSSProperties = { position: "absolute", left: 16, right: 16, bottom: 84, zIndex: 40, background: "var(--ll-inverse-surface)", color: "var(--ll-inverse-on-surface)", fontSize: 13, fontWeight: 500, lineHeight: 1.45, padding: "12px 16px", borderRadius: 14, boxShadow: "0 8px 24px rgba(0,0,0,.3)", textAlign: "center" };
