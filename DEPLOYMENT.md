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
| `OTEL_ENABLED` | optional (default `false`) | Yes — boots a real OpenTelemetry NodeSDK exporting to `OTEL_EXPORTER_OTLP_ENDPOINT` (see `docs/15-observability.md`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | required if `OTEL_ENABLED=true` | Yes — where spans are exported to |
| `SENTRY_DSN` | optional | Yes, if set — enables error reporting for 5xx failures (see `docs/15-observability.md`) |
| `SENTRY_TRACES_SAMPLE_RATE` | optional (default `0.1`) | Yes, if `SENTRY_DSN` is set |
| `OPENAPI_ENABLED` | optional (default `false`) | Only if you want `GET /docs` (Swagger UI) reachable in production — it's always on outside production regardless of this flag |
| `DATABASE_URL` | **yes** | Yes — every request |
| `REDIS_URL` | optional | **No code path connects to Redis yet.** Not validated at boot; omit entirely if unused. |
| `JWT_ACCESS_SECRET` | **yes** (min 32 chars) | Yes — AuthenticationModule signs/verifies every access token with it |
| `JWT_ACCESS_TTL_SECONDS` | optional (default `900`) | Yes |
| `ARGON2_MEMORY_COST_KIB`, `ARGON2_TIME_COST`, `ARGON2_PARALLELISM` | optional (OWASP-recommended defaults) | Yes, if set — tunes argon2id password-hashing cost |
| `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` | **yes** | Yes — AssetModule's upload-intent/confirm flow genuinely calls S3 |
| `S3_REGION` | optional (default `us-east-1`) | Yes |
| `S3_FORCE_PATH_STYLE` | optional (default `true`) | Yes |
| `STRIPE_SECRET_KEY` | optional | Yes, if set — PaymentModule binds `StripePaymentGatewayAdapter` instead of `NotConfiguredPaymentGatewayAdapter` (ORIVEX Roadmap 2.0 Stage 1) |
| `STRIPE_WEBHOOK_SECRET` | required if `STRIPE_SECRET_KEY` is set | Yes — verifies `POST /payments/webhook`'s signature |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Docker Compose only | Consumed only by `docker-compose.production.yml` to construct `DATABASE_URL` for the `postgres` service it starts; the app itself never reads these three directly |

`REDIS_URL` is optional in `apps/backend/src/core/configuration/env.schema.ts` specifically because nothing in the codebase instantiates a client from it yet — restore it to required the moment that integration is actually wired up. `S3_*` must point to a real, reachable S3-compatible endpoint or every asset-upload request will fail. Authentication is first-party (Sprint 15, docs/14-adrs.md ADR-005) — no external identity provider is used or required.

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
  -e JWT_ACCESS_SECRET=replace-with-a-random-secret-at-least-32-characters-long \
  orivex-backend:latest
  # REDIS_URL omitted -- optional, unused by any code path yet
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

`docker-compose.production.yml` only orchestrates `backend` + `postgres` + `redis` (no MinIO/Mailpit — those are dev-only, see `docker-compose.yml`). It overrides `DATABASE_URL`/`REDIS_URL` to point at the compose network's own service names regardless of what's in `.env`.

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
   - `JWT_ACCESS_SECRET` — `render.yaml` marks this `generateValue: true`, so Render generates a strong random secret automatically; no manual value needed
   - `REDIS_URL` — optional; leave unset unless/until that integration is actually wired up
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

## Backup & Disaster Recovery

Production Readiness Audit follow-up (Phase 1, item 3). Two independent
data stores hold everything the platform cannot regenerate: **Neon
Postgres** (all application/clinical data) and the **S3-compatible object
store** (uploaded media — verification documents, etc.). Each has its own
backup story below.

### 1. Database (Neon Postgres)

Neon's paid plans (and its free tier, with a shorter window) include
**continuous, automatic point-in-time recovery (PITR)** — every committed
write is retained via WAL, not just nightly snapshots. This is a platform
feature, not something this codebase configures; it must be verified once
per Neon project, not once per deploy:

**Setup / verification checklist** (do this once when the production Neon
project is created, and re-verify after any plan change):

1. In the Neon console, open the project → **Settings** → **Backup/Restore**
   (naming varies by Neon's current UI version).
2. Confirm the **PITR retention window** for the current plan (commonly 7
   days on paid plans, shorter on free — check the actual number, don't
   assume). This is the maximum age of any point you can restore to.
3. Record that retention window in this repo's incident-response runbook
   (wherever your team keeps on-call docs) so whoever responds to an
   incident at 3am doesn't have to go find it under pressure.
4. If the retention window is shorter than your actual tolerance for data
   loss (RPO — see below), upgrade the Neon plan. This is a business
   decision, not a code change.

**Restore procedure** (verify this actually works — an untested restore
procedure is not a real one):

1. In the Neon console, use **Restore** (or **Branching** → create a new
   branch from a specific timestamp/LSN before the incident). Neon
   restores by creating a new branch at the chosen point in time — it does
   not destructively roll back the existing branch in place, so the
   pre-incident data is never lost even if the restore target is wrong.
2. Point a **staging** `DATABASE_URL` at the restored branch first and run
   the application's own health checks (`/health/readiness`) plus a manual
   spot-check of a few known records, before ever repointing production.
3. Once verified, update the production `DATABASE_URL` (Render dashboard
   env var, or the equivalent secrets store) to the restored branch's
   connection string and redeploy.
4. Run `prisma migrate status` (see the Docker Compose section above) to
   confirm the restored branch's schema version matches what the current
   deployed code expects — a restore to a point before a migration ran
   would otherwise boot the app against a schema it doesn't expect.

**Recovery targets** (fill in with your actual business requirements — the
values below are placeholders for a small early-stage deployment, not a
mandate):

- **RPO (Recovery Point Objective — how much data loss is acceptable):**
  Neon's continuous PITR means RPO is effectively "seconds," bounded only by
  replication lag, for anything within the retention window.
- **RTO (Recovery Time Objective — how long recovery may take):** dominated
  by human response time (noticing the incident, deciding to restore,
  running the steps above), not Neon's restore mechanism itself, which
  completes in minutes. Budget accordingly in your on-call process.

### 2. Object storage (S3-compatible media assets)

`MediaAsset` rows (Prisma) are metadata pointers; the actual binary content
lives in the S3-compatible bucket configured via `S3_*` env vars. Losing the
bucket loses the files even if the database is intact (and vice versa —
losing the DB loses the ability to find/authorize access to files that still
exist in the bucket).

- Enable **versioning** on the production bucket (AWS S3: bucket
  properties → Versioning; DigitalOcean Spaces and other S3-compatible
  providers expose the same setting) so an accidental overwrite/delete is
  recoverable without a separate backup system.
- If the provider supports cross-region replication, enable it for the
  production bucket — this is provider/plan-specific and outside what this
  repo can configure, but should be recorded in the same
  incident-response runbook as the Neon PITR window once decided.

### 3. What is explicitly out of scope here

- This document describes the **procedure**; it does not itself perform a
  restore drill against the real production project (that requires access
  to the actual Neon/S3 accounts, which this codebase has no way to hold or
  exercise). Whoever has that access should walk through the restore
  procedure above against a real staging branch at least once before launch,
  and note the date/outcome somewhere durable (this file's git history is a
  reasonable place: update this section with "Last verified: <date>" once
  done).
- Automated backup-verification tooling (a scheduled job that restores to a
  scratch branch and runs a smoke test on a schedule) is a Nice-to-have for
  later, not a blocker for an early-stage launch with a small, recoverable
  dataset.

## Known, pre-existing gaps unrelated to this sprint

Flagged in the Sprint 12 hardening report and unchanged here: no authentication/authorization layer exists yet, and the PSP/AI provider adapters are intentionally unconfigured (`NotConfigured*Adapter`) pending a vendor decision. Deploying now makes the backend reachable — it does not change what it can safely be used for.
