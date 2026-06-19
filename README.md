# StudyCircle

A working demo of **StudyCircle** — a social feature inside the **Shikho** app
(Bangla edtech, Class 6–12). At login the demo identity picks a tier — a
**brand-new user on a free trial** (reads free, a few writes metered, the rest
open a subscribe upsell) or a **Premium** user (every cap bypassed).

- **Mobile-first web app** (Next.js App Router + SQLite). No native app / APK.
- **Free / Premium tiers** chosen at login — Premium bypasses every cap and the
  meters read **"Unlimited ✦"**.
- **Real persistence** — bookmarks, joined groups, follows, search usage, AI token
  usage, and user-authored posts/comments survive a server restart and a browser
  close.
- **Logout is the only reset.** Exit/close/restart resets nothing.
- **Server-side AI Explore search** with a pluggable provider (Gemini / Anthropic),
  plus a Premium **AI "Trending now"** topic summarizer.
- **Everything configurable via env** — free-trial caps, LLM provider/models,
  token budget, and even the default seed data.

> Language: existing Shikho chrome is **Bengali** (পদ্ধতি / ইনবক্স / শিখো AI, ৳,
> Bengali numerals); the new StudyCircle UI strings are **English**.

---

## Table of contents

- [Quick start](#quick-start)
- [Prerequisites](#prerequisites)
- [Launch modes](#launch-modes)
- [Environment variables](#environment-variables)
- [Default data & seeding](#default-data--seeding)
- [AI Explore search (LLM)](#ai-explore-search-llm)
- [Free-trial model](#free-trial-model)
- [npm scripts](#npm-scripts)
- [Theming / design tokens](#theming--design-tokens)
- [Display & motion](#display--motion)
- [Project structure](#project-structure)
- [Data model & persistence](#data-model--persistence)
- [Troubleshooting](#troubleshooting)

---

## Quick start

```bash
nvm use            # Node 22 (see .nvmrc); or any Node >=22 <23
cp .env.example .env   # configure (works as-is for local dev)
npm install
npm run dev        # → http://localhost:3000
```

First run creates `./data/app.db` and loads the seed data automatically. Open the
URL, log in with any name + class and pick a tier (**Free** trial or **Premium**),
and explore. **Log out** to reset the session back to a clean slate.

No API key is required to try it — Explore search falls back to keyword matching
when no LLM key is configured.

---

## Prerequisites

- **Node.js `>=22 <23`** (pinned in `.nvmrc` and `package.json` → `engines`).
- A C toolchain for the native `better-sqlite3` build. On macOS this is the Xcode
  Command Line Tools (`xcode-select --install`); most installs use a prebuilt
  binary and need nothing extra.
- No external services required. An LLM API key is **optional** (see
  [AI Explore search](#ai-explore-search-llm)).

---

## Launch modes

### 1. Development (default)

Hot-reloading dev server. Use this for local work — editing
[`src/styles/tokens.css`](src/styles/tokens.css) or any component reflows live.

```bash
npm run dev          # → http://localhost:3000
PORT=4000 npm run dev   # custom port
```

### 2. Production

Optimized build, then serve it. Same machine, no Docker.

```bash
npm run build        # compile
npm run start        # serve the build → http://localhost:3000
PORT=8080 npm run start
```

### 3. Run with Docker

You only need [Docker](https://docs.docker.com/get-docker/) installed — no Node, no
`npm install`. Works the same on macOS, Linux, and Windows.

**One-time setup** — make your own editable runtime env file:

```bash
cp .env.docker.example .env.docker     # then edit .env.docker if you like
```

**Build the image** (compiles the native `better-sqlite3` + runs `next build`; takes
a few minutes the first time, then it's cached):

```bash
docker build -t studycircle .
```

**Run it:**

```bash
docker run --rm \
  -p 3000:3000 \
  --env-file .env.docker \
  -v studycircle-data:/app/data \
  --name studycircle \
  studycircle
```

Open **http://localhost:3000**. Stop with `Ctrl-C` (or `docker stop studycircle`).

What each flag does:

| Flag | Meaning |
|---|---|
| `-p 3000:3000` | Map **host** port → **container** port. Left number is the one you open in the browser. |
| `--env-file .env.docker` | Inject your runtime config. **This is how you control the app's behavior on each run.** |
| `-v studycircle-data:/app/data` | A named **volume** holding the SQLite DB, so data survives restarts. |
| `--rm` | Remove the *container* when it stops. Safe — your data lives in the volume, not the container. |

#### Prefer one command? Use Compose

[`docker-compose.yml`](docker-compose.yml) bundles the same port, volume, and env-file:

```bash
docker compose up --build      # build (if needed) + run
docker compose down            # stop (keeps the data volume)
docker compose down -v         # stop AND wipe the data volume (fresh seed next run)
```

#### Setting environment variables — restart vs. rebuild

Almost every variable (see the [table below](#environment-variables)) is read at
**runtime**, so changing the app is a fast loop — **no rebuild**:

```bash
# 1. edit .env.docker  (e.g. set BOOKMARK_CAP=3, add an API key, flip AI_DEBUG=1)
# 2. recreate the container so it re-reads the file:
docker rm -f studycircle
docker run --rm -p 3000:3000 --env-file .env.docker \
  -v studycircle-data:/app/data --name studycircle studycircle
# (with Compose: `docker compose up -d` recreates it for you)
```

> ⚠️ `docker restart` reuses the container's *original* env — it will **not** pick up
> an edited `.env.docker`. Recreate the container (`rm` + `run`, or `compose up`) to
> apply env changes.

The **one** exception is `NEXT_PUBLIC_NAV_ICON_EXT` (the logo file extension). Anything
named `NEXT_PUBLIC_*` is baked into the JavaScript at **build** time, so changing it
needs a **rebuild**, not just a restart:

```bash
docker build --build-arg NEXT_PUBLIC_NAV_ICON_EXT=svg -t studycircle .
```

#### Secrets

API keys (`GEMINI_API_KEY` / `ANTHROPIC_API_KEY`) go **only** in your local
`.env.docker` and reach the container through `--env-file`. They are never baked into
the image and never committed — `.env.docker` is gitignored; only the key-less
`.env.docker.example` is in the repo. The app runs fine without any key (Explore falls
back to keyword search + demo trending topics).

#### Where the data lives & how seeding works

- The live database is the named volume **`studycircle-data`** (mounted at `/app/data`).
  Inspect it with `docker volume inspect studycircle-data`; delete it with
  `docker volume rm studycircle-data` (or `docker compose down -v`) for a clean slate.
- The seed **template** (`enhanced-seed.db`) is baked into the image at `/app/seed`,
  **outside** the volume — so the volume can't shadow it. On first run it's copied into
  the empty volume, giving the full enhanced world (110 profiles, 20 groups, 234 posts).
  On later runs the existing `app.db` is kept untouched.
- `DB_PATH` and `SEED_DB_PATH` are preset correctly inside the image, which is why
  they're intentionally **absent** from `.env.docker.example` — leave them alone.

---

## Environment variables

Copy [`.env.example`](.env.example) to `.env` and edit. All variables are optional
— the defaults below produce a fully working demo. **Caps drive enforcement, the
on-screen meters, and the copy together** — change one and the UI text follows.

| Variable | Default | Accepted values | What it does |
|---|---|---|---|
| `PORT` | `3000` | integer | Port for `dev` / `start`. |
| `ASPECT_RATIO` | `device` | `device` \| `W:H` | App-frame shape. `device` = full-bleed (fills the viewport). `W:H` (e.g. `9:16`, `3:4`) locks the frame to that ratio, centered with a letterbox. Invalid values fall back to `device`. |
| `FONT_DISPLAY` | `Baloo Da 2` | Google family **or** local file | Headline + Bengali font. Google name (`Poppins`, `Poppins:wght@400;700`) or a local file under `public/` (`/fonts/MyFont.ttf`). |
| `FONT_BODY` | `Be Vietnam Pro` | Google family **or** local file | Body / Latin-text font. |
| `FONT_BENGALI` | _(= `FONT_DISPLAY`)_ | Google family **or** local file | Optional separate Bengali font — keep it Bengali-capable (e.g. `Hind Siliguri`). |
| `DB_PATH` | `./data/app.db` | filesystem path | Where the live SQLite database is stored. |
| `SEED_DB_PATH` | `./data/enhanced-seed.db` | path to a `.db` file | Template SQLite DB used as the **default data on first run**. Ships pointing at the large enhanced dataset (rebuild via `npm run db:build-seed`). See [Default data & seeding](#default-data--seeding). Blank → seed from the small `src/data/seed.json`. |
| `LLM_PROVIDER` | `gemini` | `gemini` \| `anthropic` | Which provider powers Explore AI search (server-side only). |
| `GEMINI_API_KEY` | _(empty)_ | string | API key, used when `LLM_PROVIDER=gemini`. Empty → keyword fallback. |
| `ANTHROPIC_API_KEY` | _(empty)_ | string | API key, used when `LLM_PROVIDER=anthropic`. Empty → keyword fallback. |
| `LLM_MODEL` | _(unset)_ | model id | **Single knob to pick the model** for whichever provider is active (e.g. `gemini-2.5-pro`, `claude-sonnet-4-6`). Overrides the two below. Unset → provider default. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | model id | Per-provider Gemini model (used only if `LLM_MODEL` is blank). |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5` | model id | Per-provider Anthropic model (used only if `LLM_MODEL` is blank). |
| `LLM_CANDIDATE_ROWS` | `20` | integer ≥ 1 | How many `search_corpus` rows (newest first) are sent to the model per search. The corpus now covers **every** seeded post — raise this to let the model rank more of them per query. |
| `LLM_SESSION_TOKEN_BUDGET` | `20000` | integer ≥ 0 | Per-demo-session LLM token cap. Exceeding it blocks search with an "AI tokens exhausted" toast. Resets on logout. |
| `AI_DEBUG` | `false` | `1`/`true`/`on` | When on, AI search and "Trending now" show a **popup with the step-by-step log** of the AI call (provider, key present?, HTTP status, error body, parse result, fallback reason) so you can see why an AI call failed. Never logs the API key. |
| `BOOKMARK_CAP` | `5` | integer ≥ 1 | Max bookmarks on the free trial. |
| `JOIN_GROUP_CAP` | `2` | integer ≥ 1 | Max joined groups (no leaving once joined). |
| `SEARCH_WEEKLY_CAP` | `7` | integer ≥ 1 | Max Explore searches per week. |
| `POST_WEEKLY_CAP` | `5` | integer ≥ 1 | Shared weekly write budget — post / comment / reply / repost all draw from it. Monotonic (un-reposting never refunds). |
| `FOLLOW_CAP` | _(unset)_ | integer ≥ 1 | Optional cap on follows. Unset → following is uncapped. |

Tier is **not** an env variable — it is chosen per login (Free / Premium), and
Premium bypasses all of the caps above.

Notes:
- **Secrets never reach the browser.** LLM keys are read server-side only.
- Invalid numeric values fall back to the default rather than crashing.
- `.env` is gitignored. Commit `.env.example` (no secrets) as the reference.

---

## Default data & seeding

On the **first run** (when `DB_PATH` does not yet exist), StudyCircle creates the
schema and fills the seeded "world" (profiles, posts, comments, groups, lessons,
search corpus). There are two sources, in priority order:

1. **Seed template DB** — if `SEED_DB_PATH` points to a valid SQLite file, its
   contents are copied in as the starting database, and the mutable user layer is
   started clean. **This is the default path** — the repo ships with
   `SEED_DB_PATH=./data/enhanced-seed.db`, the large **enhanced** dataset (110
   profiles, 20 groups, 234 posts incl. reposts, 551 comments, 480 group
   memberships, and a `search_corpus` row for **every** post). Its source of truth
   is [`src/data/enhanced-seed.sql`](src/data/enhanced-seed.sql) — edit that and run
   `npm run db:build-seed` to regenerate the `.db` (schema is pulled from
   `src/lib/schema.ts`; lessons are folded in from `seed.json`; the corpus is
   completed to cover all posts).
2. **`src/data/seed.json`** — the small committed fallback seed, used when
   `SEED_DB_PATH` is blank/invalid.

`meta.seeded_from` records which path was used (`template` or `seed.json`). The
template only acts on first run — once `DB_PATH` exists it is never re-copied, so
it can't clobber a live session.

**To reseed with the enhanced default after a change:** `npm run db:build-seed`
(only if you edited the SQL) → `npm run db:reset` → `npm run dev`.

### Make sure the app is running the DB you intend (read this first)

> ⚠️ **The #1 gotcha:** seeding only runs on a **first run** — i.e. when the
> `DB_PATH` file (default `./data/app.db`) **does not exist**. If that file already
> exists, the app loads it **as-is and ignores `SEED_DB_PATH` completely**. So
> editing seed config on a machine that has already run the app changes **nothing**
> until you delete the live DB with `npm run db:reset`.

Pick the row that matches what you want, set `SEED_DB_PATH` in `.env` accordingly,
then run the commands:

| You want… | `SEED_DB_PATH` in `.env` | Commands |
|---|---|---|
| The committed default content (`src/data/seed.json`) | **unset / blank** | `npm run db:reset && npm run dev` |
| A specific seed template (e.g. `./data/enhanced-seed.db`) | set to that `.db` path | `npm run db:reset && npm run dev` |
| Keep the current live data (no reseed) | _(anything — it's ignored)_ | just `npm run dev` |

Step by step to (re)seed from scratch:

1. **Set or clear `SEED_DB_PATH` in `.env`.**
   - Use a template → `SEED_DB_PATH=./data/enhanced-seed.db`. It must be a **valid
     SQLite file**; a missing/invalid/blank path silently falls back to
     `src/data/seed.json` (the app never crashes over this).
   - Use the committed JSON seed → leave the line blank or delete it.
2. **Delete the live DB so the next launch counts as a first run:**
   ```bash
   npm run db:reset      # deletes DB_PATH and its -wal / -shm sidecars
   ```
3. **Launch** — on boot it recreates the schema and loads the chosen source:
   ```bash
   npm run dev
   ```
4. **Verify which source actually loaded** (don't guess):
   - Watch the dev log: copying a template prints
     `[db] initialized from seed template: <path>`.
   - Or read the recorded marker straight from the DB:
     ```bash
     node -e "console.log(require('better-sqlite3')(process.env.DB_PATH||'./data/app.db').prepare(\"SELECT value FROM meta WHERE key='seeded_from'\").get())"
     # → { value: 'template' }   (came from SEED_DB_PATH)
     # → { value: 'seed.json' }  (came from the committed seed)
     ```

If step 4 doesn't match what you expected, you almost certainly skipped
`npm run db:reset` (the old `app.db` is still in place) or `SEED_DB_PATH` points at
a file that isn't a valid SQLite DB (so it fell back to `seed.json`).

### Create a seed template

Snapshot any running database into a clean, single-file template (online backup;
safe while `npm run dev` is running). It strips the mutable user layer and
checkpoints the WAL:

```bash
npm run db:template -- ./data/seed-template.db
```

### Switch the default data

```bash
# 1. set SEED_DB_PATH in .env, e.g.  SEED_DB_PATH=./data/seed-template.db
# 2. reset the live DB and relaunch
npm run db:reset
npm run dev
```

A committed `/data/seed-template.db` is intentionally **not** gitignored, so a
chosen default dataset can travel with the repo (its `-wal` / `-shm` sidecars are
ignored).

### Rebuild from scratch

```bash
npm run db:reset     # deletes the live DB (honors DB_PATH)
npm run dev          # recreates schema + reseeds (template or seed.json)
```

---

## AI Explore search (LLM)

The Explore screen's search is a server-side call: it pulls candidate posts from
the dedicated `search_corpus` table and asks the model to rank the relevant ones,
which render as post cards.

- **Provider:** set `LLM_PROVIDER` to `gemini` (default) or `anthropic`, and put
  the matching key in `GEMINI_API_KEY` / `ANTHROPIC_API_KEY`.
- **Models:** default to `gemini-2.5-flash` / `claude-haiku-4-5`; override with
  `GEMINI_MODEL` / `ANTHROPIC_MODEL`.
- **No key? Still works.** With no key configured (or on any API error), search
  falls back to deterministic **keyword ranking**, so the demo never breaks.
- **Candidate rows:** `LLM_CANDIDATE_ROWS` controls how many corpus rows the model
  receives per query.
- **Token budget:** `LLM_SESSION_TOKEN_BUDGET` caps cumulative LLM tokens per demo
  session. Once exceeded, search is blocked with an "AI tokens exhausted" toast
  until logout. Lower it (e.g. `500`) to demo the limit quickly.
- **Search frequency:** also gated by `SEARCH_WEEKLY_CAP` (the weekly meter).
- **Premium "Trending now":** Premium users get an AI card that clusters the post
  corpus into ≤5 topics (tapping one opens its posts). Free users see the locked
  promo instead. With no key / on failure it falls back to subject-grouped demo
  topics. This card is independent of the weekly-search counter.
- **Debugging AI calls:** set `AI_DEBUG=1` — every AI search and trending-summary
  then opens a popup with the full step log (provider, `key present/missing`, HTTP
  status, error body, parse result, why it fell back). The API key is never logged.
  This is the fastest way to see *why* a search returned "keyword fallback".

```bash
# example: use Anthropic
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-haiku-4-5   # optional override
```

---

## Free-trial model

One rule for the **Free** tier: **affordances visible, reads free, writes gated —
except the metered allowed writes.** A **Premium** login bypasses every cap (meters
render "Unlimited ✦").

| Bucket | Actions | Behavior (Free tier) |
|---|---|---|
| **Reads** | Browse feed, groups, search, post threads, profiles | Always free |
| **Allowed writes** | **Bookmark** (≤ `BOOKMARK_CAP`) · **Join group** (≤ `JOIN_GROUP_CAP`, no leaving) · **Search** (≤ `SEARCH_WEEKLY_CAP`/week) · **Follow / Unfollow** (uncapped) | Work and persist; show quota; block at cap |
| **Metered writes** | **Post · Comment · Reply · Repost** — one shared weekly budget (≤ `POST_WEEKLY_CAP`) | Work and persist **real content**; consume one each; monotonic; route to upsell at cap |
| **Gated writes** | **Like** (and group "Post in group") | Open the subscribe upsell; no state change |
| **Free affordance** | **Share** (external) | Copies a link + toast; no gate, no persistence |

User-authored posts/comments are **real** — they live in the same tables as the
seeded content (with the session id), appear at the top of the feed and on your
profile, are fully interactable, and are cleared on logout via the session cascade.

Differences for **Premium**: caps are bypassed; **Like** becomes a local toggle
(heart turns red, "Liked." toast — seed-only, not persisted); the Explore
**"Trending now"** card runs the AI topic summarizer instead of showing the locked
promo; lesson embeds drop the "৩ দিন ফ্রি" trial framing. The **Quote** button has
been removed from the post card (Repost remains).

Following someone increments that profile's displayed follower count by 1
(unfollowing decrements it) — the count is **derived**, never stored, so it
reverts automatically on logout.

---

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server (hot reload). |
| `npm run build` | Create an optimized production build. |
| `npm run start` | Serve the production build (run `build` first). |
| `npm run lint` | Run Next.js lint (ESLint config is not set up; may prompt on first run). |
| `npm run db:reset` | Delete the live SQLite DB (honors `DB_PATH`) so the next `dev` reseeds. |
| `npm run db:build-seed` | (Re)build the committed default template `./data/enhanced-seed.db` from `src/data/enhanced-seed.sql` (schema + lessons + the enhanced world). |
| `npm run db:template -- <destPath>` | Snapshot the current DB into a clean seed template (default dest `./data/seed-template.db`). |

---

## Theming / design tokens

All colors, typography, spacing, radius, and elevation live in **one file**:
[`src/styles/tokens.css`](src/styles/tokens.css) (CSS custom properties, `--ll-*`).
Edit a value, save, and it hot-reloads everywhere — components reference the tokens
and never hardcode a hex. This mirrors the `DESIGN.md` "Luminous Learning" system
(pink-lead hero, indigo-deep surfaces, Baloo Da 2 + Be Vietnam Pro).

### Fonts (env-selectable)

Pick the typefaces with env vars — no code edits. Each value is **either a Google
Fonts family or a local font file**, applied at runtime; they override the
`--ll-font-*` tokens everywhere.

| Var | Controls | Default |
|---|---|---|
| `FONT_DISPLAY` | headlines + Bengali | `Baloo Da 2` |
| `FONT_BODY` | body / Latin text | `Be Vietnam Pro` |
| `FONT_BENGALI` | Bengali only (optional) | falls back to `FONT_DISPLAY` |

**Google Fonts** — give a family name (these are fetched from Google, *not* system
fonts):

```bash
# .env — restart `npm run dev` after changing (env is read at boot)
FONT_DISPLAY=Poppins
FONT_BODY=Inter
FONT_BENGALI=Hind Siliguri   # keep a Bengali-capable face for Bangla text
```

A **bare name** (`Poppins`) requests a standard weight set (`400;500;600;700;800`);
pass a **full spec** (`Poppins:wght@300;700`) for exact weights. Spaces are fine
(`FONT_DISPLAY=Baloo Da 2`).

**Local font file** — drop a `.ttf`/`.otf`/`.woff`/`.woff2` into
[`public/fonts/`](public/fonts/) and point the var at its public path (Next serves
`public/` at the site root):

```bash
FONT_DISPLAY=/fonts/MyHeadline.ttf
FONT_BODY=Inter                      # mixing local + Google is fine
```

The family name is derived from the filename and bold weights are **synthesized**,
so a single regular file works; use a **variable** font for true multi-weight. You
can mix and match per slot.

Notes:
- If a chosen font lacks a glyph or fails to load, text falls back to
  `Hind Siliguri` (Bengali) / `system-ui`, so nothing disappears.
- Mechanism: [`src/lib/fonts.ts`](src/lib/fonts.ts) classifies each value (Google
  family vs local file) and builds the Google `<link>` URL, any `@font-face`
  rules, and the token overrides; the root [`layout.tsx`](src/app/layout.tsx)
  injects the `<link>` / `<style>` and sets the `--ll-font-*` vars inline on
  `<html>`.

---

## Display & motion

- **Shell aspect ratio (`ASPECT_RATIO`).** Default `device` = full-bleed: the shell
  fills the viewport edge-to-edge (`width: 100%`, `height: 100dvh`) with **square
  outer corners** and no outer padding — only the *inner* cards keep their rounding.
  Set `ASPECT_RATIO=W:H` (e.g. `9:16`) to lock the frame to a fixed ratio, centered
  with a dark letterbox. Parsed in [`src/lib/aspect.ts`](src/lib/aspect.ts) and
  applied by the `frame` style in [`app-shell.tsx`](src/components/app-shell.tsx)
  and the login [`page.tsx`](src/app/page.tsx). (`100dvh` tracks the visible
  viewport so it fits around mobile browser chrome.)
- **Motion is centralized** in [`globals.css`](src/app/globals.css) — only fades
  and pushes (`sc-anim-*` keyframes), short durations, and a tactile press-scale
  on every `button`/`a`. All of it respects `prefers-reduced-motion`.
- **Page-switch loading bar.** A gradient (indigo→pink) bar sweeps across the top
  of the shell on every route change — a keyed `.sc-progress` element in
  `app-shell.tsx` that replays whenever the path changes.
- The bottom nav auto-hides on scroll-down and returns on scroll-up.

---

## Project structure

```
src/
  app/
    layout.tsx          root layout (fonts, globals.css)
    page.tsx            S1 Login + tier choice (redirects to /home when logged in)
    actions.ts          server actions (auth + allowed/metered writes + search)
    globals.css         imports tokens, base styles + motion keyframes
    (app)/              app routes behind the phone shell
      layout.tsx        AppShell (nav, toggle, sidebar, modals) + session guard
      home/             S2 Home (Shikho replica)
      studycircle/      S3 Feed + /groups  (S4)
      post/[id]/        S5 Post detail
      profile/[id]/     S6 Profile (+ /me)
      group/[id]/       S7 Group view
      explore/          S8 Explore (AI search + Premium trending)
      composer/         S9 Composer
      lesson/[id]/      S10 Lesson preview (the bridge to courses)
      bookmarks/        My Bookmarks
  components/
    app-shell.tsx       nav, Home⇄StudyCircle toggle, sidebar, modal/toast layer
    tier-choice.tsx     Free / Premium login control
    post-card.tsx       PostCard (+ CommentCard, like/repost, clickable chips)
    explore-client.tsx  AI composer + search results + trending card
    follow-button.tsx   follow / unfollow (derived count)
    group-card.tsx      group list/detail card + join confirm
    screen-widgets.tsx  tabs, reply bar, composer, meter chips
    screen-chrome.tsx   shared screen headers / scaffolding
    layout-bits.tsx     small layout primitives
    icons.tsx           icon set
  lib/
    config.ts           env-derived config (single source for caps/paths/LLM)
    db.ts               SQLite connection + first-run init (+ seed template)
    schema.ts           DDL (world tables + mutable user layer)
    session.ts          create / get / logout (single active session, tier)
    seed.ts             seed.json loader + search-corpus backfill
    repo.ts             reads + allowed/metered writes + derived counts + tier
    view.ts             server view-models for the screens
    llm.ts              server-side provider calls (rank + trending) + fallback
    format.ts           Bengali numerals / relative time / tags
    health.ts           Step-1 boot-counter persistence proof
  data/
    seed.json           committed default seed source (Bengali content)
data/                   live SQLite (gitignored); committed enhanced-seed.db template
scripts/                db-reset.mjs, db-template.mjs, build-enhanced-seed.mjs
next.config.mjs         Next config (output:"standalone" for a small Docker image)
Dockerfile              multi-stage build (compile → next build → slim non-root runtime)
.dockerignore           keeps node_modules / .env / live DB out of the image
docker-compose.yml      one-command run + named data volume
.env.docker.example     runtime env template for containers (copy → .env.docker)
```

---

## Data model & persistence

Two layers in SQLite:

- **Seeded world** (never cleared on logout): `profiles`, `posts`, `post_embeds`,
  `comments`, `groups`, `lessons`, `profile_groups`, `search_corpus`.
- **Mutable user layer** (cleared on logout): `session` (carries the chosen Free /
  Premium tier), `bookmarks`, `joined_groups`, `follows`, `search_usage`,
  `post_usage`, `llm_token_usage`, plus user-authored rows in `posts` / `comments`
  (tagged with `session_id`).

The mutable tables reference `session(id) ON DELETE CASCADE`, so **logout** is a
single `DELETE FROM session` that cascades the rest away. The seeded world is
untouched, and derived follower/following counts revert to seed automatically.

Persistence rule: **persist on exit, reset on logout.** A single active demo
session is supported (no multi-user); reopening the browser restores it.

---

## Troubleshooting

- **`better-sqlite3` failed to build / load** — ensure Node is `>=22 <23`
  (`node -v`) and a C toolchain is present (`xcode-select --install` on macOS),
  then `rm -rf node_modules && npm install`.
- **Stale or broken data** — `npm run db:reset` then `npm run dev` to rebuild from
  the configured seed.
- **Explore search returns "keyword fallback"** — no LLM key is set (or the call
  failed). Add `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` matching `LLM_PROVIDER`.
- **"AI tokens exhausted" toast** — the session hit `LLM_SESSION_TOKEN_BUDGET`.
  Log out to reset, or raise the budget in `.env`.
- **Changed a cap in `.env` but the UI didn't update** — restart the server; env
  is read at boot.
- **Port already in use** — set `PORT` (e.g. `PORT=4000 npm run dev`).
