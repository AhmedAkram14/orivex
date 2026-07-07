Documentation Index

This is the authoritative index of the design documents under /docs. CLAUDE.md's priority order references these paths directly — if a file is renamed or added, update it here first, then in CLAUDE.md and the root README.md.

Product
- 00-product-discovery.md — Phase 0: Product Discovery
- 01-prd.md — Phase 1: Product Requirements Document
- "01.1 -PRD Update.md" — Phase 1.1: PRD Update (integration of refined product decisions)
- 02-product-strategy.md — Phase 1.2: Product Strategy, Business Model & Product Principles

UX & Clinical Domain
- 03-ux-foundation.md — Phase 2: User Experience Foundation
- 04-clinical-domain.md — Phase 2.5: Clinical Domain Model & Workflow Design

Architecture
- 05-information-architecture.md — Phase 3: Information Architecture & Product Structure (also the source discussion for the ADRs summarized in 13-adrs.md)

Data Model
- 06-data-model.md — Phase 5: Domain Data Modeling & Database Architecture
- 08-physical-database.md — Phase 6: Logical Database Design (Enterprise ERD)
- 07-physical-database.md — Phase 8: Physical Database Design (Enterprise ERD)

Backend
- 09-backend-architecture.md — Phase 9: Backend Module Design (NestJS Enterprise Architecture)

API
- 10-api-contracts.md — Phase 10: Enterprise API Contract Design (OpenAPI First)
- 11-openapi.md — OpenAPI 3.1 specification

Engineering
- 12-engineering-bootstrap.md — Phase 12: Engineering Workspace Bootstrap

Decisions
- 13-adrs.md — Accepted Architecture Decision Records (summary; full reasoning in 05-information-architecture.md, Section 15)

Known gaps (flagged, not fixed by this review)
- Phase 4 and Phase 7 are cited extensively throughout these documents (Security Architecture, Observability, IaC, and AI Layer topics among others) but no corresponding phase document exists in this repository. Treat citations to "Phase 4" / "Phase 7" as pointing at missing source material, not at a file that can be opened.
- 07-physical-database.md and 08-physical-database.md share a filename pattern despite covering different phases (Phase 8's physical design vs. Phase 6's logical design) and their numeric prefixes don't match their internal Phase numbers. Listed above by actual content, not by what the filename implies. No file was renamed or edited as part of this review — that decision is left to the team.
