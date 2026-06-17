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
  - Caps: `BOOKMARK_CAP` (5), `JOIN_GROUP_CAP` (2), `SEARCH_WEEKLY_CAP` (7) — drive
    enforcement, meters, AND copy. `FOLLOW_CAP` optional (follow is uncapped).
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
  শিখো AI, embed CTA, **Bengali numerals ০–৯**, ৳). New **StudyCircle strings are
  English** (Feed, Groups, Bookmark, Search, Follow, gates/empties/modals).
  *(The prototype went all-English + Latin numerals — do NOT follow that.)*
- **Gated writes (§1):** Comment, Reply, Like, Repost, Quote, **Share**, and the
  terminal **Post** are all **gated → upsell, no state change**.
  *(The prototype made posting metered-7/week and Share free — do NOT follow that.)*
- **Allowed writes** (work + persist): **Bookmark** (≤cap), **Join group** (≤cap, no
  leaving), **Search** (≤cap/week), **Follow/Unfollow** (uncapped).
- **Follower count is derived, never mutated in place (§3):**
  `displayed = follower_count_seed + (1 if session follows else 0)`.
- **Logout is the only reset (§3):** clears the session's mutable layer; never
  touches the seeded world. Exit/close/restart resets nothing.

Visuals to keep from the prototype: phone frame (390×812), the lavender wash, the
5-item bottom nav with the **Home⇄StudyCircle two-position radio toggle** (house +
book icons, active side filled, centered between Study and Inbox), NameCard with
no photo + clickable @user_tag/class/rank/privacy chips, ShikhoEmbed deep-indigo
card, the AI-composer Explore search, bottom-sheet modals.

## Data model (spec §7)

**Seeded world (never cleared on logout):** `profiles`, `posts`, `post_embeds`,
`comments`, `groups`.
**Mutable user layer (cleared on logout):** `session`, `bookmarks`,
`joined_groups`, `follows`, `search_usage`. Caps enforced server-side.
Follower & following counts are derived, never stored mutably.

## How to run

```bash
nvm use            # Node 22 (see .nvmrc); or any Node >=22 <23
cp .env.example .env   # already done for local dev; edit caps/keys as needed
npm install
npm run dev        # → http://localhost:3000
```

First run creates `./data/app.db` and (from Step 2 on) loads the seed if missing.
`npm run db:reset` will rebuild the DB from seed (script added in Step 2).

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
- [ ] **4. Look/screens** from DESIGN.md + design-ref.
- [ ] **5. Features + free-trial gating (§1)** incl. follower-count behavior (§3).
- [ ] **6. Explore search → LLM (§9)** (server-side; provider via LLM_PROVIDER).
- [ ] **7. Logout-reset (§3)** + re-verify persist-on-exit / reset-on-logout.

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
