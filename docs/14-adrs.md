Architecture Decision Records — Accepted (Planning Phase)

This document summarizes the ADRs approved during the planning phase. Full reasoning, alternatives, and impact analysis for each remains authoritative in [06-system-architecture.md](06-system-architecture.md), Section 15 — this file is a summary/index for quick reference, not a replacement for that source. No decisions are altered here.

ADR-001: Modular Monolith over Microservices for V1
Status: Accepted.
Decision: Build V1 as a single Modular Monolith with enforced domain boundaries, not microservices.
Reasoning (summary): The project doesn't yet have the organizational or load scale that justifies microservices' operational overhead; enforced domain boundaries capture most of the long-term benefit without the near-term cost, while preserving a genuine extraction path later.
Source: 06-system-architecture.md, Section 15.

ADR-002: Deterministic Lookup (Not Generative AI) for Drug Interaction/Allergy Checking
Status: Accepted.
Decision: Drug interaction/allergy checking uses a deterministic, auditable lookup against a maintained clinical drug database — never a generative/LLM path.
Reasoning (summary): The cost of a missed interaction is categorically higher than any convenience gained from a unified AI approach; this establishes the platform-wide precedent that safety-critical clinical logic is never delegated to purely generative inference.
Source: 06-system-architecture.md, Section 15.

ADR-003: Health Graph as Clinical Domain's Internal Model (Not a Separate Bounded Context)
Status: Accepted.
Decision: The Health Graph lives inside Clinical Domain rather than as its own top-level bounded context.
Reasoning (summary): The Graph's value depends on sharing write-authority and consistency guarantees with the rest of clinical content; splitting it out would reintroduce the cross-domain consistency problems DDD is meant to avoid. This makes Clinical Domain the heaviest module in the system, requiring the most careful internal sub-structuring going forward.
Source: 06-system-architecture.md, Section 15.

ADR-004: Egypt-Region Data Residency Enforced at Infrastructure Level, Not Application Convention
Status: Accepted.
Decision: Data residency for Egypt is enforced structurally (region-locked infrastructure), not via application-level configuration/convention.
Reasoning (summary): Given Egyptian MoH data residency requirements and the severity of a compliance violation, this is not a place to rely on application-level discipline alone; a misconfiguration or bug can't accidentally violate residency requirements when the constraint is structural. This directly shapes future multi-region architecture — each future country needs its own resident storage, not a shared global data layer.
Source: 06-system-architecture.md, Section 15.

ADR-005: First-Party Authentication Instead of Keycloak
Status: Accepted (Sprint 15, post-planning-phase — decided during implementation, not the original planning phase; recorded here since this document is the project's ADR index regardless of when a decision was made).
Decision: AuthenticationModule implements credential verification, JWT issuance, refresh-token rotation, password reset, and email verification directly inside the NestJS monolith — no external identity provider (Keycloak or otherwise).
Reasoning (summary): docs/06-system-architecture.md and docs/10-backend-architecture.md's original IdentityModule design assumed Keycloak would own credential verification, but no Keycloak integration was ever implemented (Account.keycloakId was a required-but-unused field, and no auth routes existed until this sprint). The project is intended as a complete, production-ready portfolio application and should not depend on an external identity provider for its core security posture. Password hashing uses argon2id (OWASP's current recommendation); access tokens are short-lived JWTs carrying only account id + role; refresh tokens are opaque, rotated on every use, and revocable server-side with reuse detection. This is a genuine architectural pivot: Account.keycloakId and the Keycloak-shaped Session model were dropped in a breaking migration (safe because no account could have had real credentials before this sprint), and IdentityModule's scope narrowed to Account/Profile/Role only, with the new AuthenticationModule owning Credential/Session/AuthToken.
Source: this sprint's implementation (apps/backend/src/modules/authentication), docs/10-backend-architecture.md's AuthenticationModule entry.

ADR-006: SecurityEvent Ownership Stays with TrustModule, Populated by AuthenticationModule
Status: Accepted (Sprint 15).
Decision: The SecurityEvent entity/table — documented since the original data-model phase as TrustModule's ("Owned entities: VerificationCase, ConsentRecord, SecurityEvent") but never implemented until now — is built inside TrustModule exactly as originally documented, not moved to AuthenticationModule despite Authentication being the actual producer of every event it records.
Reasoning (summary): Moving ownership to whichever module happens to produce the most events first would let implementation convenience override the documented domain model. AuthenticationModule calls TrustModule's exported RecordSecurityEventUseCase (a legitimate module-to-module use-case call through a published interface, the same pattern already used for RegisterAccountUseCase) rather than owning the table itself. This keeps the pre-existing architecture documentation accurate instead of retroactively rewriting it to match whichever module got built first.
Source: this sprint's implementation (apps/backend/src/modules/trust/domain/entities/security-event.entity.ts), docs/10-backend-architecture.md's TrustModule entry, docs/09-physical-database.md's security_events table description.

ADR-007: Owner-or-Admin Presigned Document Access; Suspend Never Auto-Demotes a Doctor's Role
Status: Accepted (Onboarding Redesign, Stage O.8 — 2026-07-25).
Decision (part 1 — document access): Admin review of a submitted verification document (National ID, medical license, etc.) goes through a new, minimal `GetMediaAssetUseCase` / `GET /media-assets/:id`, authorized server-side as owner-OR-SuperAdmin, returning a short-lived presigned S3 download URL (via the already-existing but previously-uncalled `ObjectStoragePort.createPresignedDownloadUrl`) — never a raw/public object URL, and never a second, parallel file-serving path. The frontend document viewer mints a fresh signed URL on every render; nothing caches or persists the URL itself.
Reasoning (summary): AssetModule's `MediaAssetController` only ever supported owner-only `upload-intent`/`confirm` routes before this stage — there was no way for anyone but the uploader to view a submitted document, which made real admin document review impossible without either making assets public (rejected — these are National IDs and licenses) or building a parallel review-specific file path (rejected — "do not build a parallel file system" was an explicit constraint). Reusing the existing port through one new, narrowly-scoped use case was the smallest correct fix.
Decision (part 2 — suspend does not demote): `VerificationCase.suspend()` (Approved → Suspended, O.2) raises no domain event and has no effect on `Account.role` for a Doctor subject. An admin who wants to also cut off portal access after suspending a doctor's verification must separately call the existing, unrelated `PATCH /accounts/:id/suspend` (account-level suspension). This was confirmed directly with the product owner (2026-07-25) rather than assumed, after the domain gap was discovered (approving a doctor case raises `DoctorVerifiedEvent` → role promotion, but suspending has no symmetric handler).
Reasoning (summary): Inventing automatic role demotion on verification-suspend would be a new, undiscussed authorization-semantics change (a doctor mid-consultation losing portal access the instant an admin flags their license for review, with no separate confirmation step) — exactly the kind of silent authorization change this project's own rules require stopping and asking about first, rather than guessing. Keeping the two concerns (verification standing vs. account/portal access) independent, admin-decided actions preserves today's behavior and lets a future stage add automatic demotion deliberately, with its own review, if ever wanted.
Source: apps/backend/src/modules/asset/application/use-cases/get-media-asset/, apps/backend/src/modules/asset/presentation/controllers/media-asset.controller.ts (`GET :id`), apps/backend/src/modules/trust/domain/entities/verification-case.entity.ts (`suspend()`), docs/proposals/2026-07-21-onboarding-redesign-proposal.md's Stage O.8 completion note.
