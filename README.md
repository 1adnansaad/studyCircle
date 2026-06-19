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

### 3. Docker (ready, not bundled)

The app is **Docker-ready** by design — all persistent state lives under `./data`,
all config is env-only, and Node is pinned — but no Dockerfile ships in the repo
yet. To containerize, drop in these two files and run `docker compose up`:

<details>
<summary><code>Dockerfile</code> (starting point)</summary>

```dockerfile
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# build tools for better-sqlite3's native module
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/src/data ./src/data
EXPOSE 3000
CMD ["npm", "run", "start"]
```
</details>

<details>
<summary><code>docker-compose.yml</code> (starting point)</summary>

```yaml
services:
  studycircle:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    environment:
      - DB_PATH=/app/data/app.db
    volumes:
      - ./data:/app/data        # persist the SQLite DB across restarts
```
</details>

Mount `./data` so the database survives container restarts, and pass config via
`env_file`/`environment`.

---

## Environment variables

Copy [`.env.example`](.env.example) to `.env` and edit. All variables are optional
— the defaults below produce a fully working demo. **Caps drive enforcement, the
on-screen meters, and the copy together** — change one and the UI text follows.

| Variable | Default | Accepted values | What it does |
|---|---|---|---|
| `PORT` | `3000` | integer | Port for `dev` / `start`. |
| `DB_PATH` | `./data/app.db` | filesystem path | Where the live SQLite database is stored. |
| `SEED_DB_PATH` | _(unset)_ | path to a `.db` file | Template SQLite DB used as the **default data on first run**. See [Default data & seeding](#default-data--seeding). Unset → seed from `src/data/seed.json`. |
| `LLM_PROVIDER` | `gemini` | `gemini` \| `anthropic` | Which provider powers Explore AI search (server-side only). |
| `GEMINI_API_KEY` | _(empty)_ | string | API key, used when `LLM_PROVIDER=gemini`. Empty → keyword fallback. |
| `ANTHROPIC_API_KEY` | _(empty)_ | string | API key, used when `LLM_PROVIDER=anthropic`. Empty → keyword fallback. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | model id | Override the Gemini model used for ranking. |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5` | model id | Override the Anthropic model used for ranking. |
| `LLM_CANDIDATE_ROWS` | `20` | integer ≥ 1 | How many rows of the `search_corpus` table are sent to the model per search. |
| `LLM_SESSION_TOKEN_BUDGET` | `20000` | integer ≥ 0 | Per-demo-session LLM token cap. Exceeding it blocks search with an "AI tokens exhausted" toast. Resets on logout. |
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
   started clean. This is how you **select different default data**.
2. **`src/data/seed.json`** — the committed default seed (real Bengali content),
   used when no template is configured.

`meta.seeded_from` records which path was used (`template` or `seed.json`). The
template only acts on first run — once `DB_PATH` exists it is never re-copied, so
it can't clobber a live session.

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
| `npm run db:template -- <destPath>` | Snapshot the current DB into a clean seed template (default dest `./data/seed-template.db`). |

---

## Theming / design tokens

All colors, typography, spacing, radius, and elevation live in **one file**:
[`src/styles/tokens.css`](src/styles/tokens.css) (CSS custom properties, `--ll-*`).
Edit a value, save, and it hot-reloads everywhere — components reference the tokens
and never hardcode a hex. This mirrors the `DESIGN.md` "Luminous Learning" system
(pink-lead hero, indigo-deep surfaces, Baloo Da 2 + Be Vietnam Pro).

---

## Display & motion

- **Full-bleed shell.** The app shell fills the viewport edge-to-edge
  (`width: 100%`, `height: 100dvh`) with **square outer corners** and no outer
  padding — only the *inner* cards keep their rounding. Defined by the `shell` /
  `frame` style objects in [`app-shell.tsx`](src/components/app-shell.tsx) and the
  login [`page.tsx`](src/app/page.tsx). (`100dvh` tracks the visible viewport so
  it fits around mobile browser chrome.)
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
    page.tsx            S1 Login (redirects to /home when logged in)
    actions.ts          server actions (auth + the allowed writes + search)
    globals.css         imports tokens, base styles
    (app)/              app routes behind the phone shell
      layout.tsx        AppShell (nav, toggle, sidebar, modals) + session guard
      home/             S2 Home (Shikho replica)
      studycircle/      S3 Feed + /groups  (S4)
      post/[id]/        S5 Post detail
      profile/[id]/     S6 Profile (+ /me)
      group/[id]/       S7 Group view
      explore/          S8 Explore (AI search)
      composer/         S9 Composer
      lesson/[id]/      S10 Lesson preview (the bridge to courses)
      bookmarks/        My Bookmarks
  components/           app-shell, post-card, explore-client, icons, …
  lib/
    config.ts           env-derived config (single source for caps/paths/LLM)
    db.ts               SQLite connection + first-run init (+ seed template)
    schema.ts           DDL (world tables + mutable user layer)
    seed.ts             seed.json loader + search-corpus backfill
    seed*.json          → src/data/seed.json (committed default seed source)
    repo.ts             reads + the four allowed writes + derived counts
    view.ts             server view-models for the screens
    llm.ts              server-side provider calls + keyword fallback
    format.ts           Bengali numerals / relative time / tags
data/                   live SQLite (gitignored); optional seed template
scripts/                db-reset.mjs, db-template.mjs
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
