# CLAUDE.md — StudyCircle

Context for AI sessions. StudyCircle is a **working demo** of a social feature
inside the existing **Shikho** app (Bangla edtech, Class 6–12). The whole demo is
seen from the perspective of a **brand-new user on a free trial**.

## Authoritative sources (read these; they win in this order)

1. **`STUDYCIRCLE_BUILD_SPEC.md`** — the spec. Authoritative on **behavior,
   persistence, and data**. Build order is its §11.
2. **`DESIGN.md`** — visual source of truth (tokens, components). Wins on **visuals**.
3. **`design-ref/`** (gitignored, local only) — handoff bundle from Claude Design:
   - `design-ref/project/StudyCircle.dc.html` — full interactive HTML prototype (all screens, modals, JS state + seed data). **Reference, not final code.**
   - `design-ref/project/PostCard.dc.html` — the PostCard component prototype.
   - `design-ref/chat-transcript.md` — the design iteration history (intent lives here).
   - `design-ref/project/_ds/.../tokens/*.css` — original token CSS (mirrored into our tokens).

**Conflict rule:** build spec wins on behavior/persistence/data; DESIGN.md wins on
visuals. The design prototype made some choices that the build spec overrides —
see "Conflicts resolved" below.

## Stack & key decisions

- **Next.js 15 (App Router) + TypeScript.** Mobile-first web app, runs in a phone
  browser. No native app / APK.
- **SQLite via `better-sqlite3`** (synchronous, server-side only). DB file at
  `DB_PATH` (default `./data/app.db`). WAL mode, foreign keys on.
- **Persistence is real** — every object in spec §2 must survive a server restart
  AND a browser close. Verified in Step 1 via a boot-counter health row.
- **Config is env-only** (`src/lib/config.ts`). Never hardcode caps or paths.
  - Caps: `BOOKMARK_CAP` (5), `JOIN_GROUP_CAP` (2), `SEARCH_WEEKLY_CAP` (7),
    `POST_WEEKLY_CAP` (5) — drive enforcement, meters, AND copy. `FOLLOW_CAP`
    optional (follow is uncapped).
  - `LLM_PROVIDER` (default `gemini`, also `anthropic`), `GEMINI_API_KEY` /
    `ANTHROPIC_API_KEY`. **LLM calls are server-side only** (an API route, Step 6).
- **Design tokens centralized** in `src/styles/tokens.css` (single `--ll-*` source,
  imported once via `globals.css`). Tweak colors/type/spacing there → hot-reloads.
  Components reference vars only; never hardcode a hex.
- **Docker-ready** (all persistent state under `./data`, env-only config, Node
  pinned via `engines` + `.nvmrc`) but **`npm run dev` is the path for now** — no
  Docker required yet.
- **Single demo identity** — one active session at a time; multi-user out of scope.

## Conflicts resolved (build spec wins over the design prototype)

The `design-ref` prototype was built for a design tool with different answers.
This build follows the **build spec**:

- **Language split (§0):** existing Shikho **chrome stays Bengali** (পদ্ধতি / ইনবক্স /
  শিখো AI, embed CTA `শুরু করো · ৩ দিন ফ্রি`, ৳). New **StudyCircle strings are
  English** (Feed, Groups, Bookmark, Search, Follow, gates/empties/modals).
  *(The prototype went all-English + Latin numerals — do NOT follow that.)*
  - **Numerals decision:** **seeded/student-facing data renders in Bengali numerals
    ০–৯** (post like/comment/repost counts, follower/following counts, group
    active/posts-per-day, class tags `ক্লাস ৯`, ranks, prices ৳, relative time
    `২ ঘণ্টা আগে`, lesson durations). **Free-trial freemium meters stay English/Latin**
    (`5 / 5` bookmarks, `0 of 7 searches`) since those are StudyCircle UI strings.
    All conversion via `src/lib/format.ts` (`bn`, `bnCount`, `classTag`, `relativeTime`).
