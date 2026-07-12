# Deployment Guide

Covers the three deployment paths for `@orivex/backend`: local Docker, local Docker Compose, and production on Render. All three use the same production Dockerfile (`apps/backend/Dockerfile`, Sprint 13) — nothing here changes the image itself.

Every command below runs from the **repository root**.

## Required environment variables

Defined and validated by `apps/backend/src/core/configuration/env.schema.ts` — the app refuses to boot if any required variable is missing or malformed. Documented with placeholder values in `.env.example`.

| Variable | Required | Actually used at runtime? |
|---|---|---|
| `NODE_ENV` | optional (default `development`) | — |
| `PORT` | optional (default `3000`) | Do **not** set manually on Render — it injects its own |
| `LOG_LEVEL` | optional (default `info`) | — |
| `CORS_ORIGINS` | **yes** | Yes — enforced on every request |
| `OTEL_ENABLED` | optional (default `false`) | Yes, but even when enabled no tracing SDK is wired up yet — a no-op |
| `DATABASE_URL` | **yes** | Yes — every request |
| `REDIS_URL` | optional | **No code path connects to Redis yet.** Not validated at boot; omit entirely if unused. |
| `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID` | optional | **Not called yet** — authentication is a documented, deferred future sprint. Not validated at boot; omit entirely if unused. |
| `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` | **yes** | Yes — AssetModule's upload-intent/confirm flow genuinely calls S3 |
| `S3_REGION` | optional (default `us-east-1`) | Yes |
| `S3_FORCE_PATH_STYLE` | optional (default `true`) | Yes |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Docker Compose only | Consumed only by `docker-compose.production.yml` to construct `DATABASE_URL` for the `postgres` service it starts; the app itself never reads these three directly |

`REDIS_URL`/`KEYCLOAK_*` are optional in `apps/backend/src/core/configuration/env.schema.ts` specifically because nothing in the codebase instantiates a client from them yet — restore them to required the moment either integration is actually wired up. `S3_*` must point to a real, reachable S3-compatible endpoint or every asset-upload request will fail.

## 1. Local Docker (single container, no orchestration)

Requires an already-reachable Postgres (and, for schema-validation purposes, a value for every other required variable above).

```bash
# Build
docker build -f apps/backend/Dockerfile -t orivex-backend:latest .

# Run (pointing DATABASE_URL at a Postgres reachable from the container --
# host.docker.internal works on Docker Desktop for a host-local Postgres)
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e LOG_LEVEL=info \
  -e CORS_ORIGINS=http://localhost:3000 \
  -e OTEL_ENABLED=false \
  -e DATABASE_URL=postgresql://orivex:orivex@host.docker.internal:5432/orivex \
  -e S3_ENDPOINT=http://host.docker.internal:9000 \
  -e S3_REGION=us-east-1 \
  -e S3_ACCESS_KEY_ID=orivex \
  -e S3_SECRET_ACCESS_KEY=orivex-dev-secret \
  -e S3_BUCKET=orivex-media-assets \
  -e S3_FORCE_PATH_STYLE=true \
  orivex-backend:latest
  # REDIS_URL / KEYCLOAK_* omitted -- optional, unused by any code path yet
```

**Startup:** the image's `docker-entrypoint.sh` runs `prisma migrate deploy` automatically before `node dist/main.js` starts — no separate migration step needed.

**Verify:**
```bash
curl http://localhost:3000/health/liveness
curl http://localhost:3000/health/readiness
```

## 2. Docker Compose (backend + Postgres + Redis together)

```bash
# One-time
cp .env.example .env
# edit .env with real values (or accept the committed dev defaults for a local trial)

# Build and start
docker compose -f infrastructure/docker/docker-compose.production.yml --env-file .env up -d --build

# Watch migrations + startup
docker compose -f infrastructure/docker/docker-compose.production.yml logs -f backend

# Verify
curl http://localhost:${PORT:-3000}/health/liveness
curl http://localhost:${PORT:-3000}/health/readiness

# Stop
docker compose -f infrastructure/docker/docker-compose.production.yml down
```

`docker-compose.production.yml` only orchestrates `backend` + `postgres` + `redis` (no Keycloak/MinIO/Mailpit — those are dev-only, see `docker-compose.yml`). It overrides `DATABASE_URL`/`REDIS_URL` to point at the compose network's own service names regardless of what's in `.env`.

**Migrations:** automatic on container start. To check status without starting the app:
```bash
docker compose -f infrastructure/docker/docker-compose.production.yml run --rm backend node_modules/.bin/prisma migrate status
```

## 3. Production: Render

`render.yaml` (repo root) is a Render Blueprint declaring two resources, both on Render's **free** plan: the `orivex-backend` Docker web service (built from `apps/backend/Dockerfile`, unchanged) and an `orivex-postgres` database. `orivex-postgres` is provisioned but **deliberately unused** — the real database is **Neon Postgres** (external), wired manually via `DATABASE_URL`, not via Render's `fromDatabase`.

### One-time setup

1. Push this repo to GitHub (Render deploys from a connected Git repo).
2. In the Render dashboard: **New +** → **Blueprint** → select this repo. Render reads `render.yaml` and provisions `orivex-postgres` (free, unused) and `orivex-backend` (free) together.
3. For every variable marked `sync: false` in `render.yaml`, open the `orivex-backend` service → **Environment** and set a real value:
   - `DATABASE_URL` — your real Neon connection string (from the Neon dashboard)
   - `CORS_ORIGINS` — your real frontend origin(s), comma-separated
   - `S3_ENDPOINT` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_BUCKET` / `S3_FORCE_PATH_STYLE` — **must be real and reachable** (AWS S3, DigitalOcean Spaces, or similar) since AssetModule's upload flow genuinely calls this
   - `REDIS_URL` / `KEYCLOAK_URL` / `KEYCLOAK_REALM` / `KEYCLOAK_CLIENT_ID` — optional; leave unset unless/until either integration is actually wired up
4. Do **not** add a `PORT` variable — Render injects its own for Docker web services, and the app already reads whatever `process.env.PORT` is set.

### Deploy

Render builds and deploys automatically on every push to the connected branch. `docker-entrypoint.sh` runs `prisma migrate deploy` before the app starts, exactly as in the other two paths — no separate Render migration job is needed for a single-instance deployment.

`healthCheckPath: /health/readiness` in `render.yaml` is what Render polls to decide when a new deploy is ready to receive traffic (Render's equivalent of a Kubernetes readiness gate) — this only returns 200 once Postgres is actually reachable, per Sprint 13's health-endpoint design.

### Verify

```bash
curl https://<your-service>.onrender.com/health/liveness
curl https://<your-service>.onrender.com/health/readiness
```

Check the Render dashboard's **Logs** tab for the `[docker-entrypoint]` migration lines and the `Orivex backend listening on port ...` line from `main.ts`.

### A scaling note for later

`prisma migrate deploy` runs in every container's entrypoint on every start. That's correct and safe for a single instance (this sprint's scope). If `orivex-backend` is ever scaled to multiple concurrent instances, migrations should be moved to a separate one-off Render Job run before the new instances start, to avoid every instance racing to apply the same migration simultaneously — a future operational change, not something this sprint's single-instance deployment needs.

## Known, pre-existing gaps unrelated to this sprint

Flagged in the Sprint 12 hardening report and unchanged here: no authentication/authorization layer exists yet, and the PSP/AI provider adapters are intentionally unconfigured (`NotConfigured*Adapter`) pending a vendor decision. Deploying now makes the backend reachable — it does not change what it can safely be used for.
