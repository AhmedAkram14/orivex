# Orivex Platform

## Sprint 0 Scope

This repository now contains the initial monorepo scaffold for Sprint 0:

- pnpm workspace configuration
- Docker Compose services for PostgreSQL, Redis, and Mailpit
- Prisma schema and backend package foundation
- development environment defaults

## Getting started

1. Install pnpm if needed.
2. Run `pnpm install`.
3. Start infrastructure services with `pnpm docker:up` (Postgres, Redis, Mailpit, MinIO — a one-shot `minio-init` step also runs automatically and creates the `orivex-media-assets` bucket MinIO needs, so there's no manual bucket-creation step; give it a few seconds after the command returns for `minio-init` to finish before hitting `GET /health/readiness`).
4. Generate Prisma client with `pnpm backend:prisma:generate`.
5. Run the backend scaffold with `pnpm --filter @orivex/backend dev`.

## Demo accounts

After seeding (`pnpm backend:prisma:seed` or equivalent), every demo account shares the password `Password123!`. Emails follow `{role}{NN}@orivex.dev`:

| Role | Emails | Count |
|---|---|---|
| Super Admin | `admin@orivex.dev` | 1 |
| Hospital Admin | `hospitaladmin@orivex.dev` | 1 |
| Doctor | `doctor01@orivex.dev` … `doctor20@orivex.dev` | 20 |
| Patient | `patient01@orivex.dev` … `patient20@orivex.dev` | 20 |

These are seed-only demo credentials (`apps/backend/prisma/demo-data/demo-people.ts`) — never used against a real deployment with real patient data.

## Documentation Index

See [docs/README.md](docs/README.md) for the full, authoritative documentation index. Keep that file as the single source of truth for doc paths — this section intentionally doesn't duplicate the list to avoid the two drifting apart.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for local Docker, Docker Compose, and Render production deployment instructions.