- **Metered writes (§1, revised by user 2026-06-19):** **Post, Comment, Reply,
  Repost, Quote** all draw from one shared weekly budget `POST_WEEKLY_CAP` (5).
  Each consumes one; **monotonic** — un-reposting/un-quoting never refunds. At the
  cap they route to the upsell. The composer shows the meter (`used / cap`) like
  bookmarks/search/groups.
  - **Content is REAL.** User-authored posts live in the **same `posts` table**
    (`author_profile_id` NULL + `session_id` set), so they appear at the top of
    the Feed and on `/profile/me`, fully interactable. Comments persist in the
    thread; repost/quote create a referencing feed post (`repost_of_post_id`).
    All cleared on logout via the `session_id` FK cascade — the seeded world is
    byte-identical before/after a session.
  - Backed by: mutable `post_usage` + nullable-author `posts`/`comments` with
    `session_id` (`schema.ts`; idempotent rebuild migration in `db.ts`
    `migrateUserAuthoredContent`). Repo: `createPost` / `createComment` /
    `createRepost` / `listPostsBySession` / `postsUsed` (budget enforced inside
    the create txn via `bumpPostUsage`). Actions: `createPostAction` /
    `createCommentAction` / `repostAction`. UI: composer (`screen-widgets.tsx`),
    real `ReplyBar`, post-card repost/quote; `postCapUpsell()` in app-shell
    centralizes the at-cap upsell. `postToVM` renders the session identity for
    NULL-author rows.
- **Share (external)** is a **free** affordance: toast "Post copied for everyone
  to see." — no gate, no persistence (post-card.tsx).
- **Still fully gated → upsell, no state change (§1):** **Like**.
  (Group-composer "Post in group" is also still gated — not yet metered.)
- **Account tier (user, 2026-06-19):** login captures **Free** or **Premium**
  (`session.tier`; column added by `migrateSessionTier` in `db.ts`). **Premium
  bypasses every cap** — `isPremium(sessionId)` in `repo.ts` short-circuits the
  bookmark/join/search/post checks; `searchAction` skips the search cap + token
  budget. Every meter takes a `premium` flag (from the meter views) and renders
  **"Unlimited ✦"** (`MeterChip`, composer, explore chip); JoinConfirm + sidebar
  badge are tier-aware. Login control: `src/components/tier-choice.tsx`.
- **Trending now card (Explore):** **Free** users see the original locked promo
  (blurred topics + lock + "Unlock trending topics" dead-end). **Premium** users
  get the AI card: CTA → `summarizeTrendingAction` → `summarizeTopics` (`llm.ts`)
  clusters the corpus into ≤5 topics; tapping a topic opens its posts (reuses the
  search-results view). **No LLM key / failure → `fallbackTopics`** (grouped by
  subject), labeled "LLM unavailable — showing demo topics." Owns its state in
  `explore-client.tsx`; independent of the weekly-search counter.
- **Like** → upsell for **Free**; for **Premium** a local toggle (heart turns red,
  "Liked." toast — no persistence; likes are seed-only). **Repost** flips its icon
  to active green on success. Both are local `useState` in post-card.tsx (survive
  `router.refresh()`).
- **Quote button removed** from PostCard (user 2026-06-19). `repostAction` /
  `createRepost` still power Repost (and render the nested repost-of reference).
- **Lesson 3-day-free CTA is Free-only:** the post embed bar shows "শুরু করো · ৩
  দিন ফ্রি" (Free) vs "শুরু করো" (Premium); the S10 lesson page swaps its
  UpsellButton for a plain DeadButton on Premium (reads tier via
  `getCurrentSession()`).
- **Allowed writes** (work + persist): **Bookmark** (≤cap), **Join group** (≤cap, no
  leaving), **Search** (≤cap/week), **Follow/Unfollow** (uncapped), **post budget**
  (≤cap/week, above).
- **Follower count is derived, never mutated in place (§3):**
  `displayed = follower_count_seed + (1 if session follows else 0)`.
- **Logout is the only reset (§3):** clears the session's mutable layer; never
  touches the seeded world. Exit/close/restart resets nothing.

Visuals to keep from the prototype: the lavender wash, the 5-item bottom nav with
the **Home⇄StudyCircle two-position radio toggle** (house + book icons, active
side filled, centered between Study and Inbox), NameCard with no photo + clickable
@user_tag/class/rank/privacy chips, ShikhoEmbed deep-indigo card, the AI-composer
Explore search, bottom-sheet modals.

**Shell & motion (current):**
- **Shell aspect ratio (`ASPECT_RATIO`, user 2026-06-19)** — `"device"` (default)
  = full-bleed, frame fills the viewport (`width: 100%`, `height: 100dvh`),
  **square outer corners**, no outer padding. `"W:H"` (e.g. `9:16`) = lock the
  frame to that ratio, centered with a dark letterbox around it. Parsed once in
  `config.ts` (`config.aspectRatio` via `parseAspect` in `src/lib/aspect.ts`),
  passed to `AppShell` as the `aspect` prop and read directly in login `page.tsx`;
  both apply `frameSize(aspect)` to the `frame` style. Inner cards keep their
  rounding. (This replaces the old rolled-back `DISPLAY_MODE`/`ASPECT_RATIO_*`
  experiment — a single clean `ASPECT_RATIO` env now.)
