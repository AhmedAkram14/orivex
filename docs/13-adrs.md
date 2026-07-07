Architecture Decision Records — Accepted (Planning Phase)

This document summarizes the ADRs approved during the planning phase. Full reasoning, alternatives, and impact analysis for each remains authoritative in [05-information-architecture.md](05-information-architecture.md), Section 15 — this file is a summary/index for quick reference, not a replacement for that source. No decisions are altered here.

ADR-001: Modular Monolith over Microservices for V1
Status: Accepted.
Decision: Build V1 as a single Modular Monolith with enforced domain boundaries, not microservices.
Reasoning (summary): The project doesn't yet have the organizational or load scale that justifies microservices' operational overhead; enforced domain boundaries capture most of the long-term benefit without the near-term cost, while preserving a genuine extraction path later.
Source: 05-information-architecture.md, Section 15.

ADR-002: Deterministic Lookup (Not Generative AI) for Drug Interaction/Allergy Checking
Status: Accepted.
Decision: Drug interaction/allergy checking uses a deterministic, auditable lookup against a maintained clinical drug database — never a generative/LLM path.
Reasoning (summary): The cost of a missed interaction is categorically higher than any convenience gained from a unified AI approach; this establishes the platform-wide precedent that safety-critical clinical logic is never delegated to purely generative inference.
Source: 05-information-architecture.md, Section 15.

ADR-003: Health Graph as Clinical Domain's Internal Model (Not a Separate Bounded Context)
Status: Accepted.
Decision: The Health Graph lives inside Clinical Domain rather than as its own top-level bounded context.
Reasoning (summary): The Graph's value depends on sharing write-authority and consistency guarantees with the rest of clinical content; splitting it out would reintroduce the cross-domain consistency problems DDD is meant to avoid. This makes Clinical Domain the heaviest module in the system, requiring the most careful internal sub-structuring going forward.
Source: 05-information-architecture.md, Section 15.

ADR-004: Egypt-Region Data Residency Enforced at Infrastructure Level, Not Application Convention
Status: Accepted.
Decision: Data residency for Egypt is enforced structurally (region-locked infrastructure), not via application-level configuration/convention.
Reasoning (summary): Given Egyptian MoH data residency requirements and the severity of a compliance violation, this is not a place to rely on application-level discipline alone; a misconfiguration or bug can't accidentally violate residency requirements when the constraint is structural. This directly shapes future multi-region architecture — each future country needs its own resident storage, not a shared global data layer.
Source: 05-information-architecture.md, Section 15.
