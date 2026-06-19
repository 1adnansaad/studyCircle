# StudyCircle — Build Spec (Claude Code)

A working demo of **StudyCircle**, a social feature inside the existing **Shikho** app (Bangla edtech, Class 6–12). Persona for the whole demo: a **brand-new user on a free trial**.

> **This supersedes the earlier "Build Spec for Claude Design."** That document was written for a design tool and told the builder *not* to persist or seed. For **this** build, that framing is inverted: you are implementing the full, live, persistent app. Where anything in the older design spec conflicts with this document, **this document wins.** DESIGN.md remains the visual source of truth, unchanged.

---

## 0. Build context & stack

- **Web app**, mobile-first, runs in a phone browser. No native app / APK.
- **Next.js (App Router) + SQLite.** Runs locally with `npm run dev` first. Structured so `docker compose up` works later with no rewrite.
- **Persistent state is real** (SQLite). Every object in §2 must actually save and survive a server restart and a browser close.
- **Config via env only**, never hardcoded paths:
  - `GEMINI_API_KEY` **and** `ANTHROPIC_API_KEY` — support both; choose provider via `LLM_PROVIDER` (default `gemini`). LLM calls run **server-side only** (an API route), never from the browser.
  - `DB_PATH` (default `./data/app.db`), `PORT`.
  - **Free-trial caps are env-configurable, never hardcoded:** `BOOKMARK_CAP` (default `5`), `JOIN_GROUP_CAP` (default `2`), `SEARCH_WEEKLY_CAP` (default `7`). Read these everywhere the limit is enforced, displayed in meters, or shown in copy — so changing the `.env` changes the limit and the UI text together.
  - Commit a `.env.example` listing all of these.
- **Persistence layout for clean Docker-later:** SQLite file lives at `./data/app.db`; any referenced images live in `/public/images/`. `.gitignore`: `node_modules`, `.env`, `.next`, `./data/app.db` (commit the *seed source*, not the live db).
- **Single demo identity.** One active demo user/session at a time; multi-user is out of scope.
- **Visuals = DESIGN.md.** Pink-lead / indigo-deep, Baloo Da 2 + Be Vietnam Pro, pill buttons, 16px cards, Bengali numerals and ৳. X/Twitter is an **interaction-pattern reference only** — zero Twitter visuals (no blue, no bird, no Twitter typeface).
- **Language split:** existing Shikho chrome stays **Bengali** (nav labels পদ্ধতি / ইনবক্স / শিখো AI, embed CTA, numerals, ৳). New StudyCircle strings are **English** (Feed, Groups, Bookmark, Search, Follow, gate/empty/modal copy).
- **Images** are optional decoration only (no user uploads — composer image-attach is a gated affordance). Store as files; rows hold the path.

---

## 1. Governing interaction model (freemium)

One rule: **affordances visible, reads free, writes gated — except the metered/allowed writes below.**

**Account tier (user, 2026-06-19):** Login captures a tier — **Free trial** or **Premium** (stored on `session.tier`). **Premium bypasses every freemium cap** (bookmark / join group / search-per-week / weekly post budget) — all unlimited, and every meter renders **"Unlimited ✦"** instead of `used / cap`. Premium also unlocks the gated **Like** (a "Liked." toast instead of the upsell) and the AI **Trending now** card (Free sees the locked promo). The caps and gates below describe the **Free** tier. Follow is uncapped for both.

| Bucket | Actions | Behavior |
|---|---|---|
| **Reads — always free** | Browse feed, Groups, search results, post detail/threads, profiles | Work normally |
| **Allowed writes** (work + persist) | **Bookmark** (≤`BOOKMARK_CAP`, default 5) · **Join group** (≤`JOIN_GROUP_CAP`, default 2, no leaving) · **Search** (≤`SEARCH_WEEKLY_CAP`/week, default 7) · **Follow / Unfollow** (uncapped) | Execute, persist, show quota where capped; block at cap |
| **Metered writes** (work + persist, one shared weekly budget) | **Post · Comment · Reply · Repost · Quote** — all draw from `POST_WEEKLY_CAP`/week (default 5) | Persist as user-authored content (appears in feed/threads, interactable, cleared on logout); **monotonic** — un-reposting/un-quoting never refunds; block at cap → upsell |
| **Free affordance** (no gate, no persistence) | **Share (external)** | Confirmation toast **"Post copied for everyone to see."** — no upsell, no state change |
| **Gated writes** (button visible; tap → subscribe/upsell) | **Like** | Show upsell; no state change |
| **Real bridge** | Tap a **Shikho embed** | Opens lesson preview / routes toward the course |

