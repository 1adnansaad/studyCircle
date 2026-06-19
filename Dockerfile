# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# StudyCircle — multi-stage build.
#   deps   → compile dependencies (better-sqlite3 is native: needs a C++ toolchain)
#   build  → next build, producing the self-contained .next/standalone server
#   runner → slim, non-root runtime image (no compilers, no source, no dev deps)
# Only the final `runner` stage ships. Earlier stages are discarded.
# ─────────────────────────────────────────────────────────────────────────────

# Pin Node to the version the app supports (package.json engines: >=22 <23).
# "bookworm-slim" = Debian 12, trimmed. We add only what we need.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# better-sqlite3 compiles a native .node binary from C++ during `npm ci`, so this
# stage needs python3 + make + g++. (The runtime stage will NOT have these.)
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
# Copy only the manifests first so this layer is cached unless deps change.
COPY package.json package-lock.json ./
# `npm ci` = clean, reproducible install from the lockfile. Compiles better-sqlite3.
RUN npm ci

# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app
# Reuse the already-compiled dependencies from the deps stage.
COPY --from=deps /app/node_modules ./node_modules
# Now bring in the source (the .dockerignore decides what's allowed in).
COPY . .
# The ONE build-time variable: NEXT_PUBLIC_* values are inlined into the JS bundle
# at build time, so changing this later needs a rebuild (--build-arg). Everything
# else is read at runtime. Default "png" matches the committed nav icons.
ARG NEXT_PUBLIC_NAV_ICON_EXT=png
ENV NEXT_PUBLIC_NAV_ICON_EXT=$NEXT_PUBLIC_NAV_ICON_EXT
# Produce the optimized build + .next/standalone (see output:"standalone").
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Next's standalone server must bind 0.0.0.0 to be reachable from outside the
# container (its default "localhost" only accepts in-container traffic).
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# In-container paths. Both live under env-driven config, so they're overridable
# at runtime — but these defaults make a plain `docker run` work out of the box.
#   DB_PATH      → the live DB, inside the mounted volume (persists).
#   SEED_DB_PATH → the seed template, OUTSIDE the volume so a mount can't shadow it.
ENV DB_PATH=/app/data/app.db
ENV SEED_DB_PATH=/app/seed/enhanced-seed.db

# Copy the self-contained server. The standalone folder includes its own trimmed
# node_modules (with the compiled better-sqlite3) and a server.js entrypoint.
COPY --from=build /app/.next/standalone ./
# Static assets and public/ are NOT included in standalone — copy them explicitly.
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# The seed template, placed OUTSIDE /app/data so the data volume never hides it.
COPY --from=build /app/data/enhanced-seed.db /app/seed/enhanced-seed.db

# Create the data dir and hand everything to the built-in non-root `node` user.
# Running as non-root is a basic security default for shipped images.
RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 3000
# Start the standalone server directly (no npm wrapper needed).
CMD ["node", "server.js"]
