Phase 12 — Engineering Workspace Bootstrap (Implementation Blueprint)
This is the last purely-design phase before real code gets written — so I'll be concrete about folder names, tool choices, and week-by-week sequencing rather than staying conceptual, while still writing zero application logic.

1. Repository Strategy
Monorepo vs. Polyrepo — recommendation: Monorepo.
Reasoning: Phase 9/10/11 established a single OpenAPI contract consumed by a NestJS backend, a Next.js frontend, and future mobile/SDK clients, all evolving together during an early-stage product with frequent cross-cutting changes (a new field touches the DB schema, the backend module, the OpenAPI spec, and the frontend type all in one PR). A polyrepo would force these into separate PRs across separate repos with painful cross-repo versioning — exactly the kind of friction that slows a small team down without buying any real isolation benefit yet (that benefit only matters once independent teams need independent release cadences, which isn't this project's current stage, per Phase 9's own extraction-trigger reasoning). Revisit polyrepo only if/when a bounded context is actually extracted into an independently-deployed service with its own team (Phase 9 §14).
Repository structure:
apps/
  backend/              — NestJS modular monolith (Phase 9)
  frontend/             — Next.js app (Patient App, Doctor Workspace, Admin Portal)
  docs-site/            — Rendered API/architecture documentation site (Redoc/Docusaurus)

packages/
  shared-types/         — Generated TypeScript types from the OpenAPI spec (Phase 11) — single source of truth for request/response shapes across backend and frontend
  shared-config/        — Shared runtime config schema/validation (env var contracts, Phase 8's Configuration domain reflected here)
  eslint-config/         — Shared lint ruleset, including the architecture-boundary lint rules (Section 9)
  tsconfig/              — Shared base TypeScript compiler configs (strict mode baseline)
  ui/                    — Shared design-system components (Phase 1.1's "premium, calm" design language, Phase 2's accessibility baseline)
  api-sdk/               — Generated TypeScript client SDK from the OpenAPI spec (Phase 11), consumed by frontend and future mobile
  validation/            — Shared business-rule validation logic that must be identical client- and server-side (e.g., basic field format rules — never business-critical safety rules, which stay server-only per Phase 9's security posture)
  constants/             — Shared enums/constants mirrored from OpenAPI schema enums (consultation states, node types, etc.)

tooling/
  scripts/               — Repo-wide automation (codegen triggers, DB seed runners, changelog generation)
  generators/            — Code scaffolding generators (e.g., "new NestJS module" boilerplate matching Phase 9's Clean Architecture layout)

infrastructure/
  docker/                — Local dev Docker Compose definitions (Section 7)
  terraform/ (or equivalent IaC) — Cloud infrastructure as code (Phase 4's IaC principle), organized per environment (Section 8)
  k8s/ (or equivalent)   — Deployment manifests, if container orchestration is the chosen deployment target

docs/
  architecture/          — This entire 12-phase document series, versioned alongside the code it governs
  adr/                   — Individual ADR files (Phase 4's ADRs, one file each, appendable going forward)
  runbooks/              — Operational runbooks (incident response, Phase 4 §8)
Why each top-level folder exists: apps/ holds deployable units; packages/ holds code shared between apps but never deployed independently; tooling/ holds developer-facing automation that isn't part of any runtime; infrastructure/ holds anything describing where the system runs rather than what it does; docs/ keeps this entire design lineage in the same repository as the code it governs, so architectural decisions and implementation never drift apart silently — a real, common failure mode in fast-moving teams that this monorepo layout deliberately guards against.

2. Package Management
Recommendation: pnpm.
Reasoning: pnpm's content-addressable store gives meaningfully faster installs and less disk usage than npm/yarn at monorepo scale, and its strict node_modules structure (no "phantom dependencies") catches accidental cross-package dependency leaks early — directly reinforcing Phase 9's module-boundary discipline at the package-management level, not just the architectural level. Yarn Berry (PnP) is a reasonable alternative but has historically higher tooling-compatibility friction with some NestJS/Next.js ecosystem tools; pnpm's classic node_modules-compatible mode avoids that friction while keeping most of the performance/strictness benefit.
Workspace configuration: a single pnpm-workspace.yaml declaring apps/* and packages/* as workspace members; internal packages referenced via workspace:* protocol so internal dependencies always resolve to the local package, never an accidentally-published stale version.
Dependency strategy: shared dependencies (TypeScript, ESLint, testing frameworks) hoisted and version-pinned at the root; app-specific dependencies (NestJS-specific packages in backend, Next.js-specific in frontend) stay scoped to their own package.json — this prevents, e.g., a frontend-only library accidentally becoming available (and temptingly importable) inside backend code.
Version management: Changesets (or equivalent) for internal package versioning — particularly relevant for shared-types/api-sdk, which need a clear versioning story once the OpenAPI spec starts evolving (Phase 10/11's deprecation policy needs a corresponding package-versioning mechanism, or the two will drift).

3. Build System
Evaluation:
ToolAssessmentNative pnpm workspaces (no task orchestrator)Too weak alone — no caching, no dependency-graph-aware task ordering; fine for a single-package repo, not for this monorepo's cross-package build/test/lint pipelineNxPowerful, but its plugin ecosystem and generator model impose more opinionated structure than this project needs at its current size — better suited to very large, many-team monoreposTurboRepoRecommended. Lighter-weight than Nx, integrates cleanly with pnpm workspaces, provides remote caching and dependency-graph-aware task pipelines with minimal configuration overhead — the right complexity level for a team at this project's current stage, with room to migrate to Nx later if the monorepo's scale genuinely outgrows it
Caching: TurboRepo's content-hash-based caching means unchanged packages skip re-build/re-test entirely in CI — critical once shared-types changes force a rebuild check across both backend and frontend, since most changes won't touch both.
Incremental builds: task pipeline defined so build depends on upstream packages' build outputs (e.g., frontend#build depends on shared-types#build and ui#build), ensuring correct ordering without manual sequencing.
Task pipelines (conceptual, turbo.json structure): lint, type-check, test, build as the core pipeline stages, each cacheable independently, with test depending on build for packages that require compiled output, and independent for pure TypeScript packages that can be tested directly.

4. Backend Bootstrap (NestJS)
Directly operationalizing Phase 9's module catalog and Clean Architecture layering as an actual folder tree:
apps/backend/src/
  main.ts                        — bootstrap only, no business logic
  app.module.ts                  — root module, imports all domain modules

  core/                          — cross-cutting infrastructure NOT specific to any domain
    audit/                       — AuditModule (Phase 9) — the interceptor-based automatic logging
    auth/                        — AuthModule — RBAC policy engine
    identity/                    — IdentityModule
    configuration/               — ConfigurationModule
    reference-data/              — ReferenceDataModule

  modules/                       — one folder per Phase 9 bounded-context module
    patient/
    doctor/
    clinical/
      domain/
      application/
      infrastructure/
      presentation/
    consultation/
    scheduling/
    knowledge/
    payments/
    notifications/
    ai/
    assets/
    administration/
    analytics/

  shared/                        — Shared Kernel ONLY (Phase 9 §6) — base entities, Result types, common errors, decorators
  platform/                      — framework-level plumbing: global filters, global interceptors, health module
Dependency rule enforced by folder structure: modules/* may only import from core/, shared/, and their own declared dependencies (Phase 9 §3's matrix) — never reach into another modules/* folder's domain/ or infrastructure/ subfolders directly, only its exported application/ interface. This is enforced by an actual lint rule (Section 9), not just convention.
Each module's internal structure follows Phase 9 §5's layering exactly (domain/, application/, infrastructure/, presentation/) — this document doesn't repeat that detail, just confirms it's the literal folder convention for every entry under modules/.

5. Frontend Bootstrap (Next.js)
apps/frontend/src/
  app/                            — Next.js App Router
    (patient)/                    — route group: Patient App
      health-passport/
      consultations/
      knowledge/
    (doctor)/                     — route group: Doctor Workspace & Practice Area
      workspace/                  — the live-consultation environment (Phase 2.5's IDE model)
      portfolio/
      knowledge/
    (admin)/                      — route group: Admin Portal
      verification-queue/
      moderation/
    layout.tsx                    — root layout: theming, localization provider, auth provider

  features/                       — feature-oriented modules, one per major product area (mirrors Phase 3's Product Structure, not the route structure)
    health-passport/
      components/
      hooks/
      state/
    doctor-workspace/
      components/
      hooks/
      state/                      — the persistent "working context" state (Phase 2.5/9's server-authoritative session state consumed client-side)
    ai-copilot/                   — the contextual side-panel component, consumed inside doctor-workspace
    scheduling/
    knowledge/

  shared/
    components/                   — thin wrappers around `packages/ui`, app-specific composition only
    hooks/
    lib/                          — API client instantiation (using `packages/api-sdk`), auth utilities

  locales/                        — Arabic (primary) and English translation resources, RTL-aware from the start (Phase 2)
App Router structure rationale: route groups ((patient), (doctor), (admin)) map directly onto Phase 3's three distinct client-application areas, sharing the same Next.js app and design system without three separate deployable frontends — consistent with Phase 3's "shared navigation" pattern (Trust Center, Settings) while keeping each role's primary experience cleanly separated.
State management boundaries: each features/* folder owns its own local state (React state/context, or a lightweight state library scoped per feature) — no single global store holding everything, since Phase 2.5's Doctor Workspace state (video session, working context, AI panel) is genuinely different in shape and lifecycle from, say, Knowledge Center's follow/save state; forcing them into one global store would recreate exactly the kind of unnecessary coupling Phase 9 worked to avoid on the backend.
Localization: next-intl (or equivalent) configured with Arabic as default locale, full RTL layout support tested from the first scaffolded page, not retrofitted (Phase 2's explicit requirement).
Theming: CSS variables driven design tokens (Phase 1.1/2's "calm, premium" design language), consumed by packages/ui, with dark/light and RTL/LTR all expressed as token-level concerns rather than component-level conditionals.

6. Shared Packages
PackageOwnershipWhat it must never containshared-typesGenerated, not hand-written — regenerated from the OpenAPI spec (Phase 11) via a codegen scriptAny type not traceable to the OpenAPI spec — prevents type drift between backend and frontendapi-sdkGenerated client, thin wrapper adding auth-header injection and error-envelope unwrappingBusiness logic — this is a transport-layer convenience, not a place for retry/business decisionsui-componentsOwned by a small design-system-focused rotation of frontend engineers, not every feature team independentlyFeature-specific logic — a Doctor Workspace-specific component belongs in features/doctor-workspace, not hereeslint-configPlatform/DX teamFeature-specific rules — only genuinely universal rules (Section 9)typescript-configPlatform/DX team—validationShared between backend/frontend, but restricted to structural validation only (Phase 9 §6's Shared Kernel boundary, mirrored here)Any business rule with real stakes (Phase 9's insistence that business validation lives in each module's Domain layer, never duplicated into a shared package where it could drift out of sync between client and server)constantsGenerated from OpenAPI enum definitions where possible, to avoid hand-copying string literals that could driftAnything not enum-backed by the spec

7. Development Infrastructure
Docker Compose services for local development:
yamlservices:
  postgres:        # primary operational database (Phase 8)
  redis:           # caching + queues (Phase 4/9)
  minio:           # S3-compatible object storage for local dev (Phase 8's Asset layer)
  keycloak:        # local IdP instance (Phase 9's auth integration)
  mailpit:         # local email capture — inspect outgoing notification emails without real delivery
  adminer:         # lightweight DB inspection UI
Health checks: every service in Compose includes a healthcheck block; the backend's own startup waits on Postgres/Redis/Keycloak health before accepting traffic, avoiding the classic "backend crashes on cold start because the DB wasn't ready yet" local-dev annoyance.
Seed strategy: a dedicated seed script (tooling/scripts/seed.ts) populating synthetic (never real) Patients, Doctors (in various verification states), sample Health Graph data, and Reference Data catalogs (Specialties, a small ICD-11 subset, a small Drug Catalog subset) — enough to exercise every Phase 2 persona and Phase 2's edge cases locally without needing real data. Explicitly forbidden: seeding with any real patient data, ever, in any non-production environment (Phase 4's synthetic-data-only rule for dev/staging).

8. Environment Strategy
FilePurpose.env.localIndividual developer overrides, git-ignored.env.developmentShared local-dev defaults (Docker Compose service URLs), committed.env.stagingStaging-specific values, secrets injected via the secrets manager (Phase 4 §8), never committed.env.productionProduction values, entirely secret-manager-sourced, no file actually exists in the repo — this is a template/schema reference only
Secrets management: local dev uses .env.local/.env.development for non-sensitive values; staging/production secrets are injected at deploy time from the centralized secrets vault (Phase 4/8), never from a committed file — this is enforced by .gitignore plus a CI check that fails the build if any .env* file other than .env.development/.env.example is ever committed.
Configuration loading: a single typed configuration-loading module (packages/shared-config) validates all required environment variables against a schema at application startup — the app fails fast with a clear error if a required variable is missing, rather than failing confusingly deep inside some unrelated code path later (this directly operationalizes Phase 9's "Configuration must remain data-driven" principle at the bootstrap level, distinguishing genuine runtime config from environment-level secrets).
Validation strategy: schema-based (e.g., Zod or class-validator) validation of the entire env object once, at process start — not scattered process.env.X reads throughout the codebase, which is both an anti-pattern for testability and a common source of "works on my machine" bugs.

9. Code Quality
ToolPurposeESLintEnforces both generic TypeScript best practices and, critically, custom architecture-boundary rules (see below)PrettierFormatting only, zero configuration debates — auto-applied on save/commitHuskyGit hooks — pre-commit (lint-staged) and pre-push (type-check + fast unit tests)Commitlint + Conventional CommitsEnforces a consistent commit message format, enabling automated changelog generation (Section 14)lint-stagedRuns lint/format only on staged files, keeping pre-commit hooks fastImport orderingEnforced via an ESLint import-order rule, grouped (external → internal packages → relative), preventing the visual noise that makes reviewing cross-module dependency additions harder to spotArchitecture Lint RulesThe single most important entry in this table — custom ESLint rules (e.g., via eslint-plugin-boundaries or an equivalent) that physically fail the build if modules/patient imports from modules/clinical/infrastructure directly, or if modules/clinical imports modules/ai (Phase 9 §3's forbidden-dependency list, made enforceable rather than aspirational)
Why the architecture lint rules matter more than any other item in this section: every prior phase (5 through 9) repeatedly flagged the same risk — that domain boundaries erode under real delivery pressure unless something mechanical enforces them. This is that mechanism. Without it, this entire 12-phase design effort is only as durable as individual developer discipline and code-review vigilance, which Phase 4/9 both explicitly said not to rely on alone.

10. Testing Bootstrap
Test typeSetupUnitJest (or Vitest), scoped to each module's Domain layer (Phase 9 §13) — runs with zero external dependencies, fast enough to run on every saveIntegrationJest against a real (test-container-spun-up) Postgres instance — verifies repository implementations and Phase 5's aggregate-transaction boundaries actually holdContractGenerated from the OpenAPI spec (Phase 11) — validates that backend responses actually conform to the published schema, and that internal module public interfaces (Phase 9 §4) haven't silently changed shape; this is the CI-enforced version of Phase 4 §12's "domain boundary contract tests"E2EPlaywright (or equivalent), running key Phase 2 user flows against a fully running local stack (Section 7's Docker Compose)Test dataFactory functions per aggregate (e.g., createTestPatient(), createTestHealthGraphNode()) living alongside each module's tests, never hand-copied fixture JSON scattered inconsistentlyMock servicesAI provider and PSP adapters (Phase 4/9's Hexagonal boundary) get test-double implementations for integration/E2E tests — never calling real external AI/payment providers in CICoverage expectationsHigh bar (recommend 85%+) specifically for ClinicalModule and TrustModule's Domain layers, given their safety/compliance stakes (Phase 9's repeated flag); a more relaxed, standard bar (70%) for lower-stakes modules like Notifications/Settings — coverage targets should reflect actual risk, not be applied uniformly for its own sake

11. CI/CD
Pipeline stages, in order, each a hard gate before the next:

Install (cached via TurboRepo/pnpm store).
Lint — includes the architecture-boundary rules (Section 9) as a hard failure, not a warning.
Type Check — full monorepo tsc --noEmit.
Unit + Integration Tests — parallelized per package via TurboRepo's task graph.
Contract Tests — validates implementation against the OpenAPI spec (Phase 11); a mismatch here is a build-breaking failure, since it represents exactly the kind of silent contract drift Phase 10/11 were designed to prevent.
OpenAPI Validation — spec itself linted (e.g., via Spectral) for style/consistency rules established in Phase 10 §15 (consistent naming, no duplicated schemas).
Build — all apps/packages, using TurboRepo's cached, dependency-graph-aware build.
Security Scan — static analysis (SAST) plus container image scanning if deploying via containers.
Dependency Audit — automated vulnerability scanning of third-party packages, blocking on high/critical findings.
Artifact Generation — built Docker images (or equivalent deployable artifacts), tagged with commit SHA.
Deployment Gates — staging deploys automatically on merge to main; production deploys require an explicit manual approval gate (Phase 4's blue/green deployment principle, with production specifically never auto-deployed without a human confirming, given the clinical-consequence stakes of this system).


12. Observability Bootstrap

Logging: structured JSON logs from day one (Phase 4's Observability-First principle), correlation-ID-tagged (Phase 10/11 §11) so a single request is traceable across module boundaries even within the monolith.
Tracing: OpenTelemetry instrumentation wired at the framework boundary (NestJS interceptors, Next.js middleware) from the first scaffolded request handler — not retrofitted later, since Phase 4 explicitly warned against treating observability as a post-launch addition.
Metrics: basic RED metrics (Rate, Errors, Duration) per module/endpoint from day one, with the clinically-critical paths (booking, video session start, prescription signing) tagged for dashboard prioritization (Phase 4 §12's alerting-priority principle).
Error Tracking: a dedicated error-tracking service (e.g., Sentry-equivalent) capturing unhandled exceptions with correlation-ID linkage, configured to scrub PHI from error payloads before transmission — a genuinely important detail given this system's data sensitivity, worth calling out explicitly rather than assuming a default error tracker's payload-capture behavior is safe out of the box.
Health Endpoints: /health/liveness (is the process running) and /health/readiness (are dependencies — Postgres, Redis, Keycloak — reachable) as two distinct endpoints, since conflating them causes exactly the kind of "healthy but not actually able to serve traffic" false-positive Phase 4's deployment strategy needs to avoid.


13. Security Bootstrap

Keycloak integration: the backend's IdentityModule (Phase 9) is bootstrapped against a local Keycloak realm from day one in dev, mirroring the production IdP integration exactly — never a simplified fake-auth mode that diverges from the real integration shape, since that divergence is a classic source of "works in dev, breaks in staging" auth bugs.
JWT validation: middleware validating token signature, expiry, and claims on every request by default (Phase 9's Secure-by-Default principle) — routes must explicitly opt into public access (the small, named allowlist from Phase 10), never the reverse.
Secrets: never in .env files beyond local dev (Section 8); loaded from the vault at runtime.
Encryption: TLS enforced at the load balancer/ingress level in every non-local environment from the start; local dev may reasonably run HTTP-only given it's not exposed.
CORS: explicit allowlist of frontend origins, never a wildcard, even in dev.
Helmet (or equivalent security-header middleware): applied globally from the first bootstrapped NestJS app.
Rate limiting: a basic global rate limiter wired in from day one, with per-endpoint overrides added as Phase 10's sensitivity tiers are implemented.
CSRF strategy: since the API is token-based (JWT in Authorization header, not cookie-based sessions for the primary auth flow) CSRF risk is substantially reduced; the one exception is the refresh-token cookie (Phase 11's RefreshTokenAuth), which needs SameSite=Strict and CSRF-token double-submit protection specifically for that flow.
Audit logging: the AuditModule interceptor (Phase 9 §7) wired as a global interceptor from the very first PHI-touching endpoint implemented, not added later once several endpoints already exist without it.


14. Git Strategy

Branching model: trunk-based development with short-lived feature branches (per-vertical-slice, Section 16) merged via PR — avoids the long-lived-branch merge-hell risk that would slow down a fast-moving early-stage build, while still gating every merge through CI (Section 11) and review.
PR template: requires linking the relevant Phase document/ADR for any architecturally-significant change, a checklist confirming architecture-lint passed, and explicit callout of any new cross-module dependency introduced (forcing the author to justify it against Phase 9 §3's matrix).
Issue template: separate templates for bug reports (repro steps, expected/actual) vs. feature requests (linking back to the relevant PRD/Phase 1 feature entry) vs. architectural proposals (requiring an ADR-style writeup, Phase 4's format).
CODEOWNERS: modules/clinical/** and modules/trust/** require review from designated senior/clinically-literate engineers specifically (Phase 9 §15's ownership recommendation, made a mechanical GitHub/GitLab enforcement rather than a suggestion); packages/ui/** owned by the design-system rotation; infrastructure/** owned by DevOps.
Labels: a consistent set (area:clinical, area:ai, type:bug, type:architecture, priority:*) mirroring the module catalog (Phase 9 §2) for easy cross-referencing between issues and the architecture documents.
Release strategy + Semantic versioning: Changesets-driven versioning for internal packages (Section 2); the deployed application itself is versioned by release date/tag rather than strict semver, since it's a deployed service, not a published library — but the API (Phase 10/11) follows its own explicit semver-like major-version policy (/api/v1, /api/v2) independent of the app's internal release cadence.


15. Engineering Standards

Coding standards: enforced mechanically wherever possible (Section 9) rather than documented-and-hoped-for; anything not mechanically enforceable (e.g., "write clinically-accurate comments in ClinicalModule") is documented in a CONTRIBUTING.md and checked in review.
Naming conventions: directly inherited from Phase 6 §13 and Phase 10 §12 — this document doesn't reinvent naming rules, it enforces the ones already specified, via the shared ESLint/naming-convention config.
Folder conventions: exactly Sections 4/5 above, enforced via the architecture lint rules and a repo-structure CI check (fails if a new top-level folder appears outside the documented structure without an accompanying ADR).
Dependency rules: Phase 9 §3's matrix, enforced via Section 9's lint rules — restated here as a standard, not just a lint detail, since new engineers should understand why the rule exists (Phase 3/9's DDD reasoning), not just that a linter blocks them.
Review checklist (PR template, expanded): does this change respect module boundaries; does it require a new ADR; does it touch PHI-classified data (if so, is the audit interceptor confirmed applied); does it change the OpenAPI contract (if so, is shared-types/api-sdk regenerated); does it include tests proportional to Section 10's risk-based coverage expectations.
Definition of Done: code merged to main, CI green (all Section 11 gates), OpenAPI contract updated and regenerated if applicable, relevant Phase/ADR documentation updated if the change was architecturally significant, deployed to staging and manually smoke-tested for any clinically-critical path change.


16. Bootstrap Roadmap (Vertical Slice Development)
Each week produces a genuinely runnable, demoable system — not isolated, disconnected infrastructure work.
Week 1 — Skeleton & Auth Slice
Monorepo scaffolded (Sections 1–3); Docker Compose stack running (Section 7); CI pipeline running lint/type-check/build on an empty-but-structured codebase; first vertical slice: Patient Registration → Login, exercising IdentityModule end-to-end (backend module + frontend registration/login screens + real Keycloak integration + first contract test against the OpenAPI spec). This alone proves the entire toolchain works, not just that folders exist.
Week 2 — Doctor Onboarding & Verification Slice
DoctorModule + TrustModule's VerificationCase flow, including AssetModule's upload-intent/confirm lifecycle (Phase 10 §9) for credential documents, and AdministrationModule's minimal verification-queue view in the Admin Portal. Proves cross-module event flow (DoctorVerified → unlocking Portfolio, Phase 9 §12's sequence) end-to-end for the first time.
Week 3 — Discovery & Booking Slice
DoctorModule's public search endpoint, SchedulingModule's slot-reservation logic (with a real concurrency test proving the double-booking mitigation actually works, Phase 8/9's flagged risk), ConsultationModule's Appointment creation, PaymentModule's charge flow against a real (sandboxed) PSP integration.
Week 4 — Consultation & Clinical Core Slice
ConsultationModule's session lifecycle, ClinicalModule's first Health Graph Node/Clinical Note recording (proving Phase 5's aggregate-transaction boundary in real code), Realtime video integration (Phase 4 §6's SFU provider) wired into the Doctor Workspace frontend for the first time.
Week 5 — Prescription & AI Copilot Slice
AIModule's suggestion generation (starting with the deterministic drug-interaction check specifically, since it's both the highest-value and most isolated AI capability to implement first per Phase 9's ADR-002), ClinicalModule's SignPrescription with the unacknowledged-Warning gate (Phase 8/9/11's cross-cutting safety rule) proven end-to-end.
Week 6 — Knowledge, Consent & Trust Center Slice
KnowledgeModule's publish flow with the moderation-tier logic, TrustModule's consent grant/revoke flow with the Mental Health scope exception (Phase 1.1's rule) implemented and tested, and the patient/doctor-facing Trust Center surfaces (Phase 1.2/4) built for the first time.
Beyond Week 6: subsequent slices follow the remaining Phase 1 feature list (Reviews, Notifications maturity, Analytics dashboards, Emergency Workflow's dedicated UI, Referral flow) in roughly priority order per Phase 1.2's roadmap — each slice continuing the same pattern of touching backend module, frontend feature, contract test, and documentation update together, never infrastructure-only or feature-only work in isolation.

17. Final Engineering Readiness Review
Missing tooling, honestly identified: this document doesn't yet specify a feature-flagging SDK/client library wiring ConfigurationModule's feature flags (Phase 6/9) into actual frontend conditional rendering — the backend concept exists, but the frontend consumption pattern (a useFeatureFlag() hook, say) isn't bootstrapped here. Worth adding in Week 1–2 alongside the auth slice, since Phase 4's Final Review already flagged feature-flagging as a genuine cross-cutting gap that shouldn't be deferred.
Developer bottlenecks: ClinicalModule's CODEOWNERS requirement (Section 14) is correct given its stakes, but could become a real velocity bottleneck if only one or two engineers are qualified reviewers early on — worth a deliberate plan to cross-train a third reviewer by Week 4–5, before the Clinical Core slice generates significant PR volume.
Operational risks: the local Keycloak-from-day-one decision (Section 13) is the right call for auth-integration fidelity but adds real Week 1 setup friction for new engineers — worth budgeting explicit onboarding-documentation time (a docs/onboarding/local-setup.md walkthrough) rather than assuming the Docker Compose file alone is self-explanatory.
Build risks: TurboRepo's remote caching (Section 3) needs an actual configured remote cache backend before the team grows past a handful of engineers, or CI build times will start degrading — this should be set up by Week 2–3, not left until it becomes a visible pain point.
CI risks: the Contract Test stage (Section 11, step 5) depends entirely on the OpenAPI spec (Phase 11) staying the actual source of truth in practice — if engineers start hand-editing generated types in shared-types directly (a common shortcut under time pressure), the whole contract-testing safety net silently degrades. Worth a CI check specifically verifying shared-types matches what codegen would currently produce from the spec, failing the build if they've diverged.
Environment risks: staging/production secret provisioning (Section 8) needs to be genuinely operational — not just designed — before Week 3's real PSP sandbox integration, since payment flows can't be meaningfully tested without real (sandboxed) credentials flowing through the actual secrets pipeline, not developer-local .env shortcuts.
Future improvements: mutation testing (Phase 9 §13's "future" item) and the ABAC evolution (Phase 4/9) are both correctly deferred past this bootstrap phase — worth explicitly noting them in a docs/architecture/deferred-decisions.md file so they're tracked rather than silently forgotten once the team is deep in feature work.