**Change from the design spec:** Follow has moved from *gated* to *allowed* — it now persists and drives follower counts (§2, §3).

**Change (user, 2026-06-19):** Post / Comment / Reply / Repost / Quote moved from *gated* to a **metered** write sharing one weekly budget `POST_WEEKLY_CAP`. User-authored posts join the same `posts` table (author_profile_id NULL, `session_id` set), appear in the feed, and are fully interactable; comments persist in threads; reposts/quotes create a referencing feed post. All of it is mutable-layer state (cleared on logout via cascade). **Share (external)** is now a free confirmation ("Post copied for everyone to see.") — only **Like** remains fully gated.

The gate prompt doubles as the subscribe funnel → points at the paid **C9–C12 courses**. One reusable Upsell component for every gated write.

No separate "save" action — **bookmark is the save**, and it's allowed. The composer is fully clickable (text, privacy chip, embed picker); **Post** publishes a real post (consuming the weekly post budget) until the cap, then upsells. The composer shows the weekly post meter like the other capped surfaces.

---

## 2. Persistent objects (real — must survive restart & browser close)

| Object | Driven by | Behavior & states |
|---|---|---|
| **User identity** (Name + Class) | Login form | Captured at login; drives own name-card, profile header, composer author preview. Class drives the class tag + a seeded leaderboard tag. |
| **Bookmark set (≤`BOOKMARK_CAP`)** | Bookmark action | Per-post: not-bookmarked / bookmarked. Set: empty ("Bookmarks empty") / below cap / at-cap. At-cap + new bookmark → **remove modal** listing current bookmarks each with Delete. Toast: "{n} of {BOOKMARK_CAP}". |
| **Joined-groups set (≤`JOIN_GROUP_CAP`)** | Join action | Group card: not-joined → join-confirm → joined. At-cap → tapping another blocks. Own joined list empty ("Groups empty") while suggested list still renders. Joined group → group view. |
| **Searches-used (≤`SEARCH_WEEKLY_CAP`, weekly)** | Search submit | Counter increments per search, blocks at cap. |
| **Follow set (uncapped)** | Follow / Unfollow | Per-profile button: Follow ⇄ Following. **Following someone increments that profile's displayed follower count by 1; unfollowing decrements it.** Persists across sessions. See §3 for the count formula. Own profile's "following" count = size of this set. |

> The brief's "add a connection → leave → come back → still there" is satisfied by **follow**, **bookmark**, and **join-group** persistence. These are the things to verify on the restart test.

---

## 3. Session, persistence, follower counts & logout-reset

**Single active demo session**, persisted in SQLite (e.g. a `session` row holding identity + session id). It survives server restart and browser close — reopening restores the user exactly where they were. This is the brief's hard requirement; do **not** clear state on tab-close or exit.

**Follower-count formula (do it this way, not by mutating a counter in place):**
> displayed_follower_count(profile) = profile.follower_count_seed + (1 if current session follows profile else 0)

This makes the count move when you follow/unfollow, persist because the follow set persists, and revert automatically on logout with nothing to unwind.

**Logout = reset (the only reset).** Logout clears the current session's **mutable layer** — identity, bookmarks, joined groups, follow set, searches-used — and returns to Login, giving the next tester a clean slate. It does **not** touch the seeded world (posts, profiles, groups, comments, embeds), so follower counts revert to their seed values automatically. Exit/close/restart resets **nothing**.

So: **persist on exit, reset on logout.**

---

## 4. Navigation & the Home ↔ StudyCircle toggle

