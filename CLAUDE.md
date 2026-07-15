# Project Context

This repository contains an enterprise healthcare platform.

Before making architectural decisions, always read the documentation under /docs. See docs/README.md for the full documentation index.

Priority order:

1. docs/14-adrs.md
2. docs/06-system-architecture.md (Phase 4 — Enterprise System Architecture; also holds the full ADR reasoning summarized in 14-adrs.md)
3. docs/05-information-architecture.md (Phase 3 — Information Architecture)
4. docs/10-backend-architecture.md
5. docs/11-api-contracts.md
6. docs/09-physical-database.md

Rules:

- Never violate module boundaries.
- Never bypass OpenAPI contracts.
- AI never writes directly to clinical records.
- Follow Clean Architecture.
- Follow DDD.
- Modular Monolith only.
- PostgreSQL is the source of truth.
- Do not introduce new frameworks without discussion.
- Ask before making architectural changes.
- never make yourself co-worker when uplodaing commit on git

# Architecture Summary

System:
Enterprise Healthcare Platform

Version:
Egypt V1

Architecture:
Modular Monolith

Pattern:
DDD + Clean + Hexagonal

Backend:
NestJS

Frontend:
Next.js App Router

Database:
PostgreSQL

Cache:
Redis

Storage:
S3 Compatible

Identity:
First-party (AuthenticationModule — JWT + argon2, no external IdP; see docs/14-adrs.md ADR-005, Sprint 15)

Search:
PostgreSQL Full Text

Realtime:
LiveKit

AI:
Azure OpenAI

Source of Truth:
OpenAPI

Coding Rules:
...
