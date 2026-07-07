Phase 9 — Backend Module Design (NestJS Enterprise Architecture)
Fully implementation-independent, as instructed — this is the blueprint a NestJS team would build against, not the code itself.

1. Backend Philosophy
PrincipleWhy it exists here specificallyModular MonolithLocked in at ADR-001 (Phase 4) — this document operationalizes it as NestJS modules with enforced boundaries, not a rehash of the decision.Domain-Driven DesignEvery NestJS module maps 1:1 to a Phase 3/6 bounded context — this alignment is what makes "Phase 8's schema" and "Phase 9's module" the same mental model wearing different clothes, which is exactly the point.Clean/Hexagonal Architecture per moduleKeeps each module's domain logic ignorant of Postgres, S3, or any specific AI provider — this is what makes ADR-002's model-routing swap or a future video-provider swap (Phase 4, Section 11) cheap rather than a rewrite.Event-Driven for cross-module reactionPhysical implementation of Phase 3/4's event map — NestJS's event emitter (in-process for V1, upgradeable to a real message broker later without changing publisher/subscriber code, per Section 14).SOLIDNot a slogan — specifically Dependency Inversion is what lets Application layers depend on Domain interfaces rather than Infrastructure implementations (Section 5), which is the mechanical basis for testability and the future extraction path.Feature Isolation / Explicit BoundariesA module never reaches into another module's internals (repositories, entities) — only its published interface (Section 4). This is the concrete NestJS-level enforcement of Phase 3's "no shadow copies of another domain's data" rule.Secure by DefaultEvery module assumes a request is unauthenticated/unauthorized until proven otherwise — guards applied at the framework boundary, never opt-in per endpoint (Phase 4's Security Architecture, made a coding convention).Observable by DefaultEvery cross-module call and event is traceable (Section 10) — in a system where Phase 4/7 both insisted on liability-reconstruction and audit completeness, "we can add logging later" is not an acceptable posture.

2. Module Catalog
For each: Purpose / Responsibilities / Owned Entities / Owned Events / Dependencies / Public Interfaces / Private Responsibilities / Future Split Strategy.
IdentityModule

Purpose: Authentication and account lifecycle.
Owned entities: Account, Session.
Owned events (published): AccountCreated, AccountSuspended, SessionStarted.
Dependencies: None on other business modules (foundational).
Public interface: createAccount(), authenticate(), getAccountRole(accountId).
Private: Password hashing, session token issuance details.
Future split: Low priority — could become a shared platform-auth service early if multiple products ever consume it, but not scale-driven.

AuthModule (distinct from Identity — authorization, not authentication)

Purpose: RBAC/permission evaluation.
Owned entities: None (stateless policy evaluation over roles from Identity + trust status from Trust).
Dependencies: IdentityModule (role), TrustModule (verification status for doctor-gated actions).
Public interface: can(actor, action, resource) policy check, consumed by every other module's guards.
Future split: Natural candidate to become an ABAC engine (Phase 4) without touching consuming modules' code, since they only ever call the same can() contract.

TrustModule

Purpose: Verification workflow, consent state, audit-visible trust data.
Owned entities: VerificationCase, ConsentRecord, SecurityEvent.
Owned events: DoctorVerified, DoctorSuspended, ConsentGranted, ConsentRevoked, SecurityEventDetected.
Dependencies: IdentityModule (accounts to verify), AdministrationModule (executes decisions, Trust holds resulting state — Phase 3's ownership split, now a module dependency).
Public interface: getConsentState(patientId, doctorId, scope), isVerified(doctorId).
Private: License-matching logic, re-verification scheduling internals.
Future split: Low priority for extraction, but candidate for a dedicated Trust/Compliance team ownership boundary regardless of deployment topology.

PatientModule

Purpose: Patient account-level health context (Health Passport container).
Owned entities: PatientProfile, EmergencyContact, GuardianLink.
Owned events: PatientProfileUpdated.
Dependencies: IdentityModule, ClinicalModule (read-only, for composing the Health Passport display — never writes).
Public interface: getHealthPassport(patientId) (composes own data + a read call to ClinicalModule).
Future split: Unlikely.

DoctorModule

Purpose: Professional identity/Portfolio, availability.
Owned entities: DoctorProfile, PortfolioPublication, PortfolioAward, AvailabilityWindow.
Owned events: DoctorProfileUpdated, AvailabilityChanged.
Dependencies: IdentityModule, TrustModule (consumes DoctorVerified to unlock Portfolio visibility).
Public interface: getAvailability(doctorId, dateRange), getPortfolio(doctorId).
Future split: Unlikely.

ClinicalModule (the heaviest — Phase 3/4/8's flagged complexity concentration)

Purpose: Sole owner of clinical truth — Health Graph, Journeys, Notes, Prescriptions, Lab/Radiology, Observations, Referrals.
Owned entities: All clinical schema tables (Phase 8).
Owned events: HealthGraphUpdated, JourneyUpdated, PrescriptionSigned, LabRequestCreated, DiagnosisRecorded.
Dependencies: ConsultationModule (context of which session a note belongs to), AIModule (consumes approved suggestions only — never calls out to AI itself; AI calls in), ReferenceDataModule (ICD-11, Drug Catalog).
Public interface: recordClinicalNote(), signPrescription(), getPatient360(patientId, consultationContext), getJourney(journeyId).
Private: Graph traversal internals, node/edge creation rules, certainty-level state machine enforcement.
Future split: The one module most likely to need internal sub-structuring (separate internal "sub-modules" for Graph, Prescriptions, Lab/Radiology within the same NestJS module boundary) well before any external service extraction is warranted — restated from Phase 8's readiness review as an engineering-org concern now, not just a schema concern.

ConsultationModule

Purpose: Orchestrates booking through session closure; owns Emergency Escalation state.
Owned entities: Appointment, ConsultationSession, SessionConnectionLog.
Owned events: AppointmentBooked, ConsultationStarted, ConsultationCompleted, ConsultationInterrupted, EmergencyEscalationTriggered.
Dependencies: DoctorModule (availability), PatientModule (booking initiator), PaymentModule (charge confirmation), Realtime infrastructure (Section 9/external to NestJS request/response cycle).
Public interface: bookAppointment(), startSession(), closeSession().
Future split: First extraction candidate (Phase 4's Section 3/13) — video/session load scales independently of the rest of the monolith.

SchedulingModule

A genuinely new addition worth naming here, not present in earlier phases as its own module: I'd recommend splitting Availability-slot-holding/reservation logic out of ConsultationModule into its own thin SchedulingModule, since the double-booking race condition (Phase 2 edge case 17, Phase 8's hot-table flag) deserves focused, isolated logic (reservation locks, timeout handling) rather than being buried inside the broader Consultation orchestration concern.
Owned entities: none of its own — operates on DoctorModule's AvailabilityWindow with a transient reservation concept.
Dependencies: DoctorModule, ConsultationModule.
Public interface: reserveSlot(), releaseSlot(), confirmSlot().

KnowledgeModule

Purpose: Articles, follows, saves.
Owned entities: KnowledgeArticle, ArticleVersion, ArticleFollow, ArticleSave.
Owned events: KnowledgeArticlePublished, ContentFlagged.
Dependencies: DoctorModule (authorship), TrustModule (DoctorVerified gates publishing), AdministrationModule (moderation outcomes).
Public interface: publishArticle(), followDoctor().
Future split: Unlikely.

NotificationModule

Purpose: Pure delivery/routing — never originates meaning (Phase 3's hard rule).
Owned entities: Notification (delivery record).
Owned events: none of note (consumes broadly, produces nothing others depend on).
Dependencies: Consumes events from every module; calls out to Email/SMS/Push adapters (Section 7).
Public interface: none inbound — purely event-consuming.
Future split: Easy, low-risk, low-priority extraction whenever convenient (Phase 4's assessment stands).

PaymentModule

Purpose: Transactions, payouts.
Owned entities: PaymentTransaction, PayoutStatement.
Owned events: PaymentCompleted, RefundIssued.
Dependencies: ConsultationModule (what's being paid for), external PSP adapter (Section 7/11).
Public interface: initiateCharge(), issueRefund().
Future split: Natural eventual candidate given PCI-adjacent isolation value, not urgent for V1 (Phase 4's assessment stands).

AIModule

Purpose: Suggestion generation across all four AI domains (Clinical/Doctor/Patient/Operational Intelligence, Phase 1.2/4), model routing, safety gating.
Owned entities: AISuggestion, AIContext, PromptVersion reference usage.
Owned events: AISuggestionGenerated, AISuggestionApproved (the latter technically triggered by ClinicalModule's action, logged here).
Dependencies: ClinicalModule (read-only scoped Graph query), ConsultationModule (live context), ReferenceDataModule (Drug Catalog for deterministic checks), external AI provider adapters.
Public interface: generateSuggestion(type, context) — returns a draft only, never writes to ClinicalModule directly.
Private: Model routing logic, prompt templating, safety-layer thresholds.
Future split: Second extraction candidate (Phase 4) — genuinely different compute profile (potentially GPU-bound, latency-sensitive, provider-dependent).

AssetModule

Purpose: File/media metadata management (binary in external object storage).
Owned entities: MediaAsset.
Dependencies: Referenced by ClinicalModule, ConsultationModule, PatientModule — but AssetModule itself depends on nothing business-specific, only the storage adapter.
Public interface: uploadAsset(), getAssetUrl() (signed, time-limited).
Future split: Moderate-priority candidate given distinct storage/bandwidth profile.

AuditModule

Purpose: Immutable audit trail.
Owned entities: AuditLogEntry.
Dependencies: Consumed by every module (cross-cutting, Section 7) — AuditModule itself depends on nothing.
Public interface: recordAuditEntry() — write-only from the perspective of other modules; read access is Administration-only.
Future split: Should likely be extracted early given its "never trust the same infrastructure as operational data" principle (Phase 4/8) — separate physical storage argues for separate deployment sooner rather than later.

ConfigurationModule

Purpose: Feature flags, business rule parameters, provider configuration (Phase 6, Section 10).
Owned entities: FeatureFlag, BusinessRuleParameter, ProviderConfiguration.
Dependencies: none — consumed by everything.
Public interface: isFeatureEnabled(), getParameter().

ReferenceDataModule

Purpose: Slowly-changing shared vocabularies (Phase 6, Section 9).
Owned entities: all reference schema tables.
Dependencies: none — consumed by ClinicalModule, DoctorModule, NotificationModule, etc.
Public interface: getSpecialty(), getICD11Code(), getDrugCatalogEntry(), checkInteraction() (the deterministic lookup itself, per Phase 2.5/4's ADR-002 — this lives here, not in AIModule, since it's a data lookup, not a generative concern).

AnalyticsModule

Purpose: Derived, read-only aggregation.
Owned entities: AnalyticsSnapshot.
Dependencies: Consumes events from every module; never called synchronously by anything operational (Phase 4/5's hard rule).
Public interface: getDoctorAnalytics(), getPlatformAnalytics().

AdministrationModule

Purpose: Moderation/verification workflow execution.
Owned entities: ModerationCase.
Dependencies: TrustModule (state changes it triggers), KnowledgeModule (flagged content).
Public interface: openModerationCase(), resolveCase().


3. Dependency Rules
ModuleAllowed dependenciesForbidden dependenciesIdentityModulenoneEverything — this is foundational and must never depend "up" into business modulesAuthModuleIdentityModule, TrustModuleClinicalModule, ConsultationModule (authorization shouldn't need to know clinical/consultation internals, only role + trust status)TrustModuleIdentityModuleClinicalModule (Trust never needs to see clinical content itself)PatientModuleIdentityModule, ClinicalModule (read-only)Never writes to ClinicalModule — this is the one dependency direction requiring the most discipline (Phase 5's "shadow copy" risk, restated as a hard forbidden-write rule)DoctorModuleIdentityModule, TrustModuleClinicalModule (a Doctor's professional identity has no reason to know clinical content)ClinicalModuleConsultationModule (context), ReferenceDataModuleNever depends on AIModule — AIModule calls into Clinical's read interface, not the reverse; Clinical must never block on or require AI availability (Phase 2.5's "AI unavailable → manual workflow still works" made a hard dependency-direction ruleConsultationModuleDoctorModule, PatientModule, PaymentModule, SchedulingModuleClinicalModule (Consultation orchestrates the episode, never authors clinical content itself — Phase 3's split enforced here)SchedulingModuleDoctorModuleClinicalModule, PaymentModuleKnowledgeModuleDoctorModule, TrustModule, AdministrationModuleClinicalModule, PatientModule (Knowledge content is doctor-authored and patient-consumed, but Knowledge itself never touches clinical data directly — personalization by active Journey, per Phase 3's flywheel, is achieved by PatientModule/frontend composing both, not KnowledgeModule reaching into Clinical)PaymentModuleConsultationModuleClinicalModule (payments never need clinical context)AIModuleClinicalModule (read-only), ConsultationModule (read-only), ReferenceDataModuleNever has write access to ClinicalModule — enforced at the dependency-injection level: AIModule is never given a reference to Clinical's write-side repository/service, only its read-query interfaceAssetModulenoneAny business module — Asset is a pure utility consumed by others, never a consumer itselfAuditModulenoneEverything — pure sink, never a source of business logicConfigurationModule, ReferenceDataModulenoneEverything — pure utility/lookup providersAnalyticsModule(event consumption only, no synchronous dependency)Direct synchronous dependency from any operational module — nothing should ever await a call to AnalyticsModule in a user-facing request pathAdministrationModuleTrustModule, KnowledgeModuleClinicalModule directly (moderation of clinical-adjacent issues, if ever needed, should go through TrustModule's interface, not reach into Clinical)
Circular dependency risks, named explicitly: ClinicalModule ↔ ConsultationModule is the one pairing genuinely at risk of circularity (Clinical needs Consultation's session context; Consultation's ConsultationCompleted event triggers Clinical's Journey Update) — resolved by making this relationship event-driven in the Consultation→Clinical direction, and read-only-query in the Clinical→Consultation direction, never a synchronous two-way service dependency. This asymmetry must be enforced in module registration (Consultation never imports Clinical's providers; Clinical only imports a narrow read-only Consultation query interface), not left to convention.
Shared contracts: module-to-module calls happen only through explicitly exported interfaces (Section 4), never by importing another module's internal providers — this is the NestJS-level mechanism enforcing Phase 3's "reference by ID, not by data copy" rule.

4. Public Contracts
Representative for the highest-traffic modules (full enumeration for all 18 would be repetitive of the same pattern):
ClinicalModule

Commands accepted: RecordClinicalNote, SignPrescription, CreateLabRequest, UpdateJourneyStage, CreateReferral.
Queries exposed: GetPatient360, GetJourney, GetHealthGraphSubgraph(scope).
Events published: HealthGraphUpdated, JourneyUpdated, PrescriptionSigned, LabRequestCreated.
Events consumed: ConsultationCompleted (triggers Journey Update finalization), AISuggestionApproved (only entry point for AI-originated content, per the write-gate rule).
Internal-only: certainty-level transition validation, part_of edge construction logic.

ConsultationModule

Commands accepted: BookAppointment, StartSession, CloseSession, TriggerEmergencyEscalation.
Queries exposed: GetUpcomingAppointments, GetSessionState.
Events published: AppointmentBooked, ConsultationStarted, ConsultationCompleted, EmergencyEscalationTriggered.
Events consumed: PaymentCompleted (confirms paid booking), AvailabilityChanged.
Internal-only: session state machine transition guards.

AIModule

Commands accepted: RequestSuggestion(type, contextRef).
Queries exposed: GetSuggestionHistory(consultationId).
Events published: AISuggestionGenerated.
Events consumed: ConsultationStarted (activates), HealthGraphUpdated (refreshes context relevance).
Internal-only: model routing decision logic, prompt template resolution.

TrustModule

Commands accepted: SubmitVerification, GrantConsent, RevokeConsent, RecordSecurityEvent.
Queries exposed: IsVerified(doctorId), GetConsentState(patientId, doctorId, scope).
Events published: DoctorVerified, DoctorSuspended, ConsentGranted, ConsentRevoked.
Internal-only: license-matching algorithm.

General pattern for the remaining 14 modules: Commands = state-changing operations exposed only through the module's application service; Queries = read models exposed for cross-module composition; Events published/consumed per the Phase 3/4/8 event maps already established (no new events introduced here beyond what those phases defined — this document operationalizes them, doesn't reinvent them).

5. Internal Structure (Clean Architecture per Module)
Every module follows the same internal layering, using ClinicalModule as the representative example:
clinical/
├── domain/
│   ├── entities/          (HealthGraph, HealthGraphNode, Journey, ClinicalNote, Prescription — pure domain objects, no framework/DB dependency)
│   ├── value-objects/     (CertaintyLevel, ClinicalCoding, ConsultationContext)
│   ├── domain-services/   (JourneyStageTransitionPolicy, NodeCreationInvariantChecker)
│   ├── specifications/    (CanSignPrescription — encapsulates the "no unacknowledged Warning" rule from Phase 8)
│   └── events/            (domain event definitions: HealthGraphUpdated, etc.)
├── application/
│   ├── commands/          (RecordClinicalNoteHandler, SignPrescriptionHandler — orchestrate domain + repositories)
│   ├── queries/            (GetPatient360Handler)
│   ├── policies/           (authorization policies specific to clinical actions, consumed by AuthModule's guard)
│   └── ports/              (interfaces the application layer needs: ClinicalRepository, AIModuleReadPort — implemented in infrastructure)
├── infrastructure/
│   ├── repositories/       (Postgres implementations of the domain repository interfaces)
│   ├── mappers/            (domain entity ↔ persistence row mapping)
│   └── adapters/           (any external service calls this module needs — none typically, Clinical stays internally focused)
├── presentation/
│   └── controllers/        (thin — delegate immediately to application command/query handlers)
└── module definition (NestJS module wiring — providers, exports, imports)
Layer responsibilities, stated once generally:

Domain — pure business logic and rules, zero framework/infrastructure knowledge; this is what makes the "no orphan prescriptions," "no in-place clinical edits" rules (Phases 5–8) testable in complete isolation from any database.
Application — orchestrates domain objects and repositories to fulfill a use case; this is where transactional boundaries (Phase 5's aggregate consistency rule) are actually enforced.
Infrastructure — the only layer allowed to know about Postgres, S3, or an external AI provider; swappable without touching Domain or Application (this is what makes ADR-002's routing swap or a future video-provider swap cheap).
Presentation — HTTP/controller concerns only; contains no business logic whatsoever, a thin translation layer.
Factories — construct valid aggregates (e.g., a HealthGraphNodeFactory that enforces required fields per node type, Phase 6's typed-node complexity) rather than allowing ad hoc object construction scattered through command handlers.
Repositories — one per aggregate root (Phase 5/6), never a generic "repository for everything" — this mirrors the aggregate boundaries exactly.


6. Shared Kernel
What belongs in Shared:

Base entity/aggregate root abstractions (common identity, timestamp conventions from Phase 8).
Result/Either types (for explicit success/failure handling without exceptions-as-control-flow).
Common error types (NotFoundError, ValidationError, ForbiddenError — generic, domain-agnostic).
Cross-cutting guards/decorators (auth guard, audit-logging decorator — Section 7).
Common utilities (date/timezone handling per Phase 2's rule, ID generation).
Shared domain event base interface/bus contract.
Logging/tracing utilities (Section 7).
Common validation primitives (not business rules — just structural validation like "is this a valid UUID").

What must NEVER be shared, explicitly:

Any entity or value object specific to a single domain (a HealthGraphNode type has no business being importable from outside ClinicalModule, even via Shared — that would recreate the exact cross-domain coupling this whole architecture exists to prevent).
Business rules/policies specific to one domain (the "no unacknowledged Warning before signing" rule belongs in ClinicalModule's domain layer, never generalized into Shared just because it feels reusable-looking).
Repository implementations — these are infrastructure details of one module, never a shared data-access layer that multiple modules write through (that would silently violate single-ownership, Phase 5's cardinal rule).
Anything that would let one module's internal data shape leak into another's expectations — Shared is for genuinely domain-agnostic plumbing only, and the moment something in Shared starts accumulating domain-specific branches ("if this is a Prescription vs. a Journey..."), that's a signal it was misplaced.


7. Cross-Cutting Concerns
ConcernOwnershipAuthenticationIdentityModule, applied via a global guardAuthorizationAuthModule's can() contract, applied via per-route/command guards referencing module-specific policies (Section 5)CachingA shared caching utility (Redis-backed per Phase 4/8's technology assumption) — but cache invalidation logic lives in the owning module, never in a generic cross-cutting cache service that doesn't understand domain event boundariesLoggingShared Kernel utility, structured/consistent format across modulesAuditAuditModule, invoked via a decorator/interceptor pattern so modules don't need to manually remember to call it for every sensitive read (Phase 8's PHI-access-must-log rule, made a framework-level interceptor rather than per-handler discipline)Metrics/TracingShared observability utility, instrumenting cross-module calls specifically (Phase 4's "trace a request through Consultation → Clinical → AI Layer" requirement)ConfigurationConfigurationModuleFeature FlagsConfigurationModuleLocalizationA shared i18n utility, consuming ReferenceDataModule's language/locale dataValidationStructural validation (Shared Kernel) vs. business validation (each module's Domain layer) — deliberately not conflatedError Handling / Exception MappingA shared global exception filter translating domain-layer Result/Error types into consistent API responses, without leaking internal domain detailsFile StorageAssetModuleEmail/SMS/PushNotificationModule's adapter layer (Phase 4/8)
Audit-as-interceptor is worth calling out specifically: rather than every module remembering to manually call AuditModule.record(), PHI-touching queries/commands are annotated (e.g., a decorator marking a handler as audit-required), and a global interceptor handles the actual recording — this converts Phase 8's noted limitation ("PostgreSQL can't enforce 'must also write to audit'") into an application-layer guarantee that doesn't depend on individual developer discipline.

8. Event Architecture
EventPublisherSubscribersDelivery guaranteeFailure strategyIdempotencyAppointmentBookedConsultationModulePaymentModule, NotificationModule, DoctorModuleAt-least-onceRetry with backoff; NotificationModule failures don't roll back the booking (notification is best-effort, booking is not)Consumer-side idempotency key = appointment IDConsultationCompletedConsultationModuleClinicalModule (Journey finalization), PaymentModule (payout trigger), NotificationModuleAt-least-onceClinical consumption is the critical path — a failed handler here must alert/retry aggressively, not silently dropIdempotency key = consultation session IDPrescriptionSignedClinicalModuleNotificationModule, PatientModule (Passport refresh)At-least-onceBest-effort for Notification; PatientModule refresh can lag (eventual consistency, Phase 5)Idempotency key = prescription IDHealthGraphUpdatedClinicalModulePatientModule, AIModule (context refresh)At-least-onceNon-critical consumers — a missed refresh self-heals on next queryIdempotency key = node/edge ID + versionConsentGranted/ConsentRevokedTrustModuleClinicalModule (access filtering cache invalidation), PatientModule, NotificationModuleAt-least-once with synchronous fallback check — access-control decisions must never rely solely on eventual event propagation; ClinicalModule's read path always re-checks TrustModule synchronously regardless of cached event state (restating Section 3's consistency rule from Phase 5 as a hard implementation requirement)—Idempotency key = consent record versionDoctorVerifiedTrustModuleIdentityModule, DoctorModule, KnowledgeModuleAt-least-once—Idempotency key = verification case IDPaymentCompletedPaymentModuleConsultationModule, NotificationModuleAt-least-onceConsultationModule's confirmation logic must be idempotent against retried deliveryIdempotency key = transaction IDKnowledgeArticlePublishedKnowledgeModuleNotificationModule (followers), AnalyticsModuleAt-least-onceBest-effortIdempotency key = article ID + versionAISuggestionApprovedAIModule (logs) / ClinicalModule (acts)AnalyticsModule (acceptance-rate KPI)At-least-once—Idempotency key = suggestion IDNotificationRequestedAny module (generic internal signal, not one of the named business events)NotificationModuleAt-least-onceRetried per channel-specific policy (Section 9)Idempotency key = source event ID + channel
General delivery guarantee stated once: at-least-once delivery is the standard assumption platform-wide (V1's in-process event emitter is upgradeable to a real broker later without changing this contract, per Phase 4's evolution path) — every subscriber handler must therefore be idempotent by design, not by exception.

9. Background Jobs
JobTriggerPriorityRetry policyFailure handlingNotification delivery (Email/SMS/Push)Event-driven (NotificationRequested)Medium, high for critical (appointment reminders, security events)Exponential backoff, 3–5 attemptsPersistent failure logged, surfaced to Admin queue-health dashboard (Phase 2's monitoring recommendation)AI suggestion processingEvent-driven (ConsultationStarted, live transcript chunks)High (latency-sensitive, live consultation)Minimal retry — a timeout here should fail gracefully to "AI unavailable" state (Phase 2.5), not retry indefinitely and block the doctorSilent to the doctor beyond the graceful-degradation UX (Phase 2)Reminder scheduling (appointment/follow-up)Scheduled/cronLow-mediumStandard retryMissed reminder logged, not user-facing criticalAudit export (for compliance/legal requests)On-demand, admin-triggeredLow (async, can take time)Retry until success, since correctness matters more than speed hereEscalate to admin if repeatedly failingCleanup (expired sessions, old notifications per retention window)Scheduled/cronLowRetry, non-urgentLog and continueAnalytics refresh (materialized view refresh, Phase 8)Scheduled/cronLowRetryStale data flagged with "last updated" timestamp (Phase 2's UX rule) rather than blockingObject storage cleanup (post-retention Media Asset deletion)Scheduled/cronLowMust check legal_hold flag (Phase 8) before executing — this is a correctness-critical check, not just a retry concernNever delete on ambiguous/failed legal-hold check — fail closedSearch indexingEvent-driven (per Phase 4/8's eventually-consistent projection model)MediumRetry with backoffProlonged failure surfaces as a search-staleness alert, not a silent gap

10. Security Integration

Keycloak (or equivalent IdP): IdentityModule delegates actual credential verification/session issuance to Keycloak conceptually — NestJS's IdentityModule becomes a thin integration layer rather than reimplementing auth primitives from scratch, consistent with "don't build what's a solved problem" (Phase 4's video-infrastructure reasoning, applied here to auth).
RBAC: AuthModule's can() contract (Section 2/4), backed by role data from Identity + verification status from Trust.
Future ABAC: AuthModule's policy evaluation layer is designed to accept additional attribute predicates without changing its external can() contract — consuming modules never need to change when RBAC evolves into ABAC underneath (Phase 4's stated future path).
Consent checks: enforced at ClinicalModule's query layer itself (Section 3's dependency rule) — never left to the API gateway or frontend to enforce, since that would be bypassable by direct API calls.
Audit logging: the interceptor pattern (Section 7) — automatic, not manually invoked.
RLS (Row-Level Security) support: PostgreSQL RLS policies (Phase 8's schema-per-domain permissioning) provide a second, database-level enforcement layer beneath the application-level consent checks — defense in depth specifically for clinical and trust schemas, so a bug in application-layer consent logic doesn't become a full data exposure.
Feature flags: ConfigurationModule, checked at the application-service layer before executing gated logic (e.g., a new AI capability rollout, Phase 6's rationale).
Rate limiting: applied at the API gateway/global guard level, tuned per-endpoint sensitivity (Phase 4) — booking/search endpoints tolerate higher rates than authentication or prescription-signing endpoints.
Session validation: IdentityModule's session check runs on every request via global guard; sensitive actions (prescription signing) additionally require a fresh re-authentication check regardless of session validity (Phase 4's Security Architecture, Section 8).


11. Module Communication
PatternWhen to useDirect calls (in-process, synchronous)Same-module logic; cross-module reads where an immediate answer is required for correctness (e.g., ConsultationModule synchronously checking DoctorModule's availability before confirming a booking)Domain eventsCross-module reactions where the producer doesn't need an answer (ConsultationCompleted → ClinicalModule's Journey finalization)Application servicesThe orchestration layer within a single module coordinating its own domain objects and repositories — never used to reach across module boundaries directlyRepositoriesStrictly module-internal — no module ever queries another module's repository directly, only through its published query interface (Section 4)Background jobsNon-urgent or genuinely asynchronous work (Section 9) — never used to route what should be a synchronous consistency-critical operation (e.g., consent checks are never deferred to a background job)
The rule that prevents unnecessary coupling, stated plainly: if Module A needs to react to something Module B did, that's an event. If Module A needs an immediate answer to proceed, that's a direct call to B's published query interface — never a reach into B's internals, and never more than one hop deep synchronously across module boundaries in a single request path (Phase 4's rule, restated at the NestJS level).

12. Sequence Diagrams (Textual)
Patient Registration:

Client → IdentityModule: createAccount.
IdentityModule validates uniqueness, creates Account, publishes AccountCreated.
PatientModule (subscriber) creates an empty PatientProfile shell referencing the new Account.
NotificationModule sends welcome/verification message.

Doctor Verification:

Client → DoctorModule: submit professional details + documents (via AssetModule for file storage).
DoctorModule → TrustModule: SubmitVerification command.
TrustModule creates VerificationCase, notifies AdministrationModule's queue.
Admin reviews (AdministrationModule → TrustModule: decision).
TrustModule publishes DoctorVerified.
DoctorModule (subscriber) unlocks Portfolio visibility; KnowledgeModule (subscriber) unlocks publishing rights; IdentityModule (subscriber) elevates role capabilities.

Appointment Booking:

Client → SchedulingModule: reserveSlot (short-lived hold, Phase 8's race-condition mitigation).
SchedulingModule checks DoctorModule's AvailabilityWindow, places a hold.
Client → PaymentModule: initiateCharge (paid) or skip (free, per Phase 1's structural difference).
On payment success, PaymentModule publishes PaymentCompleted.
ConsultationModule (subscriber) confirms the Appointment, publishes AppointmentBooked.
SchedulingModule releases the hold as consumed. NotificationModule sends confirmations.

Video Consultation:

Client → ConsultationModule: startSession (within the allowed pre-appointment window).
ConsultationModule transitions state, publishes ConsultationStarted.
AIModule (subscriber) activates live transcription/context tracking for this session.
ClinicalModule synchronously queried by the frontend (via Consultation's context) for GetPatient360.
Live suggestions stream from AIModule to the client via the Realtime layer (outside standard request/response — Phase 4, Section 6).
Doctor → ConsultationModule: closeSession, publishes ConsultationCompleted.

Prescription Signing:

Doctor → ClinicalModule: SignPrescription command.
ClinicalModule's domain specification (CanSignPrescription, Section 5) checks for unacknowledged Warning-tier AI suggestions on this consultation — queries AIModule's suggestion history.
If blocked, returns a validation failure requiring acknowledgment first.
If clear, ClinicalModule persists the signed Prescription (immutable, Phase 8), publishes PrescriptionSigned.
NotificationModule and PatientModule react accordingly.

Health Graph Update:

Occurs as part of the same transaction as Clinical Note/Diagnosis recording (Phase 5's aggregate boundary) — not a separate standalone sequence, but a sub-step within RecordClinicalNote's command handler.
ClinicalModule creates/links nodes and edges, updates the relevant Journey's stage, all within one application-service transaction.
Publishes HealthGraphUpdated and JourneyUpdated together at the end of that single transaction.

AI Suggestion Approval:

AIModule generates a suggestion (event-driven off ConsultationStarted/ongoing transcript), publishes AISuggestionGenerated.
Doctor reviews in the Workspace UI, sends an approval/edit/reject decision.
Client → ClinicalModule (not AIModule) with the doctor's finalized content, referencing the AISuggestion ID it was derived from.
ClinicalModule persists the content as its own authored record (Note/Prescription), publishes its own event (PrescriptionSigned, etc.).
ClinicalModule also signals AIModule (direct call or event) to mark the AISuggestion's doctorDecision field — this is the concrete mechanism enforcing "AI never writes to Clinical directly" (Section 3): the write of clinical content happens in Clinical; the write of the suggestion's disposition happens in AI, and these are two separate writes to two separate modules' own data.

Payment:

Client → PaymentModule: initiateCharge.
PaymentModule calls the external PSP adapter (Section 7/Phase 4's Section 11).
On success, PaymentModule persists the transaction, publishes PaymentCompleted.
ConsultationModule (subscriber) confirms booking (per the Booking sequence above).

Knowledge Article Publishing:

Doctor → KnowledgeModule: publishArticle.
KnowledgeModule checks TrustModule's isVerified() and the doctor's trust-tier (Phase 1.1's pre-vs-post-publication review rule).
If new/low-tier doctor, routes to AdministrationModule's moderation queue first; if established, publishes directly.
On publish, KnowledgeModule publishes KnowledgeArticlePublished.


13. Testing Strategy
Test typeResponsibilityUnitEvery module's Domain layer (entities, value objects, domain services, specifications) — tested with zero framework/infrastructure dependency, per Clean Architecture's whole point (Section 5)IntegrationApplication layer + real (test) database — verifying repository implementations and transactional boundaries (Phase 5's aggregate atomicity) actually holdContractBetween modules — verifying published Commands/Queries/Events (Section 4) haven't silently changed shape; this is the automated enforcement Phase 4's Section 12 flagged as a hard CI gate for domain-boundary integrityE2EFull user flows (Phase 2's catalogue) run against a complete, running system — booking, consultation, prescription signing end to endPerformanceSpecifically targeted at the flagged risk areas: Health Graph recursive-CTE traversal (Phase 8), booking race-condition handling under concurrent load (Section 9's Scheduling isolation)SecurityPenetration-style testing of consent-check enforcement (attempting to bypass via direct API calls, per Section 10's "never trust frontend-only enforcement" rule), RLS policy verificationMutation testing (future)Particularly valuable for ClinicalModule's domain specifications (e.g., CanSignPrescription) given how safety-critical that logic is — flagged as future rather than V1 given the tooling/time investment, but worth prioritizing for exactly this module first once adopted

14. Scalability — Module-to-Service Evolution
When should a module become a separate service? When at least two of the following are simultaneously true: (1) its load profile is fundamentally different from the rest of the monolith (compute-bound vs. I/O-bound, latency-sensitive vs. tolerant), (2) it can scale independently without needing synchronous access to other modules' fresh state, (3) the operational cost of separate deployment is justified by actual measured load, not anticipated load.
Trigger points, concretely:

ConsultationModule (Realtime/video): extract once video session volume alone justifies independent autoscaling — Phase 4's ~100k-user tier estimate.
AIModule: extract once GPU/compute cost and provider-latency characteristics diverge enough from the rest of the monolith to justify separate infrastructure — likely around the same scale tier, possibly sooner if a specific AI provider requires specialized hosting.
AuditModule: worth extracting earlier than load alone would suggest, specifically for the "separate infrastructure from operational data" security principle (Phase 4/8) — this is a security-driven extraction trigger, not a load-driven one, and is worth doing proactively rather than waiting for a scale threshold.
PaymentModule: extract when PCI-adjacent isolation benefits outweigh the operational cost — a compliance-driven trigger, similar reasoning to Audit.
NotificationModule, AnalyticsModule: easy, low-risk, whenever convenient — not scale-driven, more a "why not, it's cheap" opportunity.

What must never change during any of these extractions: the published Commands/Queries/Events contracts (Section 4) — if a module's external contract is stable, extracting it into a separate service is a deployment/infrastructure change, not an API-consumer-facing change. This is the entire payoff of the discipline enforced in Sections 3–6.

15. Final Backend Architecture Review
Modules too large: ClinicalModule remains, honestly and consistently across every phase since Phase 2.5, the single largest module in the system — this document's addition of explicit internal sub-structuring guidance (Section 5's Graph/Prescription/Lab internal separation) is the mitigation, but it deserves a dedicated senior engineer/tech-lead ownership assignment from day one, not a rotating generalist team.
Modules that should merge: None identified — the catalog in Section 2 is already fairly lean (18 modules), and I'd resist the temptation to consolidate further; e.g., merging AuditModule into ConfigurationModule "since they're both small" would violate the security-isolation reasoning (Section 14) that specifically wants Audit separate.
Modules that should split later: ClinicalModule's internal sub-boundaries (Graph/Journey vs. Prescription vs. Lab/Radiology) may eventually warrant becoming genuinely separate NestJS modules even before any service extraction — worth revisiting once the module's file count/complexity becomes unwieldy in practice, which is a real, if hard to predict in advance, signal.
Potential bottlenecks: SchedulingModule's slot-reservation logic under concurrent load (Section 9/12) is the clearest near-term performance risk — this is a small, isolated module by design specifically so it can receive focused load-testing attention without the noise of the rest of the system.
Dependency problems: The Clinical ↔ Consultation relationship (Section 3) is architecturally resolved here but remains the pairing most likely to accumulate accidental synchronous coupling under real delivery pressure — worth a standing architectural review checkpoint (not a one-time decision) as the codebase grows.
Violation risk — DDD: PatientModule's read-only dependency on ClinicalModule (Section 3) is the boundary most likely to be violated by a well-intentioned but incorrect "just cache it for performance" shortcut — flagged explicitly here, again, because it's been flagged in nearly every phase since Phase 5 and is worth over-communicating rather than under-communicating to the eventual engineering team.
Violation risk — Clean Architecture: the temptation to let Presentation-layer controllers creep business logic into themselves "just this once" for a quick fix is the most common real-world Clean Architecture erosion pattern — worth an explicit CI lint rule (no business logic imports in presentation/ folders) rather than relying on code review alone.
Future technical debt, consciously named: the AIModule's eventual extraction (Section 14) will require solving cross-service transactional concerns that are currently trivial within a single process (e.g., AIModule marking a suggestion's doctorDecision as a separate write from ClinicalModule's content write, Section 12's sequence) — this works cleanly as two in-process calls today but will need a proper saga/compensating-transaction pattern once AIModule is a separate service. Worth flagging now as a known, deferred cost of the eventual extraction, not a surprise to discover later.

Scores

Backend Architecture Readiness Score: 87/100
DDD Score: 89/100 (module boundaries map cleanly to bounded contexts established since Phase 3; the Patient↔Clinical shadow-copy risk is the one recurring vulnerability)
Modularity Score: 86/100 (SchedulingModule's addition strengthens isolation of the highest-risk concurrency concern; ClinicalModule's internal size remains the main counterweight)
Maintainability Score: 85/100 (consistent Clean Architecture layering per module, Shared Kernel boundaries clearly drawn)
Scalability Score: 84/100 (clear, load-justified extraction triggers for Consultation and AI modules specifically)
Developer Experience Score: 83/100 (the layering pattern is consistent and learnable across all 18 modules — a developer who understands one module's internal structure understands them all)


Is the backend architecture complete enough to begin coding the NestJS project?
Yes. This document gives an engineering team everything needed to start: a definitive module catalog with clear ownership, an enforceable dependency matrix, concrete public contracts per module, a consistent internal layering pattern, a real event map with delivery/idempotency guarantees, and named extraction triggers for future scaling.
What I'd still want resolved in parallel with early coding, not before it starts:

ClinicalModule's internal sub-structure (Graph/Prescription/Lab separation, Section 5/15) should be settled as an explicit internal folder convention in the first sprint, before the module accumulates enough code that restructuring becomes painful.
The Clinical↔Consultation event-vs-direct-call boundary (Section 3) should be encoded as an actual CI lint/contract-test rule (Section 13) from the very first commit, not added after the first violation is discovered in review.
AuditModule's interceptor-based automatic logging (Section 7) needs to be one of the very first cross-cutting pieces built, since every other module's development will otherwise proceed without it and require retrofitting.

None of these are reasons to delay starting — they're the first three engineering tasks once coding begins, in roughly that priority order.