- Existing Shikho bottom nav stays as in the screenshot; **auto-hides on scroll-down, returns on scroll-up.**
- **Five items**, in order: **[Home/StudyCircle toggle] [Search] [পদ্ধতি] [ইনবক্স] [শিখো AI]**. The last three are dead buttons. (DESIGN.md note: re-space the 4-col nav to fit five items.)
- **Toggle slot:** the former হোম slot's label + icon **swap** between "Home" and "StudyCircle." Both states must read as **tappable-to-switch** — explicitly **not** the pink-filled selected/active treatment (that reads as already-selected). Define a distinct swap affordance overriding the active-tab token locally.
- Entering StudyCircle or Search flips the toggle to "Home"; entering Home flips it back.

---

## 5. Screens

- **S1 Login** — Welcome card. Inputs: Name (text), Class (dropdown 6–12), and an **Account type** segmented control — **Free trial** (caps apply) or **Premium ✦** (everything uncapped). Continue → S2. Captures identity + tier (`session.tier`). A tier badge shows in the Sidebar.
- **S2 Home** — Replica of the current home (screenshot), unchanged except the nav (§4). Toggle → S3; Search → S8; any other home control → dead-end.
- **S3 StudyCircle · Feed** — Top bar (avatar/menu → Sidebar) + tabs **Feed | Groups** + compose entry → S9. Scrolling PostCards, some with a Shikho embed. **Feed renders seeded posts regardless of follow state** — never an empty "follow someone" wall. Card body → S5; name-card → S6. Tab → S4.
- **S4 StudyCircle · Groups** — GroupCards (subject, active-user count, posts/day). New user → suggested groups; own joined list "Groups empty" until joined. Not-joined → join-confirm → joined / at-cap block. Joined → S7.
- **S5 Post detail / thread** — Original PostCard pinned + comment thread (each comment uses NameCard). Reply input visible and **works** — a reply persists in the thread and consumes the weekly post budget (block at cap → upsell). Reading free; Repost/Quote also metered; Share → "post copied" toast (free); Like → upsell. Bookmark metered. Embeds → S10. Name-card → S6.
- **S6 Profile (any user, incl. own)** — Header = NameCard + **follower count** and **following count**. **Follow/Following button works and persists** (§3). Sections: Posts, Groups. Own profile uses captured Name/Class. Post → S5; group → join/enter rules.
- **S7 Group view** — Title becomes group name + back button. Header: name, description, privacy (seed). Member PostCards behave like feed. Back → S4.
- **S8 Explore (Search)** — Entering flips toggle → "Home". NL search field with live **"{n} / 120"** counter; weekly-search meter ("{n} of {SEARCH_WEEKLY_CAP}", or "Unlimited ✦" for Premium); default state shows trending posts. Submit decrements meter (block at cap; Premium unlimited) and calls the LLM (§9). Results = standard PostCards. Result → S5. **Trending now card:** **Free** users see the locked promo (blurred topics + lock + "Unlock trending topics" → dead-end) exactly as before — it's a Premium feature. **Premium** users get the live AI card: its CTA asks the LLM to cluster the feed into up to **5 trending topics** (title + one-line summary); tapping a topic opens the posts it summarized (as PostCards). **No LLM key / call fails → deterministic demo topics** (grouped by subject) with the copy *"LLM unavailable — showing demo topics."* — still tappable to real posts.
- **S9 Composer** — Fully clickable. Author preview (own Name/Class), text field, optional image attach, privacy selector/chip (display-only seed), **"Embed from Shikho" picker** attaching a ShikhoEmbed preview, and the **weekly post meter** (`used / POST_WEEKLY_CAP`). Post **publishes a real post** (own-authored, appears at the top of the Feed and on the own profile) and consumes the weekly budget; at the cap → upsell (→ C9–C12 courses).
- **S10 Lesson preview (the bridge)** — Reached from any embed. Thumbnail, lesson title, CTA **শুরু করো / ৩ দিন ফ্রি**, routes toward the course. Make it feel real, not a dead-end.
- **Sidebar (drawer)** — Profile (own, S6) · My Bookmarks (the set; empty = "Bookmarks empty"; remove flow lands here) · Settings (dead-end).