- **Scrolling (don't regress):** the bounded `frame` (`overflow:hidden`,
  `position:relative`) holds a **`position:absolute; inset:0`** scroll layer in
  `app-shell.tsx` — a DEFINITE height so the inner `ScrollBody` (`overflow-y:auto`)
  scrolls on mobile Safari too. Do NOT swap that back to a `flex:1`/`min-height:0`
  chain (nested-flex + overflow fails to scroll on iOS). The login `page.tsx` frame
  is itself the scroll container (`overflowY:auto`) with the card group centered via
  `margin:auto 0` — centers when it fits, scrolls when it doesn't (so the Continue
  button is always reachable on short screens).
- **Motion** lives in `globals.css`: fades + pushes only (`sc-anim-*`), a press
  scale on `button`/`a`, all under `prefers-reduced-motion`.
- **Page-switch loading bar** — a gradient `.sc-progress` element keyed by
  pathname in `app-shell.tsx` sweeps on every route change.
- Bottom nav **auto-hides on scroll-down**, returns on scroll-up.

## Data model (spec §7)

**Seeded world (never cleared on logout):** `profiles`, `posts`, `post_embeds`,
`comments`, `groups`.
**Mutable user layer (cleared on logout):** `session`, `bookmarks`,
`joined_groups`, `follows`, `search_usage`, `post_usage`, `llm_token_usage`.
Caps enforced server-side.
Follower & following counts are derived, never stored mutably.

## How to run

```bash
nvm use            # Node 22 (see .nvmrc); or any Node >=22 <23
cp .env.example .env   # already done for local dev; edit caps/keys as needed
npm install
npm run dev        # → http://localhost:3000
```

First run creates `./data/app.db` and loads the seed if missing.
`npm run db:reset` deletes the live DB so the next `npm run dev` re-initializes it.

### Selectable default data — seed template (SEED_DB_PATH)

`SEED_DB_PATH` (env) optionally points at a SQLite file used as the **default-seed
template**. On FIRST run (no `./data/app.db`), if it's set and valid, the live DB
is initialized by copying that template (its world becomes the seed) and the
mutable user layer is cleared so the session starts fresh. Empty/invalid → falls
back to `src/data/seed.json`. It only acts on first run — once `app.db` exists it
is never re-copied. `meta.seeded_from` records `template` vs `seed.json`.

- **Committed default (user 2026-06-19):** `SEED_DB_PATH=./data/enhanced-seed.db`
  in `.env`/`.env.example`. That template is the **large "enhanced" world** (110
  profiles, 20 groups, 234 posts incl. reposts, 551 comments, 66 corpus rows, 480
  memberships). Source of truth = `src/data/enhanced-seed.sql`; rebuild the `.db`
  with `npm run db:build-seed` (`scripts/build-enhanced-seed.mjs`: extracts
  SCHEMA_SQL from `schema.ts`, folds in `seed.json` lessons since the SQL omits
  them, then execs the SQL → single self-contained file). So **every `db:reset` +
  `dev` reseeds from the enhanced world.** Blank `SEED_DB_PATH` → tiny `seed.json`.
- Make a clean template from a running DB: `npm run db:template -- ./data/seed-template.db`
  (online backup → strips the mutable layer → checkpoints WAL → single file).
- Switch default data: set `SEED_DB_PATH`, then `npm run db:reset` + `npm run dev`.
- A committed `/data/*.db` template is NOT gitignored — default data can ship
  with the repo (its `-wal`/`-shm` sidecars are ignored). Implemented in
  `src/lib/db.ts` (`maybeCopyTemplate`), `scripts/db-template.mjs`.

## Build order & progress (spec §11 — pause after each step)

- [x] **1. Scaffold** Next.js + SQLite, running locally. Tokens centralized, env
      config, DB layer, persistence proven (boot counter survives restart).
- [x] **2. Schema (§7) + first-run seed (§8) + session model.**
      `src/lib/schema.ts` (DDL, idempotent, `session` cascades to mutable tables),
      `src/data/seed.json` (committed Bengali seed: 8 profiles, 18 posts [12 feed +
      6 group], 5 embeds, 10 comments, 5 groups, 7 lessons), `src/lib/seed.ts`,
      `src/lib/session.ts` (create/get/logout — single active session, no cookie),
      first-run init in `src/lib/db.ts`. `npm run db:reset` wipes the live db.
