Phase 10 — Enterprise API Contract Design (OpenAPI First)
Pure contract governance — no schemas, no code, but concrete enough that a frontend, mobile, and backend team could all build against this without a single clarifying question.

1. API Philosophy
PrincipleWhyREST First, Resource-OrientedMaps cleanly onto Phase 9's module/aggregate boundaries — a resource in the API is, almost always, an aggregate root from Phase 5/8; this alignment is what keeps the API from drifting away from the domain model over time.Predictable URLsA developer (or SDK generator) should be able to guess GET /patients/{id}/health-passport correctly without checking docs — predictability is a developer-experience multiplier across three consumer types (web, mobile, future third-party integrators, Phase 4's API-access revenue line).Versioned APIsHealthcare systems have unusually long client lifecycles (a hospital integration or a slow-to-update mobile app) — breaking changes without versioning are not an acceptable risk in this domain.Idempotent OperationsDirectly required by Phase 5/9's idempotency rules for booking, payment, and AI suggestion actions — this needs to be an API-level contract (idempotency keys, Section 11), not just an internal implementation detail.Consistent Error FormatA single error shape across all 18 modules (Phase 9) means client code handles errors once, not 18 different ways — critical given how many distinct failure modes this platform has catalogued (Phase 2's 100 edge cases).Pagination, Filtering, Sorting, Search StandardsApplied uniformly (Section 8) so every list endpoint behaves the same way — inconsistency here is one of the most common sources of accumulated frontend workarounds in real systems.Secure by DefaultEvery endpoint requires explicit authentication/authorization declaration — there is no "public by omission" endpoint category except a deliberately small, named allowlist (Doctor Discovery search, published Knowledge Articles).Explicit over CleverA principle worth adding: prefer a slightly more verbose, obvious endpoint/field name over a compact but ambiguous one — given multiple consumer teams (web, mobile, future third parties) will never share a room with the API's original authors, clarity in the contract itself is the only documentation guaranteed to be read.

2. API Versioning Strategy

Path-based versioning: /api/v1/... — chosen over header-based versioning for visibility and simplicity across all three consumer types (a header-based scheme is easy to forget in ad hoc testing and harder to reason about when debugging).
Backward compatibility rule: within a major version, only additive changes are permitted (new optional fields, new endpoints, new optional query parameters) — anything else is a breaking change requiring a new major version.
Deprecation policy: a deprecated endpoint/field is marked via a Deprecation response header (with a Sunset date, per Section 12) for a minimum defined window (recommend 6 months for V1, given healthcare-adjacent client update cycles tend to be slower than typical consumer apps) before removal.
Breaking changes: always ship as a new major version (/api/v2) running in parallel with v1 for the full deprecation window — never a breaking change silently introduced within an existing version.
Sunset strategy: an old major version is only fully retired once usage telemetry (Analytics Domain, Phase 9) shows negligible traffic, or after the announced sunset date, whichever is later — never removed purely on a calendar date if real clients are still depending on it, given the clinical-continuity stakes of an integration breaking unexpectedly.


3. Resource Catalog
ResourceMaps to (Phase 9 module)/authIdentityModule/accountsIdentityModule/patientsPatientModule/patients/{id}/health-passportPatientModule (composed with ClinicalModule reads)/doctorsDoctorModule/doctors/{id}/portfolioDoctorModule/doctors/{id}/availabilityDoctorModule / SchedulingModule/verificationsTrustModule/consentsTrustModule/appointmentsConsultationModule/consultationsConsultationModule/consultations/{id}/notesClinicalModule/patients/{id}/health-graphClinicalModule/patients/{id}/journeysClinicalModule/patients/{id}/observationsClinicalModule/prescriptionsClinicalModule/lab-requestsClinicalModule/radiology-requestsClinicalModule/referralsClinicalModule/knowledge/articlesKnowledgeModule/media-assetsAssetModule/paymentsPaymentModule/payoutsPaymentModule/notificationsNotificationModule/ai/suggestionsAIModule/audit-logsAuditModule (admin-only)/configurationConfigurationModule (admin-only)/reference-dataReferenceDataModule (public read)/analyticsAnalyticsModule/moderation-casesAdministrationModule
Deliberate omission worth naming: there is no standalone /health-journeys/{id}/graph resource distinct from /patients/{id}/health-graph — per Phase 5/6/8's resolution, a Journey is a view over the Graph, not a separate data source, and the API should reflect that: Journeys are retrieved as /patients/{id}/journeys/{journeyId}, which internally composes Graph data, never as an independently-queryable graph structure of its own.