**Dead-button rule:** only the controls in §1's allowed/gated rows, the toggle, Search, in-StudyCircle navigation, and follow do anything. Everything else → toast **"This page is not available in the current demo."**

---

## 6. Components

- **PostCard** — NameCard header; text; optional image; optional ShikhoEmbed; optional reposted-original reference; actions **Comment · Like · Repost · Quote · Share · Bookmark**. Comment → opens the thread (reply there); Repost/Quote persist (metered); Bookmark allowed/metered; Share → free "post copied" toast; Like gated. Reused in feed, Groups, results, profile.
- **NameCard** — no profile photo; user tag (→ S6), class tag, leaderboard tag (seed), privacy tag (seed).
- **ShikhoEmbed** — deep-indigo thumbnail, lesson title, CTA শুরু করো / ৩ দিন ফ্রি; tap → S10. In feed, Groups, results, composer preview.
- **GroupCard** — subject, active-user count, posts/day; state-aware (not-joined → join flow; joined → S7).
- **FollowButton** — Follow ⇄ Following; works and persists; updates the follower count via §3 formula.
- **Join-confirm dialog** — *"Join {GroupName}? On the free trial you can join up to {JOIN_GROUP_CAP} groups, and you can't leave a group once joined."* Join / Cancel; shows "{n} of {JOIN_GROUP_CAP} groups joined."
- **Bookmark-at-cap modal** — lists the current bookmarks (up to `BOOKMARK_CAP`), each with Delete.
- **Upsell/Gate prompt** — single reusable component → C9–C12 courses.
- **CharCounter** "{n} / 120" · **MeterLine** "{n} of {max} … used" · **Privacy chip** (seed) · **DeadEndToast**.

---

## 7. Data model (SQLite — sketch; refine as needed)

**Seeded "world" tables (never cleared on logout):**
- `profiles` (id, user_tag, class, leaderboard_pos, follower_count_seed)
- `posts` (id, author_profile_id **nullable** [null = authored by the demo session], body, image_path nullable, privacy, group_id nullable [null = main feed], like/comment/repost counts, `repost_of_post_id` nullable, `session_id` nullable [set = user post, ON DELETE CASCADE], created_at)
- `post_embeds` (id, post_id, lesson_title, thumbnail_path, course_ref)
- `comments` (id, post_id, author_profile_id **nullable**, parent_comment_id nullable, body, `session_id` nullable [ON DELETE CASCADE], created_at)
- `groups` (id, name, description, privacy, active_users, posts_per_day)

> Posts/comments are *world* tables, but a row with `session_id` set is **user-authored mutable state**: the FK cascade deletes it on logout, so the seeded world is byte-identical before/after a session.

**Mutable "user layer" tables (cleared on logout):**
- `session` (id, name, class, **tier** [`free` | `premium`], created_at) — Premium bypasses all caps
- `bookmarks` (session_id, post_id) — enforce ≤`BOOKMARK_CAP` server-side
- `joined_groups` (session_id, group_id) — enforce ≤`JOIN_GROUP_CAP` server-side
- `follows` (session_id, profile_id) — uncapped
- `search_usage` (session_id, searches_used, week_start) — enforce ≤`SEARCH_WEEKLY_CAP`/week
- `post_usage` (session_id, posts_used, week_start) — enforce ≤`POST_WEEKLY_CAP`/week (shared by post/comment/reply/repost/quote)
- *user-authored* `posts`/`comments` rows (via `session_id`, above)

Logout = delete the session row; ON DELETE CASCADE clears every mutable table **and** the user-authored posts/comments. Follower counts and "following" counts are **derived**, never stored mutably.

---

## 8. Seed content

Seed enough that the app feels alive on first run, all in **real Bengali** with ৳ and Bengali numerals:
- A dozen-plus posts across the feed, a few carrying ShikhoEmbeds; several with comment threads.
- A handful of profiles (varied classes, seeded leaderboard positions and follower counts).
- A handful of groups (subject/topic names, seeded active-user and posts/day counts), some assigned as the "suggested" set for the new user.
- Lean the content toward **C9–C12** subjects (the high-margin classes), so embeds and upsells point at those courses.

