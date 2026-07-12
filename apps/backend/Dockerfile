# Production image for @orivex/backend (Sprint 13 -- Production &
# Deployment). Build from the REPO ROOT so pnpm's workspace files
# (pnpm-workspace.yaml, pnpm-lock.yaml, root package.json) are in context:
#
#   docker build -f apps/backend/Dockerfile -t orivex-backend:latest .
#
# All stages share the same Debian base (not alpine) so the Prisma query
# engine binary generated in the build stage is guaranteed binary-compatible
# with the runtime stage -- the single most common Docker+Prisma footgun is
# mixing glibc (debian) and musl (alpine) between build and run.

ARG NODE_VERSION=20-bookworm-slim

# ---------------------------------------------------------------------------
# Stage 1: deps -- full install (dev+prod), needed to compile TypeScript.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json apps/backend/package.json

# --no-frozen-lockfile: pnpm-lock.yaml has not yet been regenerated in this
# environment to reflect apps/backend/package.json's dependency move
# (`prisma` -> dependencies, needed for `prisma migrate deploy` at startup).
# Run `pnpm install` once locally and commit the updated lockfile, then
# switch this to `--frozen-lockfile` for fully reproducible installs.
RUN pnpm install --no-frozen-lockfile --filter @orivex/backend...

# ---------------------------------------------------------------------------
# Stage 2: build -- generate the Prisma client and compile TypeScript.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /app
RUN corepack enable

COPY --from=deps /app /app
COPY apps/backend apps/backend

RUN pnpm --filter @orivex/backend run prisma:generate
RUN pnpm --filter @orivex/backend run build

# ---------------------------------------------------------------------------
# Stage 3: prod-deps -- production-only install (includes `prisma`, now a
# production dependency, so `prisma migrate deploy` works at container
# startup without devDependencies bloating the runtime image).
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/backend/prisma apps/backend/prisma

RUN pnpm install --no-frozen-lockfile --prod --filter @orivex/backend...
# Explicit, not relying on @prisma/client's postinstall auto-generate hook:
# its schema auto-detection is relative to the invoking directory, which is
# ambiguous inside a pnpm workspace root. Regenerating here guarantees the
# query engine binary matches this exact stage's node_modules layout.
RUN pnpm --filter @orivex/backend run prisma:generate

# ---------------------------------------------------------------------------
# Stage 4: runtime -- small image, non-root user, only what's needed to run.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/backend

# openssl: required by the Prisma query engine at runtime.
# dumb-init: a minimal PID-1 init so SIGTERM is forwarded correctly to Node
# (and zombie processes are reaped) -- graceful shutdown depends on the
# signal actually reaching main.ts's app.enableShutdownHooks() handler.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl dumb-init \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 orivex \
  && useradd --system --uid 1001 --gid orivex --home-dir /app --shell /usr/sbin/nologin orivex

COPY --from=prod-deps --chown=orivex:orivex /app /app
COPY --from=build --chown=orivex:orivex /app/apps/backend/dist /app/apps/backend/dist
COPY --chown=orivex:orivex apps/backend/docker-entrypoint.sh /app/apps/backend/docker-entrypoint.sh
COPY --chown=orivex:orivex apps/backend/healthcheck.js /app/apps/backend/healthcheck.js
RUN chmod +x /app/apps/backend/docker-entrypoint.sh

USER orivex

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "healthcheck.js"]

ENTRYPOINT ["dumb-init", "--", "/app/apps/backend/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
