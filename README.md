# Orivex Platform

## Sprint 0 Scope

This repository now contains the initial monorepo scaffold for Sprint 0:

- pnpm workspace configuration
- Docker Compose services for PostgreSQL, Redis, Keycloak, and Mailpit
- Prisma schema and backend package foundation
- development environment defaults

## Getting started

1. Install pnpm if needed.
2. Run `pnpm install`.
3. Start infrastructure services with `pnpm docker:up`.
4. Generate Prisma client with `pnpm backend:prisma:generate`.
5. Run the backend scaffold with `pnpm --filter @orivex/backend dev`.

## Documentation Index

See [docs/README.md](docs/README.md) for the full, authoritative documentation index. Keep that file as the single source of truth for doc paths — this section intentionally doesn't duplicate the list to avoid the two drifting apart.