4. Endpoint Design
Representative endpoints per resource — full CRUD enumeration for all ~28 resources would be repetitive; I'll cover the highest-stakes and least-obvious ones in full, and state the consistent pattern for standard CRUD resources once.
MethodURLPurposeAuthAuthorizationIdempotentExpected statusesPOST/auth/registerCreate accountNo—Yes (via idempotency key)201, 409 (duplicate)POST/auth/loginAuthenticateNo—No200, 401GET/doctorsDiscovery searchNo (public)—N/A200GET/doctors/{id}/portfolioView public portfolioNo (public)—N/A200, 404POST/doctors/{id}/verificationsSubmit credentialsYesSelf (own doctor account)Yes201, 422PATCH/verifications/{id}Approve/reject (admin)YesAdmin onlyYes200, 403POST/appointmentsBook a slotYesSelf (patient)Yes — required, given Phase 2/8's double-booking risk201, 409 (slot taken), 402 (payment required)PATCH/appointments/{id}Reschedule/cancelYesSelf (patient) or the treating doctorYes200, 409POST/consultations/{id}/startBegin sessionYesSelf (patient or treating doctor)Yes200, 409 (outside window)POST/consultations/{id}/closeEnd sessionYesTreating doctor onlyYes200POST/consultations/{id}/notesAuthor a clinical noteYesTreating doctor onlyYes201, 403GET/patients/{id}/health-graphRetrieve scoped subgraphYesSelf (patient) or a doctor with active consentN/A (read)200, 403 (no consent)POST/prescriptionsSign a prescriptionYesTreating doctor onlyYes201, 422 (unacknowledged Warning present, Phase 8/9)POST/patients/{id}/consentsGrant/revoke consentYesSelf (patient)Yes201POST/ai/suggestionsRequest an AI draftYesTreating doctor only, active consultationYes202 (async generation), 200 (if synchronous/fast path)PATCH/ai/suggestions/{id}Record doctor's decisionYesTreating doctor onlyNo — settable exactly once (Phase 8)200, 409 (already decided)POST/paymentsInitiate a chargeYesSelf (patient)Yes — critical201, 402POST/knowledge/articlesPublish contentYesVerified doctor onlyYes201 (or 202 if routed to pre-publication review, Phase 1.1)POST/media-assetsUpload a file (Section 9)YesSelf or treating contextYes201
Standard pattern for remaining CRUD resources (/patients, /doctors, /knowledge/articles listing, /reference-data/*): GET (list, paginated), GET /{id} (detail), POST (create, where applicable), PATCH /{id} (update, where the entity is mutable per Phase 8's versioning rules — never exposed on immutable resources like /prescriptions/{id} or /audit-logs/{id}), with authorization always scoped to "self" or role-appropriate access, consistent with Phase 2's Permissions Matrix.

5. Request Contracts
Conceptual, not DTO code — field-level intent only.
POST /appointments

Required: doctorId, slotId (or availabilityWindowId + startTime), reasonForVisit (free text, optional-but-recommended per Phase 2.5's Section 3 note about lightening the free-tier flow), consultationType (free/paid, must match what the doctor actually offers for that slot).
Optional: linkedJourneyId (if this booking is a known follow-up to an existing Journey — supports the "smart follow-up" flow, Phase 3).
Validation: slotId must reference a currently-available, non-expired hold; consultationType must be consistent with the doctor's configuration for that slot; free-tier cap check (Phase 1's business rule) evaluated server-side, never trusted from client input.
Business rule surfaced to the client: if the patient has exceeded their monthly free-tier cap, this returns a specific business-rule error (Section 7), not a generic 400.

POST /prescriptions

Required: consultationSessionId, diagnosisNodeId, lineItems[] (each with drugCatalogId, dosage, frequency, duration, instructions).
Optional: derivedFromSuggestionId (if based on an AI draft, per Phase 9's audit-linkage requirement).
Validation: server re-runs the deterministic interaction/allergy check (Phase 2.5/4/9's ADR-002) regardless of what the client believes it already saw — never trust a client-side "already checked" flag for a safety-critical validation; every unacknowledged Warning-tier flag for this consultation blocks signing (422) until an explicit acknowledgment request is separately submitted.
Business rule surfaced: 422 response includes the specific blocking Warning(s), not just a generic validation failure.

POST /patients/{id}/consents

Required: doctorId (nullable for platform-wide scope), scopeCategory, action (grant/revoke), legalBasisVersion (which consent text version is being agreed to — Phase 6/8's requirement).
Validation: cannot revoke a scope the patient never granted; a grant always creates a new version row (Phase 8), never updates in place.

POST /ai/suggestions

Required: consultationSessionId, suggestionType.
Optional: none client-supplied beyond that — the actual context scoping (Phase 2.5/9's bounded subgraph query) happens server-side, deliberately not client-controlled, since letting a client dictate AI context scope would be both a security risk and inconsistent with the architecture's safety design.


6. Response Contracts
Success envelope (uniform across all endpoints):
{
  "data": { ... },
  "meta": { "requestId": "...", "timestamp": "..." },
  "warnings": [ ... ]   // optional, non-blocking notices (e.g., "this data may be stale")
}
List/paginated envelope:
{
  "data": [ ... ],
  "pagination": { "cursor": "...", "hasMore": true, "totalCount": null },
  "meta": { ... }
}
totalCount is deliberately nullable/omittable — computing an exact total count on a large, growing table (e.g., audit-logs) can be expensive and isn't always necessary; consumers should treat cursor-based hasMore as authoritative (Section 8 explains the cursor-over-offset decision).
AI metadata, specifically (a genuinely distinct concern worth its own contract element): any response containing AI-generated content includes an aiMetadata block — { suggestionId, confidenceScore, promptVersion, requiresAcknowledgment } — so the client can render appropriate "this is a draft" affordances (Phase 1.1/2.5's UI requirement) without needing a separate lookup call.
Links (HATEOAS-lite, used sparingly): only where genuinely useful for workflow navigation (e.g., a Consultation response includes a links.joinUrl for the Realtime session) — not applied dogmatically across every resource, since full HATEOAS adds real client complexity for limited practical benefit in a system with well-documented, stable endpoints already.
Consistency principle stated once: every successful response uses the same top-level envelope shape regardless of resource — a client (or SDK generator) parses one shape, not 28 different ones.

7. Error Model
Uniform error envelope:
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable summary",
    "details": [ ... ],       // field-level validation details, where applicable
    "requestId": "...",
    "timestamp": "..."
  }
}
Error categoryHTTP statusExample codeValidation Error400VALIDATION_FAILEDAuthentication Error401UNAUTHENTICATEDAuthorization Error403FORBIDDEN / CONSENT_NOT_GRANTED (a specific, named sub-code — distinct from generic forbidden, since a doctor lacking consent is a meaningfully different situation from a doctor lacking a role entirely)Business Rule Error422FREE_TIER_CAP_EXCEEDED, UNACKNOWLEDGED_INTERACTION_WARNINGConflict409SLOT_ALREADY_BOOKED, SUGGESTION_ALREADY_DECIDEDRate Limit429RATE_LIMIT_EXCEEDED (with Retry-After header)Not Found404RESOURCE_NOT_FOUNDInternal Error500INTERNAL_ERROR (deliberately generic to clients — no internal detail leakage, per Phase 4's security posture)AI Unavailable503 (or 200 with a degraded-mode flag, per Phase 2.5's graceful-degradation preference)AI_SERVICE_UNAVAILABLE — recommend this returns 200 with a body flag rather than an error status, since AI unavailability should never surface as a client-side "failure" given the Workspace must function normally without it (Phase 2.5's hard rule) — worth stating clearly that this is a deliberate deviation from typical error-status conventions, made specifically because of this platform's AI-optionality principleVideo Failure200 (session state reflects interrupted, not an HTTP error)Session state is the correct channel for this, not an HTTP error code, since it's a normal, anticipated, recoverable state (Phase 2.5)Payment Failure402PAYMENT_FAILED (with a reason sub-code where the PSP provides one)Medical Safety Warning422 (blocking) or 200 with a warnings[] entry (non-blocking)Distinguishes hard-blocking safety issues (must acknowledge before proceeding) from softer advisory warnings — this distinction must be explicit and consistent, not left ambiguous per-endpoint
Why AI Unavailable and Video Failure deliberately break from "errors are 4xx/5xx" convention: both are expected, anticipated states in this platform's design (Phase 2/2.5), not failures of the API contract itself — treating them as ordinary error responses would push clients toward generic error-handling UI (alarming, retry-focused) when the correct UX is calm and specific (Phase 2's tone requirements). This is a deliberate, documented exception to REST convention, made for domain reasons, not an oversight.

8. Pagination, Filtering & Search

Pagination: cursor-based as the default and only supported mechanism for large/growing collections (audit-logs, notifications, consultations history) — chosen over offset-based specifically because offset pagination degrades and can skip/duplicate records under concurrent writes, which is a real risk for tables like audit_log_entries that are being written continuously (Phase 8's partitioning-candidate tables are exactly the ones where cursor pagination matters most). Small, rarely-growing collections (reference-data catalogs) may reasonably use simple offset pagination given their low volume and stability.
Filtering: query parameters follow a consistent field=value or field[operator]=value pattern (e.g., status=pending, createdAt[gte]=2026-01-01) — never bespoke per-endpoint filter syntax.
Sorting: sort=field / sort=-field (leading minus for descending) — a single, universally-applied convention.
Search: a dedicated q= parameter on searchable resources (Doctor Discovery, Knowledge Articles, per Phase 6/8's Full Text Search technology decision), distinct from structured filters, and always combinable with them (search + filter together, per Phase 3's "structured filters must remain available alongside AI/semantic search" rule).
Field selection: a fields= parameter for bandwidth-conscious mobile clients to request a subset of fields on large resources (e.g., Doctor Portfolio's full biography vs. summary card view) — genuinely valuable given Phase 2's mobile-first, sometimes-limited-connectivity persona (Am Hassan).
Expand/include strategy: an include= parameter for optionally embedding related resources in one call (e.g., GET /appointments/{id}?include=doctor,paymentTransaction) to reduce round-trips for mobile clients specifically — never included by default, always opt-in, to keep default payloads lean.


9. File Upload Strategy
Upload lifecycle, uniform across all upload types (Medical Images, Lab Files, Doctor Certificates, Profile Images, Knowledge Media, Prescription-related attachments):

Client requests a signed upload URL: POST /media-assets/upload-intent with { contentType, sizeEstimate, purpose } — server validates purpose against the requesting user's authorization (e.g., only a doctor mid-consultation can request a clinical-attachment intent) and returns a short-lived, signed direct-to-object-storage URL (never proxying the actual binary through the application server, per standard object-storage upload patterns).
Client uploads the binary directly to object storage using the signed URL.
Client confirms completion: POST /media-assets/{id}/confirm — triggers server-side validation (virus scan, format check, size verification) and, for OCR-eligible types, queues the AI OCR background job (Phase 9, Section 9).
Server links the now-confirmed Media Asset to its owning entity (Clinical Note, Doctor Verification Case, etc.) via the appropriate domain module's own endpoint (e.g., PATCH /consultations/{id}/notes/{noteId}/attachments).

Why this multi-step lifecycle, not a single POST with the file body: direct-to-storage upload avoids routing potentially large binary payloads (video recordings, high-res medical images) through the application tier at all, which is both a performance and a cost consideration at scale (Phase 4/8's storage layer design). The confirm step exists specifically because an upload-intent could be abandoned (client closes the tab mid-upload) — the system should never treat an unconfirmed upload as if it were a real, linked asset.
Sensitivity handling specifically for this endpoint family: the purpose field on upload-intent directly determines which Sensitivity Classification (Phase 6/8) the resulting asset inherits, and therefore which access-control/audit rules apply — this must never be client-overridable after the fact.

10. Realtime Contracts (Conceptual)
Not WebSocket implementation — the contract shape of what flows over the Realtime channel established in Phase 4/9, Section 6.
ChannelMessage shape (conceptual)DirectionVideo Session Signaling`{ sessionId, event: 'joined''left'Presence`{ doctorId, status: 'online''offline'Typing indicators{ threadId, accountId, isTyping: boolean }Bidirectional, ephemeral (never persisted)Notifications (realtime push)Mirrors the standard Notification resource shape (Section 6) but delivered over the push channel instead of polledServer → ClientAI Live Suggestions{ suggestionId, type, content, confidenceScore, requiresAcknowledgment } — same shape as the REST ai/suggestions resource, just pushed rather than polledServer → Client (doctor only)Status Updates (appointment status, doctor running late){ appointmentId, status, updatedAt }Server → Client
Contract consistency principle: wherever a Realtime message represents the same entity as a REST resource (AI Suggestions, Notifications, Appointment status), the message shape is identical to that resource's REST representation — a client should never need two different parsers for "the same thing delivered two different ways." This is a deliberate, easily-overlooked design discipline worth stating explicitly.

11. Security

JWT: short-lived access tokens (issued by AuthenticationModule, Sprint 15 — first-party, no Keycloak; docs/14-adrs.md ADR-005), carrying role and account ID claims only — never embedding PHI or business data in the token itself.
Refresh Tokens: longer-lived, rotated on use, revocable server-side (supports the Phase 4 requirement that a compromised session can be forcibly terminated).
Scopes: fine-grained OAuth-style scopes for future third-party API access (Phase 4's Future Integrations) — e.g., clinical:read, appointments:write — even though V1's own first-party clients use full role-based access, designing the scope model now avoids a breaking change when third-party API access (Phase 1.2's revenue stream) eventually launches.
Permissions: enforced server-side per Phase 9's AuthModule.can() contract — the API layer never trusts a client's claim about what it's allowed to do.
Consent: every clinical-data-reading endpoint's authorization check includes a live consent-state check (Phase 5/9), not just a role check — this needs to be explicit in the endpoint's documented Authorization Rules (Section 4), not implied.
Audit headers: every authenticated request carries a X-Request-Id (correlation ID, generated client-side or server-side if absent) that flows through to the resulting Audit Log Entry (Phase 8/9) — this is what makes "trace this exact user action" possible after the fact.
Correlation IDs: propagated across service boundaries (even within the monolith, per Phase 4's observability principle) so a single user action can be traced end-to-end.
Idempotency Keys: required (not merely accepted) on all state-changing, retry-sensitive endpoints (POST /appointments, POST /payments, POST /prescriptions) via an Idempotency-Key request header — the server rejects a state-changing request on these specific endpoints if the header is missing, rather than silently proceeding without one, given the real cost of a duplicate booking/charge (Phase 5/8's flagged risks).
Rate Limiting Headers: standard X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After on 429 responses.


12. API Conventions
AspectConventionPluralizationCollection resources always plural (/patients, /appointments); singleton sub-resources singular where genuinely one-per-parent (/patients/{id}/health-passport, not /health-passports).Path parametersAlways the resource's UUID identifier, never a business-meaningful value (never a license number or email in a path).Query parameterscamelCase, consistent with JSON body field casing (avoids a client needing two casing conventions in one request).Date formatsISO 8601, always UTC on the wire (2026-07-06T14:30:00Z) — timezone conversion is a display-layer concern only (Phase 2's rule, restated as an API contract rule).UUIDsStandard string representation, always v4/v7 per Phase 8's technology decision.EnumsLowercase, hyphen-free, snake_case-free — consistently camelCase or a single agreed convention (recommend lowercase-with-underscores for enum values specifically, e.g., in_progress, since this is the most common cross-language-safe convention, distinct from field-name casing).BooleansAlways true/false, never 0/1 or string representations.LocalizationAn Accept-Language header drives response localization for any user-facing text (Reference Data labels, Notification Templates) — the underlying data model remains language-agnostic per Phase 6's multi-language design.TimezonesServer always UTC; client-supplied local times (e.g., a booking request) are normalized server-side against the doctor's actual slot definition (Phase 2's timezone rule, once again restated at the contract layer since it recurs at every layer of this project for good reason).

13. API Lifecycle
StageMeaningExperimentalNot documented publicly, may change without notice — used for internal-only, actively-being-designed endpoints (e.g., an early Doctor Intelligence insight endpoint still being validated).BetaDocumented, stable shape expected but not guaranteed, marked clearly in OpenAPI docs (Section 14) — consumers opt in knowingly.StableFully covered by the backward-compatibility guarantee (Section 2) — the default expectation for anything used by the first-party Patient/Doctor/Admin apps.DeprecatedStill functional, carries the Deprecation/Sunset headers (Section 2), actively discouraged in documentation.SunsetRemoved — returns 410 Gone with a pointer to the replacement endpoint where one exists, rather than a bare 404, since a bare 404 on a previously-working integration is a worse developer experience than an explanatory 410.

14. Documentation Strategy

OpenAPI as the single source of truth: the specification itself (generated in the next phase, per this phase's explicit scope boundary) drives everything downstream — Swagger UI for interactive docs, SDK generation (TypeScript/mobile client SDKs) directly from the spec rather than hand-maintained client libraries, and mock servers for frontend/mobile teams to develop against before backend endpoints are fully implemented.
Examples: every endpoint's documentation includes at least one realistic request/response example, specifically including examples of the business-rule error cases (Section 7) — not just the happy path, since Phase 2's edge-case catalogue makes clear how much of this system's real complexity lives in those cases.
Contract Testing: the OpenAPI spec becomes the artifact contract-tests (Phase 9, Section 13) validate against — a backend change that would violate the published contract fails CI before it ever reaches a consumer, operationalizing Phase 4/9's "domain boundary contract tests" principle at the API layer specifically.
Mock servers: generated directly from the OpenAPI spec, enabling frontend/mobile development to proceed in parallel with backend implementation rather than being blocked by it — a genuine velocity benefit for a project of this scope.


15. Final API Review
Inconsistent resources, caught during this pass: none structurally, but the naming asymmetry between /lab-requests and /radiology-requests as separate top-level resources, when they share nearly identical lifecycle and structure (Phase 6/8), is worth a second look — a unified /diagnostic-requests?type=lab|radiology resource might reduce API surface without losing clarity, though I'd weigh this against the genuine specialty-specific fields each eventually needs (Phase 2.5's specialty-aware workspace differences) before committing either way.
Poor endpoint naming: none found that violate the established conventions, but worth flagging preemptively: as new endpoints are added post-V1, the temptation to introduce action-style URLs (/doctors/{id}/verify as a verb-in-path pattern) instead of resource-state-transition PATCHes (PATCH /verifications/{id} with a status field) should be resisted — the latter is more consistent with this document's resource-oriented philosophy (Section 1).
Overloaded endpoints: GET /patients/{id}/health-passport risks becoming an overloaded "give me everything" endpoint if not disciplined — recommend it explicitly return only Tier 1/2 summary data by default (Phase 2.5's Patient 360 hierarchy, applied here to API payload size specifically), with Tier 3 detail (full document archive, full Insurance detail) requiring separate, explicit sub-resource calls — mirroring the UI's progressive disclosure principle at the API contract level, not just the frontend level.
Security risks: the AI_SERVICE_UNAVAILABLE-as-200 design choice (Section 7) is defensible and intentional, but worth flagging as a place a security review should specifically verify that "AI unavailable" responses can never be spoofed/forced by a malicious client to suppress a genuine safety warning that should have blocked an action (Section 7's Medical Safety Warning distinction) — this is a subtle interaction between two deliberately-designed error behaviors that deserves explicit test coverage.
Performance risks: GET /patients/{id}/health-graph without the include/tier-scoping discipline above could become a very large, slow payload as a patient's clinical history grows over years — this is the API-layer manifestation of Phase 8's recursive-CTE performance risk, and the contract design itself (mandatory scoping/pagination on this specific endpoint) is part of the mitigation, not just a backend query optimization concern.
Versioning risks: the aiMetadata response block (Section 6) is exactly the kind of field likely to evolve fastest (new AI capabilities, new metadata needs) — worth explicitly designing it as an open, additive JSON object from V1 rather than a rigid, fully-enumerated structure, so it can grow without triggering major-version bumps.
Healthcare compliance concerns: GET /audit-logs (admin-only) needs its own audit trail (Phase 6/8's "auditing the audit log's access" requirement) explicitly reflected in this endpoint's documented behavior, not left implicit — worth adding a note in the eventual OpenAPI spec itself, not just this governance document, so implementers don't miss it.

Scores

API Readiness Score: 87/100
Consistency Score: 88/100 (uniform envelopes, error format, and pagination strategy applied without exception across the resource catalog)
Security Score: 86/100 (idempotency-key enforcement, consent-aware authorization, and correlation-ID audit linkage are all concretely specified; the AI-unavailable/safety-warning interaction flagged above needs explicit test coverage before this goes higher)
Developer Experience Score: 85/100 (predictable URLs, consistent conventions, mock-server-from-spec workflow)
Maintainability Score: 86/100 (clear versioning/deprecation policy, additive-only compatibility rule)


Is the platform ready for OpenAPI specification generation and implementation?
Yes. The resource catalog, endpoint patterns, request/response contracts, error model, and conventions are specific and consistent enough to generate a real OpenAPI 3.x specification directly from this document without further product-level decisions needed.
Two items worth resolving during spec generation itself, not before starting it:

The /lab-requests vs. /radiology-requests unification question (Section 15) — a reasonable default is to keep them separate for V1 (simpler, matches Phase 6/8's existing table design) and revisit consolidation only if real API usage shows meaningful duplication pain.
Explicit test coverage for the AI-unavailable/safety-warning interaction (Section 15) should be written into the contract-testing plan (Section 14) as the spec is generated, not treated as a follow-up.

Neither blocks starting — both are refinements to make during, not before, the next phase's spec-writing work.