- [x] **3. Login → capture identity; prove persistence.** `src/lib/repo.ts`
      (all reads + the 4 allowed writes with server-side caps + derived counts §3),
      `src/app/actions.ts` (server actions), `src/app/page.tsx` (Login + a
      temporary persistence harness — REPLACED by real screens in Step 4).
      Verified end-to-end via the real server-action path: bookmark/follow/join
      survived a full server restart; follower count derived (seed+1); logout
      cascade clears the mutable layer while the world stays intact.
- [x] **4. Look/screens** from DESIGN.md + design-ref. Routed Next screens (each
      server-renders live DB data) inside a client phone-shell. Routes: `/` Login,
      `(app)/` group with `home`, `studycircle` (+`/groups`), `post/[id]`,
      `profile/[id]` (incl. `/me`), `group/[id]`, `explore`, `composer`,
      `lesson/[id]`, `bookmarks`. Shell = bottom nav + Home⇄StudyCircle radio
      toggle + sidebar + modal/toast layer (`src/components/app-shell.tsx`).
      Components: `post-card` (+CommentCard, clickable chips), `follow-button`,
      `group-card`, `screen-widgets` (tabs, reply bar, explore AI search, composer,
      meter chips), `icons`, `layout-bits`, `screen-chrome`. View-models in
      `src/lib/view.ts`; Bengali formatting in `src/lib/format.ts`.
      NOTE: much of Step 5's gating shipped here too (upsell on gated writes,
      join-confirm, bookmark-at-cap remove modal, dead-end modal, follower math) —
      Step 5 becomes verification + edge cases.
- [x] **5. Features + free-trial gating (§1)** incl. follower-count behavior (§3).
      Verified via a temporary self-test route (real repo code, synthetic session):
      bookmark/join/search caps fill→block→remove-reopens; join "no leaving";
      follow ±1 derived count; all 12 assertions pass. Caps proven env-configurable
      (BOOKMARK_CAP=3 → enforced). Gating airtight: ONLY auth + the 4 allowed-write
      server actions exist, so gated writes (comment/like/repost/quote/share/post)
      cannot persist — each routes to the upsell. Added bottom-nav auto-hide on
      scroll (§4).
- [x] **6. Explore search → LLM (§9)** (server-side; provider via LLM_PROVIDER).
      Dedicated `search_corpus` table (seeded world, denormalized post inputs;
      backfilled idempotently for pre-existing DBs in `db.ts`). `src/lib/llm.ts`
      ranks `LLM_CANDIDATE_ROWS` candidates via gemini/anthropic over fetch
      (Anthropic `/v1/messages`, x-api-key + anthropic-version 2023-06-01; default
      models `gemini-2.5-flash` / `claude-haiku-4-5`), with a keyword fallback when
      no key is set. Per-session token budget `LLM_SESSION_TOKEN_BUDGET` tracked in
      mutable `llm_token_usage` (cleared on logout) → exceeding it blocks search
      with an "AI tokens exhausted" toast. `searchAction` gates: weekly cap →
      token budget → rank → record tokens + search. Schema bumped to v2.
      `src/components/explore-client.tsx` owns the AI composer + results.
      Verified: relevant ranking, token accrual, exhaustion block, cap reset.
- [x] **7. Logout-reset (§3)** + re-verify persist-on-exit / reset-on-logout.
      Logout = `DELETE FROM session` (sidebar `form action={logoutAction}`) →
      ON DELETE CASCADE clears ALL mutable tables (bookmarks, joined_groups,
      follows, search_usage, llm_token_usage); seeded world untouched so derived
      follower counts revert automatically. No destructive ops on boot (restart
      preserves everything). Verified: full cascade clears 5/5 mutable tables,
      world byte-identical before/after, only the logged-out session row removed.
      **All 7 build-order steps complete.**

## Project layout

```
src/app/            App Router pages (page.tsx is the Step-1 health/status page)
src/app/globals.css imports tokens, base styles
src/styles/tokens.css   ← SINGLE source of design tokens (--ll-*)
src/lib/config.ts   env-derived config + publicCaps (caps for the UI)
src/lib/db.ts       better-sqlite3 connection (cached across hot-reloads)
src/lib/health.ts   Step-1 boot-counter persistence proof
data/app.db         live SQLite (gitignored)
design-ref/         design handoff bundle (gitignored, local reference)
```
