Documentation Index

This is the authoritative index of the design documents under /docs. CLAUDE.md's priority order references these paths directly — if a file is renamed or added, update it here first, then in CLAUDE.md and the root README.md.

Note on numbering: filenames form a contiguous 00–14 sequence, but each document's own internal "Phase N" self-declaration does NOT always match its filename number. This is intentional, not an error — Phase 7 was retired (never authored; its one dangling citation was removed) and Phase 5 was given its own dedicated file, so every filename from 07 onward is offset from its actual Phase number. Always trust the Phase column below over the filename when citing content.

Product
- 00-product-discovery.md — Phase 0: Product Discovery
- 01-prd.md — Phase 1: Product Requirements Document
- 01.1-prd-update.md — Phase 1.1: PRD Update (integration of refined product decisions)
- 02-product-strategy.md — Phase 1.2: Product Strategy, Business Model & Product Principles

UX & Clinical Domain
- 03-ux-foundation.md — Phase 2: User Experience Foundation
- 04-clinical-domain.md — Phase 2.5: Clinical Domain Model & Workflow Design

Architecture
- 05-information-architecture.md — Phase 3: Information Architecture & Product Structure
- 06-system-architecture.md — Phase 4: Enterprise System Architecture (includes the accepted ADRs, Section 15; summarized in 14-adrs.md). Extracted from 05-information-architecture.md, which previously contained both phases concatenated with a corrupted paste seam between them — the seam text was removed, all headings/sections/paragraphs preserved verbatim.

Data Model
- 07-domain-data-model.md — Phase 5: Domain Data Modeling & Database Architecture (conceptual/aggregate-level modeling)
- 08-logical-data-model.md — Phase 6: Logical Database Design (Enterprise ERD)
- 09-physical-database.md — Phase 8: Physical Database Design (Enterprise ERD)

Backend
- 10-backend-architecture.md — Phase 9: Backend Module Design (NestJS Enterprise Architecture)

API
- 11-api-contracts.md — Phase 10: Enterprise API Contract Design (OpenAPI First)
- 12-openapi.md — Phase 11: OpenAPI 3.1 specification

Engineering
- 13-engineering-bootstrap.md — Phase 12: Engineering Workspace Bootstrap

Decisions
- 14-adrs.md — Accepted Architecture Decision Records (summary; full reasoning in 06-system-architecture.md, Section 15)

Resolved since the last integrity review
- Phase 4 is no longer merged into 05-information-architecture.md — it now lives in its own file, 06-system-architecture.md, with the corrupted paste-artifact text removed and no other content altered.
- Phase 7's single dangling citation (in what is now 08-logical-data-model.md) was removed. Phase 7 will not be authored; the ADR document (14-adrs.md) is treated as the evolution of that planning step, per architect decision.
- All filenames now match the canonical naming list approved by the architect. The 07-physical-database.md / 08-physical-database.md naming collision from the previous review no longer exists — data-model documents are now distinctly named (07-domain-data-model.md, 08-logical-data-model.md, 09-physical-database.md).