First-run: if `./data/app.db` is missing, create the schema and load this seed. (Author the seed as a JSON/SQL file committed to the repo.)

---

## 9. LLM / Explore search

The Explore search (S8) calls the model **server-side** (API route): take the query, pull candidate posts from the DB, ask the model to rank/return the relevant ones, render as PostCards. Gated by the weekly-search counter (block at `SEARCH_WEEKLY_CAP` before calling; Premium bypasses both the search cap and the token budget). Provider selectable via `LLM_PROVIDER` (gemini default, anthropic supported). Use the current SDK and model — don't hardcode a stale model name.

**Trending topic summaries** (S8 "Trending now" card): a second server-side call (`summarizeTopics` in `llm.ts` → `summarizeTrendingAction`) clusters the same candidate corpus into up to **5 topics**, each `{title, summary, postIds}`; the action resolves the ids to PostCards so tapping a topic shows its posts. **No key / parse failure / call error → deterministic `fallbackTopics`** (grouped by subject) with `fallback: true`, surfaced as *"LLM unavailable — showing demo topics."* This path is independent of the weekly-search counter.

---

## 10. Copy deck (authored strings)

- Login: *"Welcome! This is a demo from the perspective of a brand-new user on a free trial."*
- Bookmark success: *"Bookmarked. {n} of {BOOKMARK_CAP} free-trial bookmarks used."*
- Bookmark at cap (modal): *"You've reached your {BOOKMARK_CAP}-bookmark limit. Delete one to save this post."*
- Join confirm: *"Join {GroupName}? On the free trial you can join up to {JOIN_GROUP_CAP} groups, and you can't leave a group once joined."*
- Groups at cap: *"You've joined the maximum of {JOIN_GROUP_CAP} groups on the free trial."*
- Search meter: *"{n} of {SEARCH_WEEKLY_CAP} weekly searches used."* · Blocked: *"You've used all {SEARCH_WEEKLY_CAP} of your weekly searches on the free trial."*
- Char counter: *"{n} / 120"*
- Follow: button **Follow** / **Following**; profile shows **"{n} followers"** / **"{n} following"**.
- Gated write / upsell: *"Subscribe to unlock posting, likes, and comments — and your C9–C12 courses."*
- Empty: *"Bookmarks empty"* · *"Groups empty"*
- Dead end: *"This page is not available in the current demo."*
- Embed CTA: **শুরু করো / ৩ দিন ফ্রি**

---

## 11. Build order (pause after each — confirm before moving on)

1. Scaffold Next.js + SQLite; get it running locally. Tell me the exact run command.
2. Schema (§7) + first-run seed (§8) + the `session` model.
3. Login → capture identity. **Prove persistence:** bookmark a post / follow a profile / join a group, restart the server, confirm it survived. Walk the §2 table. Confirm before building screens.
4. Build the look/screens from DESIGN.md + the design reference.
5. Wire features + free-trial gating (§1), including the follower-count behavior (§3).
6. Wire Explore search to the LLM (§9).
7. Wire **logout-reset** (§3) and re-verify: close/restart keeps state; logout clears it back to baseline.

Also write a **CLAUDE.md** capturing stack, these decisions, the data model, and how to run, so context survives across sessions.

---

## 12. Open flags

1. **Caps are env-configurable** via `BOOKMARK_CAP` (5), `JOIN_GROUP_CAP` (2), `SEARCH_WEEKLY_CAP` (7) — change the `.env` to change limits and copy together. Follow remains uncapped; add a `FOLLOW_CAP` if you ever want to meter it too.
2. **Feed vs follows.** Feed stays seeded regardless of who you follow (simplest, avoids an empty wall). Say so if you'd rather followed users' posts surface in the feed.
3. **Language split** (Bengali chrome / English new strings) and **no-separate-save / composer-clickable-Post-gated** carried from upstream — flip any if you've changed your mind.
