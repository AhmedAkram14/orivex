# ORIVEX Frontend — Master Implementation Plan

**Status:** Living document. **Owner:** Frontend engineering. **Scope:** `apps/frontend` only — backend scope is governed separately by `docs/06-system-architecture.md`, `docs/10-backend-architecture.md`, `docs/12-openapi.md`, and `docs/14-adrs.md`.

This document is the persistent engineering specification for the ORIVEX frontend. It is not a sprint prompt and not a one-time checklist — it is meant to be read, updated, and extended by whoever is working on the frontend, sprint after sprint, for as long as this product exists. It formalizes and supersedes the informal vision list in `docs/roadmaps/orivex-master-roadmap.md` (kept for historical reference) into a structured, dependency-aware, priority-ordered engineering plan.

---

## 0. How to Use and Maintain This Document

- **Do not delete history.** When a phase or item ships, move its status to ✅ **Completed** and add the commit hash / PR reference. Do not remove the entry — the record of *when* and *why* something was built is part of the document's value.
- **Do not silently reorder priorities.** If a priority changes, note *why* in the phase's "Notes" field rather than just changing the number.
- **New scope enters through a phase, not around one.** If a new requirement doesn't fit an existing phase, add a new phase in Section 3 with the same structured fields (Priority, Status, Depends On, Backend Dependency, Scope, Constraints, Definition of Done) — never as a loose bullet elsewhere.
- **This document reflects reality, not aspiration.** A phase marked 🔒 Blocked stays blocked in this document until the actual backend/vendor dependency is resolved — optimism belongs in planning conversations, not in the spec.

### 0.1 Status Legend

| Symbol | Meaning |
|---|---|
| ✅ | Completed — shipped, verified, in production |
| 🚧 | In Progress — actively being built |
| 📋 | Planned — scoped, not started, no blocker |
| 🔒 | Blocked — waiting on a backend capability that doesn't exist yet |
| 🧊 | Deferred — waiting on a business/vendor decision (not a technical blocker) |

### 0.2 Priority Legend

| Priority | Meaning |
|---|---|
| **P0** | Foundational. Nothing else can be safely built until this exists. |
| **P1** | Core product value. The platform isn't a usable product without it. |
| **P2** | Important, but the platform functions without it in the interim. |
| **P3** | Enhancement, polish, or scale-driven. Valuable but not launch-blocking. |

---

## 1. Grounding: Relationship to the Backend and Existing Architecture

The frontend does not define its own architecture in isolation. Per `CLAUDE.md` (repository-wide, binding): OpenAPI is the source of truth for every contract, PostgreSQL (via the backend) is the source of truth for every fact, the backend is a Modular Monolith following DDD/Clean/Hexagonal Architecture, and **AI never writes directly to clinical records**. The frontend's job is to faithfully present and collect data through the documented API surface — never to duplicate business rules, never to assume a backend capability exists because it would be convenient, and never to introduce a competing source of truth (e.g., no client-side "shadow" business logic for anything with real clinical or financial stakes).

### 1.1 Technology Decisions Already Made (architecturally binding, per `CLAUDE.md`)

These are **not** open questions for this roadmap to revisit — they are accepted architecture decisions. A future phase may need to *integrate* with them, but must not propose alternatives without an explicit ADR-style discussion first, per `CLAUDE.md`'s "ask before making architectural changes" rule.

| Concern | Decision | Integration status |
|---|---|---|
| Frontend framework | Next.js (App Router) | ✅ Scaffolded (Phase 0) |
| Internationalization library & routing architecture | `next-intl`, route-based locales (`app/[locale]/...`), Server Components with server-side translation resolution | ✅ Implemented (Phase 2) — `app/[locale]/`, middleware, and English/Arabic message files exist; Phase 0's retrofit debt is resolved. Only two namespaces (`common`, `home`) exist so far — per-feature namespace splitting happens as features are built, per Phase 3's Translation Management scope |
| Identity provider | Keycloak | 🔒 Not yet enforced anywhere — backend has no authentication layer wired yet (see 1.2) |
| AI provider | Azure OpenAI | 🔒 Backend's `AIModule` currently binds a `NotConfiguredAIProviderAdapter` — the *technology* is decided, the *credentials/integration* are not live yet |
| Realtime / telemedicine transport | LiveKit | 📋 Not yet integrated on either side |
| Object storage | S3-compatible | ✅ Actually wired and used in production (`AssetModule`) |
| Cache | Redis | 🧊 Provisioned as an env var contract only — no code path on the backend actually connects to it yet |
| Search | PostgreSQL Full Text | 📋 Not yet exposed via any documented endpoint |
| API contract | OpenAPI (`docs/12-openapi.md`) | ✅ Source of truth; frontend API client must never drift from it |

### 1.2 Genuinely Undecided (vendor/business decisions, not technical blockers)

Unlike section 1.1, these have **no** chosen technology yet, on either side of the stack. Do not pick one from inside a frontend phase — surface it as a decision request, the same way the backend's `NotConfigured*Adapter` pattern makes an unmade vendor decision explicit and loud rather than silently faked.

- Payment Service Provider (PSP) — backend's `PaymentModule` has no bound gateway
- SMS / WhatsApp provider
- Transactional email provider
- Video/audio recording storage & retention policy for telemedicine
- Monitoring/observability stack specifics (a Prometheus/Grafana-shaped need is anticipated, nothing chosen)
- Frontend error-tracking / session-replay vendor (a Sentry-shaped need is anticipated for Phase 30, nothing chosen — do not hardcode a specific SDK before this is decided; scope Phase 30 generically the same way Phase 16 scopes payments PSP-agnostically)

### 1.3 Backend Modules That Exist Today

The frontend can build real, end-to-end features against these now, scoped exactly to what each module's OpenAPI operations expose — no more:

`IdentityModule` (account registration/suspension, no auth enforcement yet) · `DoctorModule` · `AssetModule` · `TrustModule` (doctor verification) · `AdministrationModule` (thin, re-exports Trust) · `PatientModule` · `SchedulingModule` · `ConsultationModule` (booking, sessions) · `PaymentModule` (charge initiation, no live PSP) · `ClinicalModule` (Health Graph, Health Journey, Clinical Notes, Prescriptions) · `AIModule` (AI Copilot suggestions: SOAP draft, prescription draft, interaction flag, suggested question, summary, follow-up plan — request + doctor-decision recording only)

### 1.4 Backend Modules That Do Not Exist Yet

Any frontend phase touching these is **🔒 Blocked** until the corresponding backend work is scoped and built — not just a frontend task waiting on availability, but a real gap in the system: Knowledge/Content, Notification (email/SMS/push delivery), Analytics, Configuration (feature flags), Reference Data (ICD-11, Drug Catalog, specialties as structured lookups), Laboratory, Radiology, Pharmacy/inventory, Billing beyond a single `PaymentTransaction` (invoices, claims, insurance, subscriptions, taxes), multi-tenant/hospital management, Consent Management (patient consent capture/revocation, medical-record sharing grants, emergency-access override — see Phase 10), Hospital Resource Management (rooms, beds, operating rooms, equipment, devices — see Phase 19), Queue Management (waiting/doctor queues, token issuance — see Phase 9), and a general-purpose entity-level Audit/Change-History module (before/after change tracking distinct from today's per-module domain events — see Phase 19).

### 1.5 A Named Architecture Constraint the Frontend Must Never Violate

**ADR-002** (`docs/14-adrs.md`): drug interaction/allergy checking is a **deterministic, auditable lookup**, never a generative/LLM path. Any frontend UI for "AI Prescription Suggestions" or "Drug Interaction Detection" must visually and functionally distinguish the deterministic interaction-flag result from generative AI content (SOAP drafts, summaries, follow-up suggestions) — they are not the same trust tier, and the UI must not blur that line for a doctor reading it under time pressure.

### 1.6 Frontend Internal Architecture Conventions

The backend enforces module boundaries via DDD/Clean/Hexagonal layering (`docs/10-backend-architecture.md`). The frontend has no equivalent binding document yet beyond Phase 0's bootstrap choices, so this section names the conventions every phase from Phase 1 onward must follow — not a new phase, since it has no independent priority/status/backend-dependency of its own; it is a standing constraint on how every other phase is built.

- **Feature-based architecture** — code is organized by product feature/domain (e.g. `features/doctor-portal`, `features/prescriptions`), not by technical layer-only folders (`components/`, `hooks/`, `utils/` as top-level dumping grounds). This mirrors the backend's per-module organization in spirit, even though the frontend is not itself a DDD system.
- **Module boundaries** — a feature module may depend on shared primitives (Phase 1's design system, Phase 2's API layer) but must not import directly from another feature module's internals. Cross-feature composition happens at the route/page level, not by reaching into a sibling feature's folder.
- **Folder structure** — `app/[locale]/...` (routing, per Phase 3) stays thin: route files compose feature modules, they do not contain business logic. Feature logic lives under a dedicated `features/` (or `src/features/`) root; genuinely cross-feature code lives under `shared/` (components, hooks, utilities) — promoted there only once a second feature actually needs it, not speculatively.
- **Shared components, hooks, and utilities** — anything promoted to `shared/` must have no feature-specific business logic; a component that renders a `PatientStatusBadge` is a feature component, a `<Badge>` is a shared primitive (same distinction Phase 1 already draws for the design system).
- **Naming conventions** — consistent casing and suffixing (e.g. `*.use-case.ts`-style clarity is a backend convention; the frontend equivalent — component/hook/type naming — should be documented once Phase 1 ships, not invented ad hoc per feature).
- **Dependency rules** — feature modules depend inward on `shared/` and the Phase 2 API layer only; `shared/` never depends on a feature module; routing (`app/`) depends on features, never the reverse. This is the same acyclic-dependency discipline the backend's Shared Kernel enforces, expressed for the frontend.
- **ADR references** — any frontend-side architectural decision with the same weight as a backend ADR (e.g. the i18n architecture decision in 3.4.1, the multi-tenancy sequencing constraint in Phase 19) should be traceable back to this document rather than living only in a PR description.
- **Code organization** — this section is deliberately a convention, not a folder-structure mandate carved in stone before Phase 1 exists; Phase 1's Definition of Done should include confirming or refining these conventions against the real component library, and this section should be updated (per Section 0's "do not delete history" rule) if that refinement changes anything.

**Key decisions & constraints:** these conventions apply from Phase 1 onward — Phase 0's bootstrap code predates them and is not required to be retrofitted, consistent with Phase 0's own "replaced, not extended" framing.

---

## 2. Phase 0 — Current Frontend Architecture (Foundation)

**Priority:** P0 · **Status:** ✅ Completed · **Depends on:** nothing · **Backend dependency:** none (calls only `GET /health/liveness`)

### Shipped

- `apps/frontend`: Next.js 15 (App Router), React 19, TypeScript (strict mode, matching the backend's own strictness bar)
- Per-package ESLint flat config (`next/core-web-vitals` + `next/typescript` via the same `FlatCompat` bridge `create-next-app` itself generates) — deliberately **not** folded into the repo's shared root `eslint.config.mjs`, since React/Next-specific rules aren't universal across the monorepo (`docs/13-engineering-bootstrap.md`'s stated boundary for `packages/eslint-config`)
- Tailwind CSS v4 via `@tailwindcss/postcss`
- A typed API client (`src/lib/api-client.ts`) that mirrors the backend's *actual* response shapes: `{ data, meta }` for envelope-wrapped controllers, `{ error: { code, message, details?, requestId, timestamp } }` on failure, and — as of the first production incident this roadmap should remember — plain unwrapped JSON for the one controller (`HealthController`) that doesn't use the shared envelope. `apiFetch()` detects which shape it received rather than assuming one.
- Environment variable handling (`src/lib/env.ts`): single validated read of `NEXT_PUBLIC_API_BASE_URL`, fails fast with a descriptive error rather than silently proceeding with `undefined`
- Monorepo wiring: workspace-recognized by `pnpm-workspace.yaml`, root `.gitignore`/`eslint.config.mjs` updated for `.next`, root convenience scripts (`frontend:dev`, `frontend:build`)
- Deployed: Vercel (`https://orivex-eg.vercel.app`) connected to the Render-deployed backend (`https://orivex-backend.onrender.com`)

### Explicitly Not Yet Done (do not assume otherwise)

No design system, no component library, no global state management, no routing structure beyond a single proof-of-wiring page, no authentication, no real product page. Phase 0's only page (`/`) exists to prove the API client works end-to-end against the live backend and should be replaced, not extended, once Phase 1 lands.

**Retrofit debt resolved (Phase 2):** Phase 0's original `app/` tree (`layout.tsx`, `page.tsx`, no `[locale]` segment) has been restructured to `app/[locale]/` with `next-intl` middleware, per the plan this note originally called for. Kept here, not deleted, per Section 0's "do not delete history" rule — the record of the debt existing and how it was resolved is still useful.

### Lessons Encoded Into Later Phases

The health-endpoint incident (a working request whose response shape didn't match the client's assumption, silently producing an empty error rather than a thrown one) is the reason Phase 2's API layer work includes explicit contract testing against `docs/12-openapi.md`, not just type-level trust.

---

## 3. Phase Plan

### 3.1 Master Sequencing Table

| # | Phase | Priority | Status | Depends On | Backend Status |
|---|---|---|---|---|---|
| 0 | Current Frontend Architecture | P0 | ✅ | — | none |
| 1 | Design System & UX Foundations | P0 | 🚧 | Phase 0 | none |
| 2 | Global State, API Layer & Forms | P0 | 🚧 | Phase 1 | Existing modules (1.3) |
| 3 | Internationalization (i18n) & Localization | P0 | 🚧 | Phase 1 | Reference Data module doesn't exist yet — see Phase 3's Medical Localization sub-scope |
| 4 | Authentication | P0 | 🚧 | Phase 2 | Keycloak not integrated yet — fully implemented against a mocked `/auth/*` contract (`authApi`), real Keycloak swap remains 🔒 blocked |
| 5 | Authorization (RBAC) | P0 | 🔒 | Phase 4 | No role model enforced server-side yet — guard components and permission model implemented and tested (`shared/auth/role-guard.tsx`, `permission-guard.tsx`, `feature-guard.tsx`), role-aware routing/dashboards remain 🔒 blocked |
| 6 | Application Shell & Dashboard | P1 | 🚧 | Phase 5 | Identity, Doctor, Patient — shell/nav/search/notification architecture implemented against no business modules; real KPI data blocked until Patients/Doctors phases ship |
| 7 | Doctor Portal | P1 | 📋 | Phase 6 | Doctor, Trust, Asset |
| 8 | Patient Portal | P1 | 📋 | Phase 6 | Patient, Clinical (read) |
| 9 | Appointment System & Calendar (incl. Queue Management) | P1 | 📋 | Phase 6 | Scheduling, Consultation (built); Queue Management sub-scope 🔒 blocked — no Queue module |
| 10 | Electronic Medical Records, Medical/Patient Journey Timeline & Clinical Workflow | P1 | 📋 | Phase 7, 8 | Clinical (Health Graph/Journey/Notes) built; Consent Management sub-scope 🔒 blocked — no Consent module |
| 11 | Prescriptions | P1 | 📋 | Phase 10 | Clinical (Prescription) |
| 12 | AI Copilot Features | P1 | 📋 | Phase 10, 11 | AIModule |
| 13 | Telemedicine (LiveKit) | P1 | 📋 | Phase 9 | ConsultationModule; LiveKit not integrated |
| 14 | Chat & Notifications | P2 | 🔒 | Phase 13 | No Notification module; no realtime transport |
| 15 | Laboratory & Radiology | P2 | 🔒 | Phase 10 | No backend module exists |
| 16 | Billing & Payments | P2 | 🧊 | Phase 9 | PaymentModule exists; PSP undecided |
| 17 | Analytics & Reports | P2 | 🔒 | Phase 6 | AnalyticsModule not confirmed built |
| 18 | Search | P2 | 🔒 | Phase 6 | No search endpoints documented yet |
| 19 | Admin Panel, Super Admin, Multi-Tenant/Multi-Hospital Operations, Hospital Resources, Audit Timeline & White Labeling | P2 | 🔒 | Phase 5 | Administration is thin; no multi-tenant model, no Hospital Resource module, no general-purpose Audit module |
| 20 | Feature Flags | P3 | 🔒 | Phase 6 | ConfigurationModule not confirmed built — a `useFeatureFlag()` stub exists (`shared/lib/feature-flags.ts`) that only resolves to its local default, no backend wiring |
| 21 | Real-time Platform (WebSockets/Presence) | P2 | 📋 | Phase 2 | none required for transport itself |
| 22 | File Uploads & Media Viewer | P1 | 📋 | Phase 2 | AssetModule (built) |
| 23 | Offline / PWA | P3 | 📋 | Phase 3 | none |
| 24 | Dark Mode | P2 | 🚧 | Phase 1 | none — mechanism shipped early as part of Phase 2's app-shell foundation, see 3.25's note |
| 25 | Accessibility Hardening (WCAG 2.2 AA) | P1 (continuous) | 📋 | Phase 1 | none |
| 26 | Testing Strategy | P0 (continuous) | 🚧 | Phase 0 | none — MSW (mocking) configured as part of Phase 2 |
| 27 | Performance Optimization | P2 (continuous) | 📋 | Phase 6 | none |
| 28 | SEO | P3 | 🚧 | Phase 6 | none — `buildPageMetadata()` helper exists (Phase 2), unused by any real public page yet |
| 29 | Security Hardening | P0 (continuous) | 📋 | Phase 4 | Auth |
| 30 | Monitoring & Observability | P1 | 🚧 | Phase 6 | Backend's own correlation-ID/structured-logging pattern — a console-only `trackEvent()` stub exists (Phase 2), no vendor chosen |
| 31 | Deployment & CI/CD Maturity | P1 | 🚧 | Phase 0 | none |
| 32 | Future Mobile App Preparation | P3 | 📋 | Phase 2, 22 | none |

*("Backend Status" column names the real dependency — read it before starting a phase, not after.)*

---

### 3.2 Phase 1 — Design System & UX Foundations

**Priority:** P0 · **Status:** 🚧 In Progress · **Depends on:** Phase 0 · **Backend dependency:** none

**Shipped (this iteration):**
- Design tokens (color primitives + semantic layer, typography, spacing/breakpoints via Tailwind v4's own scale, radius, shadow, opacity, motion, z-index) wired through Tailwind v4's `@theme`, in `design-system/tokens/`
- A light/dark **token layer only** — `theme-dark.css` defines both the `prefers-color-scheme` and `[data-theme]`-attribute values; no toggle/persistence exists yet, since that mechanism is Phase 24's job, not this phase's
- Typography primitives (`Display`, `Heading`, `Text`, `Caption`, `Code`) in `design-system/typography.tsx`
- Responsive primitives (`Container`, `Grid`) and the `Icon` wrapper (lucide-react, RTL-mirroring prop, size scale, accessible-label handling) in `shared/`
- The full base/overlay/navigation/state/layout/form component set from this phase's scope list below — Button, Input, Textarea, Select, Checkbox, Radio, Switch, Badge, Avatar, Card, Alert, Tooltip, Popover, Dialog, Drawer, Sheet, Tabs, Accordion, Table, Pagination, Breadcrumb, Empty State, Loading State, Skeleton, Spinner, Toast, Dropdown, Command Palette, plus Sidebar/Header/Topbar/Footer/Content/PageContainer/Section/MetricCard/StatCard — built on Radix UI primitives (accessible focus/portal/ARIA behavior) and `class-variance-authority`/`clsx`/`tailwind-merge` for variants
- The shared form system (`shared/ui/form.tsx`): React Hook Form + Zod + Radix Label, with correct `aria-describedby`/`aria-invalid` wiring
- Storybook (the plain, Next-agnostic `@storybook/react-vite` framework — both of Storybook 8.x's Next.js-specific integrations, `@storybook/nextjs` (webpack) and `@storybook/experimental-nextjs-vite`, were tried first and each hits its own hard incompatibility with Next.js's internal, non-public module layout that no version pin fixes; documented in `.storybook/main.ts`) with a story per component, an LTR/RTL and light/dark toolbar switcher, and the a11y addon set to fail on violations
- Vitest + React Testing Library, with tests for a representative cross-section (Button, Checkbox, Alert, Pagination, Icon, `cn()`, and an end-to-end Zod + React Hook Form validation flow) — not yet a test for every single component
- Verified: `typecheck`, `lint`, `test` (14/14 passing), and both the Next.js production build and the Storybook static build all succeed

**Explicitly not yet done (do not assume otherwise):**
- **Charts system** — no chart library is installed; Phase 1's "charts as a first-class primitive" requirement is unmet. Adding one (e.g. a Recharts/visx-class decision) is a new-dependency decision like Radix/lucide-react were and should go through the same explicit approval this phase's other library choices did, not be picked silently.
- **Date/time pickers and file pickers** — not built; Form's scope currently covers text/select/checkbox/radio/switch inputs only.
- Sorting/filtering logic for the data table — `Table` ships accessible semantic markup only; live sort/filter state is feature-level composition (or a future dedicated headless table library), per the component's own code comment.
- The `packages/ui` extraction readiness is a structural intent (no cross-package imports), not verified by an actual extraction.
- Visual verification (does every component actually *look* right in both directions and both themes) was done through Storybook's build succeeding and each story's markup/props being correct — not through a human or automated screenshot review in a running browser, since this session has no browser available. Treat this as CLI/build/test-verified, not yet visually verified.

**Scope, organized by sub-system:**

- **Design tokens** — color, spacing, typography, radii, elevation/shadow, and motion-duration/easing scales, all theme-direction-agnostic (light/dark) and locale-direction-agnostic (LTR/RTL) from the first token
- **Typography** — type scale, font stacks for both Latin and Arabic script (a single font family rarely covers both well; this must be decided here, not discovered mid-build), line-height/tracking tuned per script
- **Color system** — semantic color roles (not just raw palette values) so dark mode (Phase 24) and any future white-label theming (Phase 19) are palette swaps, not component rewrites
- **Spacing** — a single spacing scale used everywhere; no ad hoc pixel values in feature code
- **Grid system** — a shared layout grid (columns, gutters, container widths per breakpoint) that Responsive Layouts (below) and every page-level composition build on, rather than each feature inventing its own column math
- **Icons** — an icon set with an explicit RTL-mirroring policy (directional icons like "back"/"forward" must flip with locale direction; symmetric icons must not), plus documented icon-usage guidelines (sizing scale, stroke weight, when an icon requires an accessible label vs. is purely decorative — feeds Phase 25's screen-reader scope)
- **Illustration system** — a shared set of empty-state/onboarding/error-page illustrations (consistent style, locale-neutral imagery — no text baked into illustration assets, since baked-in text can't be translated by Phase 3), so Phase 1's empty/error states and later feature-level empty states don't each commission ad hoc art
- **Avatar system** — a shared avatar primitive (patient/doctor photo, initials fallback, status/presence indicator dot feeding Phase 21's presence data, size scale) used everywhere a person is represented, rather than a bespoke avatar per portal
- **Component library** — buttons, inputs, cards, modals, tables, tabs, and the data-heavy primitives clinical UIs actually need: **data tables** (sorting, pagination, dense clinical data) and a **charts system** (chart types, color-to-meaning mapping, legend/tooltip conventions — for Phase 17's analytics and Phase 15's lab reference ranges) as first-class, reusable primitives — not one-off implementations per feature
- **Form components** — inputs, selects, date/time pickers (locale- and calendar-aware per Phase 3), file pickers (feeding Phase 22), validation-message display (consistent with Phase 2's error-handling convention)
- **Motion system** — what animates, what doesn't, and why: healthcare UIs favor calm, low-motion transitions per the product's own "premium, calm" design language; this phase defines the *system* (durations, easings, `prefers-reduced-motion` handling per Phase 25's WCAG 2.2 AA target), individual features consume it rather than inventing their own timings
- **UX states & loading patterns** — skeleton loading states, spinners, progressive/streaming loading (consumed by Phase 27's Server Component streaming rather than invented per feature), empty states, error pages (404/500/domain-specific), success states, a toast/notification-banner system — with an explicit decision, made once here, for *which* loading pattern applies to which situation (skeleton for known-shape content, spinner for unknown-duration actions, streaming for progressively-available Server Component data) so features don't each guess
- **Responsive layouts** — breakpoints and layout primitives for mobile/tablet/desktop (the product's clinical users include doctors on tablets in a consultation room and patients on phones) — this absorbs what was previously scoped under "Responsive Design" in an earlier draft of this document; it lives here, not as a separate phase, because it's a token/primitive concern, not a standalone feature
- The dark-mode **token layer** specifically (the actual light/dark toggle and persistence is Phase 24; the tokens that make it possible are built here)

**Key decisions & constraints:**
- Design tokens must be theme-direction-agnostic (light/dark) and locale-direction-agnostic (LTR/RTL) from the first component — retrofitting either later means touching every component twice. This phase and Phase 3 (i18n) are sequenced adjacently for exactly this reason.
- No component here encodes a business rule. A `<PatientStatusBadge>` is a domain component (later phase); a `<Badge>` is a design-system primitive (this phase).
- Component library should be structurally ready for a future `packages/ui` extraction (per `docs/13-engineering-bootstrap.md`'s monorepo blueprint), even though that package doesn't exist yet — don't hard-couple components to `apps/frontend`-only concerns.
- Charts and data tables must be built with RTL rendering in mind from the start (axis direction, column order, legend placement) — Phase 3's RTL requirements apply to these components too, not just text-heavy ones.

**Definition of done:** a documented (Storybook or equivalent) set of primitives covering every state (default/loading/empty/error/success), both directions (LTR/RTL), and both themes (light/dark) for the components the next several phases will need. **Not yet met in full** — see "Explicitly not yet done" above (charts system, date/time and file pickers, and human/screenshot visual verification are the open items before this phase can move to ✅ Completed).

---

### 3.3 Phase 2 — Global State, API Layer & Forms

**Priority:** P0 · **Status:** 🚧 In Progress · **Depends on:** Phase 1 · **Backend dependency:** existing modules only (1.3)

**Implementation checklist:**
- ✅ **Implemented** — TanStack Query (`QueryClient` per app instance, conservative defaults, Devtools in dev)
- ✅ **Implemented** — query-key convention (`shared/lib/api/query-keys.ts`)
- ✅ **Implemented** — API layer (`apiFetch` in `shared/lib/api/client.ts`, relocated from Phase 0)
- ✅ **Implemented** — single error-handling convention (`toUserMessage`/`reportQueryError`, wired as TanStack Query's global `onError`)
- ✅ **Implemented** — imperative toast system (`shared/ui/use-toast.ts` + `toaster.tsx`)
- ✅ **Implemented** — environment validation (Zod schema, `shared/lib/env.ts`, lazily evaluated)
- ✅ **Implemented** — MSW request mocking, browser (opt-in) and Node (test) targets
- 🚧 **Scaffolded** — auth-header injection point in `apiFetch` (`__setAuthHeaderProvider`): the function exists and is called on every request, but it is a hardcoded no-op today — no real token is ever attached, by design, until Phase 4 exists
- 📋 **Remaining** — OpenAPI contract tests (named in this phase's own Definition of Done, not built — see below)
- 📋 **Remaining** — a client-only global store for UI state, if a feature ever needs one beyond TanStack Query's server cache (none has, yet)

**Shipped (this iteration):**
- TanStack Query as the chosen server-state layer — one `QueryClient` per app instance (`shared/providers/query-provider.tsx`, created inside `useState`, never module-scoped), conservative defaults (`staleTime: 30s`, `retry: 1`) matching Phase 27's stale-data caution for clinical data, with React Query Devtools in development only
- A query-key convention (`shared/lib/api/query-keys.ts`) — hierarchical `[domain, 'list'|'detail', ...]` tuples, so a feature's keys are consistent without each one inventing its own shape
- `apiFetch` relocated from Phase 0's `src/lib/` into `shared/lib/api/client.ts` (the `shared/` convention Section 1.6 established), with an auth-header injection point (`__setAuthHeaderProvider`) that Phase 4's real `AuthProvider` will call — a no-op today, since faking a header would imply a security posture that doesn't exist
- A single error-handling convention (`shared/lib/api/error.ts`): every `ApiError`/thrown error reaches the user as a toast via `reportQueryError`, wired as TanStack Query's global `onError` so individual features don't each re-plumb this; a feature can still add a more specific inline message on top
- An imperative toast system (`shared/ui/use-toast.ts` + `shared/ui/toaster.tsx`) built on Phase 1's Radix `Toast` primitives — callable from outside React (needed by the query-error handler above, which runs in TanStack Query's cache callback, not a component)
- Environment validation upgraded from Phase 0's hand-rolled check to a Zod schema (`shared/lib/env.ts`), still lazily evaluated (cached on first access, not at module-import time) so `next build`'s static analysis can't crash on a missing var the way an eager parse would
- MSW (Mock Service Worker) wired for both a browser worker (`src/mocks/browser.ts`, opt-in via `NEXT_PUBLIC_ENABLE_API_MOCKS`, off by default) and a Node server (`src/mocks/server.ts`, for tests) — the API mocking strategy named in Phase 26's Developer Experience scope

**Explicitly not yet done:**
- **Contract tests against the live OpenAPI spec** — this was named in this phase's own Definition of Done and is not built. The Phase 0 incident this rule exists to prevent could still recur today. This is the single most important open item before this phase can be marked ✅.
- Global state management strategy beyond TanStack Query's server-cache — no client-only global store (e.g. for UI-only cross-feature state) has been needed yet; add one only when a real feature needs it, per Section 1.6's "promoted only once a second feature actually needs it" rule.
- Form primitives/validation itself shipped in Phase 1 (`shared/ui/form.tsx` + Zod); this phase only adds the surrounding query/error/mock infrastructure forms will run inside.

**Key decisions & constraints:**
- Contract tests against the live OpenAPI spec are part of *this* phase's Definition of Done, not deferred to "Phase 26 — Testing Strategy" — the incident that motivated this document happened because no such test existed. **Still open — see above.**
- Loading states (skeletons from Phase 1) must be wired to real request lifecycles here, not left as visual-only components — TanStack Query's `isPending`/`isFetching` states are the wiring point once a real feature query exists; nothing to wire yet since no feature has shipped a query.

**Definition of done:** every subsequent phase can consume a typed, contract-verified API call and a shared form/validation/error pattern without inventing its own. **Not yet met in full** — the API/error/toast/mocking layer is real and consumable; contract verification against the OpenAPI spec is the missing piece.

---

### 3.4 Phase 3 — Internationalization (i18n) & Localization

**Priority:** P0 · **Status:** 🚧 In Progress · **Depends on:** Phase 1 · **Backend dependency:** none for UI-string localization; **🔒 partially blocked** for Medical Localization (see below) — no Reference Data module (ICD-11, Drug Catalog) exists yet to translate

This phase is the single most foundational cross-cutting decision after the design system itself. Per `docs/13-engineering-bootstrap.md` Section 5 and the product's own UX requirements, RTL and localization must be built in from the *first* real page, not retrofitted — every component and page built after this phase inherits whichever assumption it bakes in. It is sequenced P0, immediately after the design system, for that reason.

**Implementation checklist:**
- ✅ **Implemented** — `next-intl` architecture: route-based locale segments (`app/[locale]/...`), middleware (`src/middleware.ts`), locale-aware navigation helpers (`shared/i18n/navigation.ts`), server-side translation resolution (`getTranslations` in the async home page)
- ✅ **Implemented** — RTL/LTR mechanism: `dir="rtl"|"ltr"` set on `<html>` per locale (`shared/i18n/routing.ts`'s `isRtlLocale`)
- ✅ **Implemented** — English and Arabic message files exist (`messages/en.json`, `messages/ar.json`), currently 2 namespaces (`common`, `home`)
- 📋 **Remaining** — **Localization content**: only the two namespaces above are translated; every future feature's UI strings still need writing in both languages as that feature is built
- 📋 **Remaining** — Translation Management's per-feature namespace splitting (only relevant once a second feature needs its own namespace)
- 📋 **Remaining** — Date & Time (Hijri calendar, timezone handling beyond the browser default), Numbers & Currency formatting beyond `next-intl`'s defaults, Regional & Country Configuration (country profiles, phone/address formatting, locale-specific validation)
- 📋 **Remaining** — i18n-specific Accessibility (RTL-correct keyboard nav/localized ARIA — nothing to verify against yet, no real interactive page exists), Testing (RTL visual regression, translation-coverage checks)
- 🔒 **Blocked** — Medical Localization (ICD/drug/lab/radiology terminology) — no Reference Data module exists backend-side to translate
- 🔒 **Blocked** — Search/Notifications/AI-specific localization — depend on Phases 18/14/12 respectively, all themselves blocked or not yet built
- 🧊 **Deferred** — Hijri calendar (no confirmed product requirement yet)

#### 3.4.1 Architecture Decision (binding, added to Section 1.1)

The frontend is built from day one on:

- **Next.js App Router** with **route-based locale segments** (`app/[locale]/...`) — locale is part of the URL, not a cookie-only or client-only concern, so every route is unambiguous and shareable
- **`next-intl`** as the translation library — namespace-based message files, lazy-loaded per route/namespace rather than one giant dictionary
- **Server Components** performing **server-side translation resolution** wherever possible — translated strings render on the server, not shipped as client-side lookup tables for every page
- **Locale-aware metadata** (`generateMetadata` per locale) and **locale-aware routing/navigation helpers** (a typed `Link`/`redirect`/`usePathname` wrapper that always carries the current locale, so no page can accidentally link to an unlocalized path)

This is why Phase 0's retrofit debt (noted above) matters: the current `app/` tree has none of this, and Phase 3 is where it gets built correctly rather than patched.

#### 3.4.2 Scope

**Languages**
- English (default fallback for untranslated strings during rollout) and Arabic (the product's primary locale, per `docs/03-ux-foundation.md`'s Arabic-first requirement) at launch
- Structural support for future additional languages (namespace/message-file structure that scales past two locales, not a two-locale-hardcoded assumption)
- Dynamic locale switching, auto language detection (`Accept-Language` on first visit), URL-based locale segments, cookie persistence of the user's chosen locale, a per-user language preference (once Phase 8's Patient/Phase 7's Doctor profile exists to store it), and a hospital-level default language (🔒 depends on Phase 19's multi-hospital data model existing)

**RTL / LTR**
- Full RTL support and dynamic direction switching driven by the active locale
- **Logical CSS properties** (`margin-inline-start`, not `margin-left`) throughout — the mechanism that makes direction switching a locale change, not a component rewrite
- Icon mirroring policy (see Phase 1)
- RTL compatibility for charts, tables, forms, and the calendar component specifically — these are the components most likely to be built LTR-only by habit and silently ship broken in Arabic

**Translation Management**
- `next-intl` namespaces per feature area (not one global dictionary)
- Lazy-loaded dictionaries (a Doctor Portal page shouldn't load Billing's strings)
- ICU Message Format for pluralization and interpolation
- Locale-aware date, number, currency, and timezone formatting (see below)

**Medical Localization** — 🔒 **blocked on backend Reference Data work** (Section 1.4): ICD terminology translation, drug names, laboratory terminology, and radiology terminology all require a structured, translatable Reference Data source that does not exist in the backend yet (today's `drugCatalogId` on a Prescription line item is stored as a plain, unvalidated string, precisely because `ReferenceDataModule` doesn't exist). General clinical *UI* terminology (labels, instructions, workflow copy) is not blocked and proceeds as normal translation work; translating the *data* (an actual ICD-11 code's display name, a drug's name) is blocked until that backend module exists. Do not fake this with a client-side translation table for medical codes — that would create exactly the kind of competing source of truth Section 1 forbids.

**Date & Time**
- Gregorian calendar at launch; Hijri calendar explicitly 🧊 future (no product requirement confirmed yet — do not build speculatively)
- 12/24-hour format, user timezone, hospital timezone (🔒 depends on Phase 19), locale-aware calendar rendering (feeds Phase 9's appointment calendar directly)

**Numbers & Currency**
- Arabic-indic and Western Arabic numeral display per locale convention
- EGP as the primary currency (matches ADR-004's Egypt-region focus); USD/EUR structural support, not necessarily live at launch
- All formatting locale-aware via `next-intl`'s number formatting, never hand-rolled

**Regional & Country Configuration**
- **Country profiles** — a structural, per-country configuration object (default locale, default currency, default calendar, phone/address format) so expansion beyond Egypt (🧊 no product requirement confirmed yet — do not build speculatively beyond the structure) is a new profile, not a rewrite
- **Regional configuration** — hospital-level or deployment-level defaults (language, timezone, currency) layered on top of the country profile, feeding Phase 19's per-tenant configuration once the multi-hospital data model exists
- **Locale-specific validation** — phone numbers, national ID formats, and address structures validated per the active country profile's rules, not a single hardcoded pattern; this is *structural* client-side validation only (per Phase 2's rule that business-critical validation stays server-side)
- **Phone formatting** — country-aware phone number display/input masking (Egypt's format at launch, structured for others)
- **Address formatting** — country-aware address field order and format (not every country profile uses the same street/city/postal-code ordering)
- **Timezone profiles** — the country/hospital-level timezone default referenced in the Date & Time section above, resolved consistently rather than re-derived per feature

**Accessibility (i18n-specific slice — see Phase 25 for the full WCAG scope)**
- RTL-correct keyboard navigation (tab order follows visual/logical order in both directions)
- Localized `aria-label`s and localized form-validation messages (not English-only accessibility strings bolted onto a translated UI)

**Search** — 🔒 depends on Phase 18 (no search endpoint exists yet): Arabic search, English search, mixed-language search, transliteration support, accent-insensitive matching. Scope this here now so Phase 18 doesn't have to relitigate locale handling later, but the actual capability ships with Phase 18.

**SEO** — relevant only where Phase 28 applies (public surfaces): `hreflang` tags, localized metadata, localized sitemap, localized Open Graph and structured data.

**Notifications** — 🔒 depends on Phase 14 (no Notification module exists yet): email, SMS, push, and WhatsApp localization. Scope only; not buildable until Phase 14 unblocks.

**AI** — 🔒 depends on Phase 12 and the Azure OpenAI integration going live (Section 1.1): Arabic and English prompt authoring, localized AI responses, and — critically — **medical terminology consistency** between the AI's output language and whatever Medical Localization (above) has actually translated. This is a real risk worth naming now: an AI-generated Arabic SOAP draft referencing a drug name that hasn't been through Medical Localization yet is a consistency bug waiting to happen, not a hypothetical.

**Testing**
- RTL visual regression tests, translation coverage checks (every namespace key has both locales), missing-translation detection (fails CI, doesn't silently fall back in production), locale-switching tests, snapshot tests per locale/direction combination

**Key decisions & constraints:**
- RTL and localization are tested from the *first* real page (Phase 6 onward), not retrofitted — this phase's entire reason for being P0.
- Medical Localization is explicitly partially blocked; do not let schedule pressure turn that into a client-side workaround that fabricates translated medical data.
- Every locale-aware component built in Phase 1 must be verified against this phase before Phase 6 (the first real domain page) begins.

**Definition of done:** Phase 1's component library — including charts, tables, and forms — renders correctly in both locales and both directions, backed by real `next-intl` message namespaces and route-based locale segments, before any domain page is built on top of it. Medical Localization remains explicitly tracked as blocked, not silently dropped from scope.

---

### 3.5 Phase 4 — Authentication

**Priority:** P0 · **Status:** 🚧 In Progress (implemented against a mocked backend contract) · **Depends on:** Phase 2 · **Backend dependency:** Keycloak integration does not exist on the backend yet — this is the single largest cross-cutting gap in the whole system, flagged repeatedly across the backend's own hardening reports.

**Priority-change note (per Section 0's rule — not a silent reorder):** this phase was pulled forward from 🔒 Blocked to active implementation on explicit architect direction, built entirely against an MSW-mocked `/auth/*` contract (`src/mocks/handlers/auth.ts`) rather than waiting for real Keycloak availability. This is deliberately **not** the "temporary fake-auth mode" this section's own key decision warns against: the mock lives behind the same `authApi` interface (`features/auth/api/auth-api.ts`) a real Keycloak-backed implementation will fill in later, so swapping it is a change to that one file's function bodies, not to any page, hook, or component that consumes it. Every session produced today is a real, working session *against the mock* — genuinely functional UI, genuinely fake backend, and the document is explicit about which is which throughout this section.

**Scope (once unblocked):** login, registration, forgot/reset password, refresh-token handling, logout (single session and all-devices), session expiry UX.

**Implementation checklist:**
- ✅ **Implemented** — auth API contract types (`features/auth/api/types.ts`): `LoginRequest`/`LoginResponse`, `RegisterRequest`/`Response`, forgot/reset password, verify/resend-verification email, refresh/session responses, `DeviceSession`, `LoginHistoryEntry`, and the `AUTH_ERROR_CODES` the UI branches on
- ✅ **Implemented** — `authApi` (`features/auth/api/auth-api.ts`) — the single module that calls `/auth/*`; every function is a thin typed wrapper over `apiFetch`, no logic of its own
- ✅ **Implemented** — MSW mock backend (`src/mocks/handlers/auth.ts` + `src/mocks/auth-store.ts`) — a stateful, in-memory mock covering login (including invalid-credentials/locked/unverified/rate-limited outcomes), registration, forgot/reset password (with expired/invalid token simulation), email verification, session recovery, refresh, logout, logout-all, device sessions (list + revoke), login history
- ✅ **Implemented** — Zod validation schemas (`features/auth/schemas/`) for login, register, forgot-password, reset-password — schema *factories* parameterized by a translator function, so every validation message is a real `next-intl` string (`messages/{en,ar}.json`'s `auth.validation` namespace), never hardcoded English
- ✅ **Implemented** — Password Strength Meter (`features/auth/components/password-strength-meter.tsx` + `features/auth/lib/password-strength.ts`) — the same `isPasswordStrongEnough` function backs both the visual meter and the register/reset-password schemas' actual validation rule, so the meter shown to a user and the rule that blocks submission can never disagree
- ✅ **Implemented** — `SessionProvider` (`features/auth/providers/session-provider.tsx`) — replaces the old always-unauthenticated stub; a real TanStack Query-backed session, wired to `shared/auth/auth-context.tsx`'s generic `AuthContext`/`useAuth()` (split from the provider specifically so `shared/` never depends on `features/`, per Section 1.6 — the routing layer, `app/[locale]/layout.tsx`, is what composes the two together)
- ✅ **Implemented** — Session Persistence + Session Recovery (`features/auth/api/session-bootstrap.ts`) — on app load, attempts a refresh (simulating an httpOnly refresh-cookie backed request) then fetches the user; either step failing means "no session," not an error
- ✅ **Implemented** — Silent Refresh Architecture (`features/auth/hooks/use-silent-refresh.ts`) — while authenticated, schedules a background token refresh ~60s before expiry, self-rescheduling on success; a failed refresh clears the session (Expired Session Handling)
- ✅ **Implemented** — Token Storage Strategy (`shared/auth/token-storage.ts`) — access token kept in memory only (never `localStorage`/`sessionStorage`), an interface + factory so tests can substitute their own instance rather than mutating shared module state
- ✅ **Implemented** — `useLogin`/`useLogout`/`useLogoutAllDevices` (`features/auth/hooks/`) — TanStack Query mutations that write directly to the session query's cache on success, no extra refetch round-trip
- ✅ **Implemented** — end-to-end verified: a Vitest integration test (`features/auth/providers/session-provider.test.tsx`) exercises the real login → authenticated → logout → unauthenticated flow, and the invalid-credentials error path, against the MSW mock — not a mocked-out provider, the actual `SessionProvider` + hooks + mock backend together
- ✅ **Implemented** — Login, Register, Forgot Password, Reset Password, Verify Email, and Check Email pages (`app/[locale]/(guest)/`), each backed by a dedicated form component (`features/auth/components/`) using Phase 1's design system, React Hook Form + this phase's Zod schemas, and fully localized (no hardcoded strings — every page copy and validation message routes through `messages/{en,ar}.json`'s `auth.*` namespaces)
- ✅ **Implemented** — Guest Routes (`app/[locale]/(guest)/layout.tsx`) — redirects an already-authenticated visitor away from these pages to `/`, the guest-side mirror of `RequireAuth`'s protected-route redirect
- ✅ **Implemented** — the login form reacts to every mock error outcome distinctly: Account Locked routes to `/account-locked`, Email Not Verified shows an inline resend-verification action, Too Many Attempts and Invalid Credentials surface inline (the "Too Many Attempts UI" is this inline alert, not a separate page)
- ✅ **Implemented** — Account Locked, Session Expired, Unauthorized, Forbidden, and Access Denied pages (`app/[locale]/(status)/`), each built on a shared `StatusPage` component (`features/auth/components/status-page.tsx`) with a distinct icon, localized copy, and a single primary action; code comments document the distinction between the four access-related pages (no session at all vs. session ended vs. authenticated-but-wrong-role vs. broader non-role denial) so future pages route to the right one instead of collapsing them together
- ✅ **Implemented** — Security Center (`app/[locale]/(protected)/security/page.tsx`), the first page behind Protected Routes (`app/[locale]/(protected)/layout.tsx`, the `RequireAuth`-backed mirror of `(guest)`'s layout, redirecting an unauthenticated visitor to `/unauthorized`): Device Sessions (`features/auth/components/device-sessions-list.tsx` + `use-device-sessions`/`use-revoke-device-session`) lists every signed-in device, badges the current one, and revokes any other with a confirm dialog; Login History (`login-history-table.tsx` + `use-login-history`) lists recent sign-in attempts with their outcome; Logout All Devices (`logout-all-devices-button.tsx`, reusing `useLogoutAllDevices` from Phase 4) ends every session including the current one and redirects to `/login`
- ✅ **Implemented** — Vitest/RTL coverage for every form/page built in this phase: `login-form.test.tsx` (validation, invalid credentials, unverified-email resend), `register-form.test.tsx` (validation, email-taken, success), `forgot-password-form.test.tsx`, `reset-password-form.test.tsx` (expired/invalid token vs. valid token), `verify-email-status.test.tsx` (success, expired/invalid link, and a generic non-token failure), `status-page.test.tsx`, and the Security Center components (`device-sessions-list.test.tsx` including the revoke flow, `login-history-table.test.tsx`, `logout-all-devices-button.test.tsx`) — all against the real MSW mock backend, not stubbed-out hooks
- ✅ **Implemented** — Storybook stories for the shared `StatusPage` (all five variants) and `AuthCard` shells (`status-page.stories.tsx`, `auth-card.stories.tsx`)
- 📋 **Remaining** — none for this phase's originally scoped UI
- 🔒 **Blocked** — replacing the mock with real Keycloak calls: no Keycloak integration exists backend-side; this remains true regardless of how complete the mocked implementation becomes

**MFA readiness:** `LoginResponse.mfaRequired` exists in the contract type so a future MFA step doesn't require a breaking response-shape change. No mock account sets it to `true` and no verification UI exists — the field is present, not branched on, per this phase's "prepare the architecture, don't fake the security" requirement.

**Key decisions & constraints:**
- The frontend must not build a "temporary" fake-auth mode. `docs/13-engineering-bootstrap.md` Section 13 explicitly warns against this: a simplified fake-auth path that diverges from the real Keycloak integration shape is "a classic source of works-in-dev, breaks-in-staging auth bugs." The Phase 2 scaffolding above was built with this rule specifically in mind — it produces an honest unauthenticated state, never a fabricated authenticated one.
- Until backend enforcement exists, every current API call is unauthenticated by construction — no frontend code should imply otherwise (no fabricated "logged in as Dr. X" state backed by nothing real).
- When this phase unblocks, it unblocks Phase 5 immediately after — they are sequenced back-to-back deliberately.
- **Test infrastructure fix (this milestone):** any test rendering a component that uses `shared/i18n/navigation` (i.e. `next-intl`'s `createNavigation`) needs `vitest.config.ts`'s `resolve.alias['next/navigation']` and `test.server.deps.inline: ['next-intl']` — without them, Vitest's resolver fails to follow next-intl's nested pnpm symlink for `next/navigation` on this checkout (the repository path's em dash breaks Node's loader specifically for that hop; `next build`/Storybook never hit it). Components using `next/navigation`'s hooks also need `vi.mock('next/navigation', ...)` in the test file itself, since `useRouter`/`usePathname` throw outside a real Next.js App Router tree — see any of `login-form.test.tsx`, `register-form.test.tsx`, etc. for the pattern.

**Definition of done:** a real user can authenticate against a real Keycloak realm and the frontend holds a real, validated session — not before.

---

### 3.6 Phase 5 — Authorization (RBAC)

**Priority:** P0 · **Status:** 🔒 Blocked · **Depends on:** Phase 4 · **Backend dependency:** no role-based access control is enforced server-side yet.

**Scope:** role-aware routing and UI (Super Admin, Hospital Admin, Doctor, Receptionist, Nurse, Patient — per the product vision in `orivex-master-roadmap.md`), route guards, permission-gated components.

**Implementation checklist:**
- ✅ **Implemented** — `<RequireAuth redirectTo="...">` (`shared/auth/require-auth.tsx`) — redirects when not authenticated; now uses the locale-aware router (`shared/i18n/navigation.ts`) rather than `next/navigation` directly, fixing a real bug this milestone caught (an unlocalized redirect would have dropped the user out of their chosen locale)
- ✅ **Implemented** — `RoleGuard` (`shared/auth/role-guard.tsx`, renamed from `RequireRole` to match this phase's exact naming) — renders a fallback unless the current user has one of the listed roles; against a real, working session as of this milestone, not the old always-`null` stub
- ✅ **Implemented** — `PermissionGuard` (`shared/auth/permission-guard.tsx`) — finer-grained than `RoleGuard`, checks a specific capability via `shared/auth/permissions.ts`'s provisional role→permission map (real, working authorization logic for the roles this system already models — not verified against a real backend permission taxonomy, since none exists yet)
- ✅ **Implemented** — `FeatureGuard` (`shared/auth/feature-guard.tsx`) — gates rendering behind Phase 20's `useFeatureFlag()` stub, declaratively, so a page doesn't re-derive the flag check itself
- ✅ **Implemented** — verified: `role-guard.test.tsx`, `permission-guard.test.tsx`, `feature-guard.test.tsx`, `permissions.test.ts` all pass against a controlled `AuthContext` value (not the full `SessionProvider`, deliberately — these are isolated unit tests of the guard logic itself)
- 📋 **Remaining** — role-aware routing/dashboards per role, permission-gated components wired into real pages, everything else in this phase's scope beyond the three guard primitives and the permission model
- 🔒 **Blocked** — the entire real capability of this phase: no role-based access control is enforced server-side yet; every guard above remains a UX convenience, never the security boundary, no matter how complete the client-side implementation gets

RBAC's **guard components and permission model are implemented** — real, working, tested code. What remains 🔒 Blocked is everything that depends on the backend actually enforcing what these guards merely reflect: nothing in this phase moves off Blocked until real server-side authorization exists.

**Key decisions & constraints:** authorization decisions rendered in the UI (hiding a button) are a UX convenience, never the actual security boundary — the backend must independently enforce every permission this phase merely reflects. This phase cannot invent roles the backend doesn't recognize — `shared/auth/types.ts`'s `Role` union is deliberately the full set the eventual Keycloak realm will issue, not a frontend-invented list.

---

### 3.7 Phase 6 — Application Shell & Dashboard

**Priority:** P1 · **Status:** 🚧 In Progress (shell architecture, no business data yet) · **Depends on:** Phase 5 · **Backend dependency:** Identity, Doctor, Patient (all built)

**Priority-change note (per Section 0's rule):** pulled forward from 📋 Planned to active implementation on explicit architect direction, scoped deliberately to *shell architecture only* — no Patients/Doctors/Appointments/Consultations/Prescriptions/Payments/AI Assistant business module is built here, since none of those phases have shipped yet. This phase builds the navigation, layout, dashboard-widget, search, and notification *architecture* every business module will render inside once its own phase unblocks it — the same "prepare the architecture, don't fake the data" rule Phase 4 followed: `EmptyState`/`EmptyDashboard` where real data doesn't exist yet, never a fabricated metric.

**Scope:** the authenticated app shell (navigation, layout regions, role-aware landing dashboard), KPI/overview widgets (today's appointments, active patients/doctors — scoped to what's actually queryable today, not the full Analytics vision in Phase 17), global search UI (Phase 18's placeholder architecture, not real business indexing), notification center UI (Phase 14's placeholder architecture, MSW-mocked, not real backend delivery).

**Definition of done (once fully unblocked):** a logged-in user of any built role lands on a real, role-appropriate dashboard backed by real API calls. **Current milestone's definition of done:** a logged-in user lands on a real, working, role-aware application shell (navigation, breadcrumbs, user menu, command palette, notification center) with an honest empty dashboard — architecture complete, business data intentionally absent.

**Implementation checklist:**
- ✅ **Implemented** — Page framework (`shared/ui/layout/`): `Page`, `PageHeader`/`PageActions` (renamed from the prior `Header` for clarity alongside `PageActions`), `Section` (pre-existing), `DashboardGrid`, `WidgetContainer`, `WorkspaceHeader` (breadcrumbs + `PageHeader` composition) — every future business module is expected to build its pages from these rather than reinventing page-level spacing
- ✅ **Implemented** — Root Dashboard Layout (`app/[locale]/(protected)/layout.tsx` now composes `AppShell` inside `RequireAuth`) — every protected route automatically gets the Topbar/Sidebar/Content/Footer chrome
- ✅ **Implemented** — `AppShell` (`features/shell/components/app-shell.tsx`) composing the structural primitives (`Sidebar`/`Topbar`/`Content`/`Footer`, pre-existing from Phase 1/2 but never wired to real content until now) with session-aware pieces (`SidebarNav`, `UserMenu`, `MobileNav`)
- ✅ **Implemented** — Collapsible/Responsive Sidebar + Mobile Navigation: desktop `Sidebar` (`hidden lg:flex`) vs. `MobileNav` (`lg:hidden`, a `Drawer` — direction-aware, flips side under RTL for free) rendering the same `SidebarNav` content, never two different nav implementations
- ✅ **Implemented** — enterprise navigation architecture (`features/shell/config/navigation.ts` + `features/shell/lib/filter-navigation.ts` + `features/shell/components/sidebar-nav.tsx`): a single `NavItemConfig[]` data source, nested groups (`NavGroup`, collapsible disclosure widgets, not hardcoded submenus), active-route detection, and role/permission/feature-flag-aware filtering in one recursive pass (`filterNavigationByAccess`, a plain unit-testable function; the flag resolver itself is built by `use-navigation-feature-flags.ts`'s fixed, unconditional set of `useFeatureFlag` calls — one per known flag, since a hook can't be called inside a loop). Feature-flag filtering was originally deferred to a per-item render-time `FeatureGuard` wrap; the M5 test suite caught that this left a flagged-off group's *heading* still rendering (empty, clickless) even though its children correctly hid themselves, so filtering was moved into this single pass instead. Patients/Appointments/Prescriptions/Billing/Admin Users are all feature-flag-gated and default off, so none render as dead links today
- ✅ **Implemented** — application shell test suite (M5): `filter-navigation.test.ts` (role/permission/feature-flag filtering, including the empty-group regression above), `nav-item.test.tsx`, `sidebar-nav.test.tsx`, `breadcrumbs.test.tsx` (including a real nested-`<li>` markup bug the tests caught and fixed in `breadcrumbs.tsx`), `command-palette.test.tsx` (trigger, ⌘K shortcut, command execution, recent history), `notification-bell.test.tsx` (unread badge, mark-as-read, mark-all-as-read against the real MSW mock — also caught and fixed a `next-intl` `relativeTime` missing-`now` warning), `app-shell.test.tsx`, and widget tests (`widget-container`, `quick-actions`, `recent-activity`) — 101 tests total across the full suite. Storybook stories added for every new reusable `shared/ui/layout` primitive (`NavItem`/`NavGroup`, `PageHeader`, `Page`/`DashboardGrid`, `WidgetContainer`, `QuickActions`, `ActivityCard`, `RecentActivityContainer`, `ChartContainer`, `EmptyDashboard`, `WorkspaceHeader`)
- ✅ **Implemented** — Breadcrumb System (`features/shell/components/breadcrumbs.tsx`) — derived from the same nav config, not authored per page; renders nothing for a one-level route (no navigational value) or an unmapped route (no misleading partial trail)
- ✅ **Implemented** — Page Title System — `WorkspaceHeader` (breadcrumbs + `PageHeader`), used by `/dashboard` today, the pattern every future business page reuses
- ✅ **Implemented** — User Menu (`features/shell/components/user-menu.tsx`) — avatar + dropdown with account identity, Security Center shortcut, full light/dark/system theme control (`useTheme`, Phase 24's existing provider), and sign-out (`useLogout`, Phase 4's existing hook)
- ✅ **Implemented** — `/dashboard` route (`app/[locale]/(protected)/dashboard/page.tsx`), the new authenticated landing page — `GuestLayout`'s post-login redirect and `LoginForm`'s post-login navigation both updated to point here instead of `/` (the public backend-liveness demo page, unchanged and still standalone)
- ✅ **Implemented** — Dashboard Foundation widgets (`shared/ui/layout/`): `ActivityCard`, `RecentActivityContainer` (list + built-in empty state, caller-keyed items — never an index key), `QuickActions` (real `Link`s only, never a disabled placeholder button), `EmptyDashboard`, `ChartContainer` (the card shell a real chart will mount into once a business module has real series data — ships as a tested/storied primitive, not used with fabricated data on any real page)
- ✅ **Implemented** — Role layouts via shared architecture, not duplication: `features/shell/config/dashboard.ts`'s `DASHBOARD_SUBTITLE_KEY` maps each of the six roles to its own dashboard subtitle copy, rendered by the one `/dashboard` page — satisfies "layouts for Super Admin/Hospital Admin/Doctor/Nurse/Receptionist/Patient" without six near-duplicate page files
- ✅ **Implemented** — `/dashboard` now composes `WorkspaceHeader` (breadcrumbs + role-aware title/subtitle) + `DashboardGrid` + `QuickActions` (Security Center, the one real destination today) + `RecentActivityContainer` (honest empty state — no fabricated activity log, since no module produces one yet)
- ✅ **Implemented** — Command Palette / global search placeholder architecture (`features/shell/components/command-palette.tsx`): a self-contained trigger button + dialog (built on Phase 1's existing `CommandDialog`/`cmdk` primitives) mounted once in the Topbar, a global ⌘K/Ctrl+K shortcut (`use-command-palette.ts`, one document-level listener), and per-user recent-command history (`lib/recent-searches.ts`, `localStorage`-backed, capped at 5). Every entry is a real navigation or account action (`config/commands.ts`) — never a fabricated search result; Phase 18's real business-search indexing plugs into this same dialog later rather than replacing it
- ✅ **Implemented** — Notification Center UI: `features/notifications/` (a full feature module mirroring Phase 4's `features/auth/` shape — `api/types.ts`, `api/notifications-api.ts` the sole `/notifications/*` boundary, `hooks/`) backed by a real MSW mock domain (`mocks/notifications-store.ts` + `mocks/handlers/notifications.ts`, following `auth-store.ts`'s exact pattern), and the UI (`features/shell/components/notification-bell.tsx` + `notification-panel.tsx`): bell with unread-count badge, popover panel with loading skeleton / error / empty / list states, per-notification and mark-all-as-read actions, locale-aware relative timestamps (`next-intl`'s `useFormatter`). Real backend delivery remains Phase 14's own 🔒 Blocked scope (no Notification module exists server-side) — this milestone is the UI architecture only, exactly as scoped
- 🔒 **Blocked** — real KPI/overview data, role-specific business content: no Patients/Doctors/Appointments module exists in the frontend yet (by this phase's own explicit scope), and Search/Notifications' real backend integration remains blocked per Phase 18/14's own status

---

### 3.8 Phase 7 — Doctor Portal

**Priority:** P1 · **Status:** 📋 Planned · **Depends on:** Phase 6 · **Backend dependency:** `DoctorModule`, `TrustModule`, `AssetModule`

**Scope:** doctor profile management, availability/working-hours configuration (against `SchedulingModule`'s `AvailabilityWindow`), verification-document upload flow (`AssetModule`'s upload-intent/confirm lifecycle), patient search and history views (read-only, scoped by whatever the backend's consent/access rules actually allow — do not build a "view any patient" capability the backend doesn't grant).

---

### 3.9 Phase 8 — Patient Portal

**Priority:** P1 · **Status:** 📋 Planned · **Depends on:** Phase 6 · **Backend dependency:** `PatientModule`, `ClinicalModule` (read)

**Scope:** patient profile, appointment list, prescription history (read), Health Journey view. Insurance and invoice/payment views are scoped to Phase 16 once billing exists beyond a single transaction record.

---

### 3.10 Phase 9 — Appointment System & Calendar (incl. Queue Management)

**Priority:** P1 · **Status:** 📋 Planned · **Depends on:** Phase 6 · **Backend dependency:** `SchedulingModule`, `ConsultationModule` (built); Queue Management sub-scope 🔒 blocked — no Queue module (Section 1.4)

**Scope:** booking flow, availability calendar, rescheduling, cancellation, appointment reminders (client-side display only until a Notification module exists to actually deliver them). Recurring appointments and external calendar sync (Google/Outlook) are 🧊 deferred — no backend support and no vendor integration decision made yet.

**Queue Management** — 🔒 **blocked on backend Queue Management module** (Section 1.4): the in-clinic, same-day operational layer that sits below scheduled appointments —
- **Waiting queue** — the physical/virtual queue of patients checked in and waiting, distinct from the appointment calendar's future-dated bookings
- **Doctor queue** — a doctor-facing view of who is next, scoped to that doctor's own patients for the day
- **Token system** — sequential token/number issuance at check-in, the mechanism that actually orders the waiting queue
- **Estimated waiting time** — a computed estimate surfaced to the patient, derived from queue position and average consultation duration — must be presented as an estimate, never a guarantee, given how easily a clinical consultation can run long
- **Queue dashboard** — a reception/admin-facing live view of every active queue across doctors, feeding Phase 21's realtime layer for live updates rather than polling

**Key decisions & constraints:** the backend's booking flow already has documented, tested compensating-action logic for slot-reservation race conditions (Sprint 13/14 hardening) — the frontend must surface a clear "this slot was just taken" retry UX rather than a generic error, since that failure mode is a known, real, expected case, not an edge case to ignore. Queue Management is a same-day operational concept and must not be conflated with the appointment calendar's scheduling concept — they are sequenced together in this phase because reception staff experience them as one workflow, but they are backed by distinct backend concerns (Scheduling vs. the not-yet-built Queue module) and must stay two clearly separated UI surfaces, not one blended view.

---

### 3.11 Phase 10 — Electronic Medical Records, Medical/Patient Journey Timeline & Clinical Workflow

**Priority:** P1 · **Status:** 📋 Planned · **Depends on:** Phase 7, 8 · **Backend dependency:** `ClinicalModule` (Health Graph, Health Journey, Clinical Notes — built); Consent Management sub-scope 🔒 blocked — no Consent module (Section 1.4)

**Scope:** medical timeline visualization (built from `HealthGraphNode`/`HealthJourney` data, not a separate frontend data model), vitals/allergies/vaccinations/conditions display, clinical note authoring (treating-doctor-only, matching the backend's enforced authorization), document/attachment display via `AssetModule`.

**Patient Journey Timeline** — a broader, cross-module operational timeline distinct from the clinical-only Medical Timeline above. Where the Medical Timeline renders `HealthGraphNode`/`HealthJourney` clinical facts, the Patient Journey Timeline aggregates a patient's full interaction history across modules built in *other* phases: registration, appointments (Phase 9), payments (Phase 16), consultations (Phase 13), prescriptions (Phase 11), lab results (Phase 15), radiology (Phase 15), AI suggestions (Phase 12), and follow-ups. This view is a read-model composition over already-built phases, not a new backend capability — it ships incrementally, showing only the event types whose source phase has actually shipped, rather than waiting for every dependency to exist before any version ships.

**Consent Management** — 🔒 **blocked on backend Consent module** (Section 1.4; no such module exists today): patient consent capture (what a patient has agreed to, and for what purpose), consent history (a changeable-over-time record, following the same append-only philosophy as the Health Graph rather than allowing silent overwrites), consent revocation (a patient withdrawing a previously granted consent, with the UI reflecting that revocation's effective date rather than pretending it was never granted), medical record sharing (granting a specific other party — e.g. a referred specialist — time-bounded access to specific record scopes), emergency access (an documented override path for a treating clinician to access records without prior consent in a genuine emergency, which must be the most visibly logged action in the whole system, not the least), and a consent audit trail (who accessed what, under which consent grant or emergency override — surfaced through the shared Audit Timeline capability defined in Phase 19, not a bespoke audit view built here). Do not fabricate a client-side consent model ahead of the backend — this is exactly the kind of clinical-trust surface Section 1's "no competing source of truth" rule exists to protect.

**Clinical Workflow (document lifecycle)** — a shared lifecycle state machine — **Draft → Review → Approved → Signed → Locked → Archived** — that this phase defines once and Phase 11 (Prescriptions) and Phase 15 (Lab Orders, Radiology Reports) reuse rather than each inventing their own states. Defined here because Consultations (this phase's Clinical Notes) are the first document type that needs it:
- **Draft** — editable, not yet submitted for any review
- **Review** — submitted, awaiting a second party's review where the workflow requires one
- **Approved** — reviewed and accepted, not yet cryptographically/formally signed
- **Signed** — matches the backend's existing treating-doctor signing concept (e.g. Prescription signing's documented 422 safety gate, Phase 11) — this is the state with real clinical and legal weight
- **Locked** — signed and no longer editable by anyone through the UI, mirroring the Health Graph's append-only philosophy: a locked document is superseded by a new one, never edited in place
- **Archived** — retained for record-keeping, removed from active working views
Each backend aggregate this applies to must actually support the relevant states before the UI claims them — a status badge is not a substitute for the backend actually rejecting an edit to a Locked document; verify enforcement exists before shipping the affordance that implies it.

**Key decisions & constraints:** the Health Graph's append-only, forward-only design (nodes are superseded, never edited in place — an accepted backend ADR) must be reflected honestly in the UI: a timeline that shows history, not a form that implies a fact can be silently overwritten. Consent Management remains explicitly tracked as blocked, not silently dropped from scope or faked client-side. The Clinical Workflow lifecycle is a UI/UX pattern layered on top of whatever state each backend aggregate actually enforces — it must never imply a stronger guarantee than the backend gives.

---

### 3.12 Phase 11 — Prescriptions

**Priority:** P1 · **Status:** 📋 Planned · **Depends on:** Phase 10 · **Backend dependency:** `ClinicalModule`'s `Prescription` aggregate (built)

**Scope:** prescription creation (treating-doctor-only, enforced both server- and client-side), prescription history, print/PDF view, and status display driven by Phase 10's shared Clinical Workflow lifecycle (Draft → Review → Approved → Signed → Locked → Archived) — a prescription's own states map onto that shared state machine rather than introducing a parallel one.

**Key decisions & constraints:** the backend's documented "blocked with 422 if an unacknowledged Warning-tier AI suggestion exists" safety gate (an event-driven mechanism specifically built so Clinical never depends synchronously on AI) must be surfaced clearly in the signing UI — a doctor should see *why* signing is blocked, not just a generic error. The Signed/Locked distinction from Phase 10's lifecycle applies literally here: once the backend's signing gate passes, the prescription moves to Signed, and any UI implying it could still be edited after that point is a bug, not a design choice.

---

### 3.13 Phase 12 — AI Copilot Features

**Priority:** P1 · **Status:** 📋 Planned · **Depends on:** Phase 10, 11 · **Backend dependency:** `AIModule` (built: suggestion request + doctor-decision recording)

**Scope, mapped precisely to what the backend actually supports today:**
- AI SOAP Generator → `suggestionType: soap_draft`
- AI Follow-up Recommendations → `follow_up_plan`
- AI Prescription Suggestions (drafting, not deterministic safety-checking) → `prescription_draft`
- Suggested clinical questions → `suggested_question`
- Consultation summary → `summary`
- Interaction/allergy flag → `interaction_flag` — **display this as a deterministic, non-generative result** (ADR-002, Section 1.5) — visually distinct from the generative suggestion types above

**Not yet backed by any AIModule capability — do not build ahead of the backend:** AI Symptom Checker, standalone "AI Clinical Assistant" chat, AI Diagnosis Suggestions as a distinct capability, Voice Transcription, Medical Report Generator. These require new backend `suggestionType`s or entirely new capabilities that don't exist yet.

**AI Governance** — the trust and accountability layer every AI-suggestion UI must carry, not an optional polish pass:
- **Confidence scores** — where the backend actually returns one, display it; never fabricate a confidence figure the backend doesn't provide, and never let its absence be silently read by a doctor as "the AI is certain"
- **Explainability** — a suggestion should indicate *what it's based on* (e.g. which clinical note or Health Graph data informed a SOAP draft) wherever the backend surfaces that provenance, so a doctor isn't evaluating a suggestion in a vacuum
- **Prompt versioning** and **model version tracking** — every recorded AI suggestion should be traceable to the prompt/model version that produced it (a backend concern this phase depends on, not a frontend-invented field) — required for any future clinical-safety review of a specific suggestion
- **Human approval** — this is the existing `recordDoctorDecision` flow (approve/edit/reject, settable exactly once); named here explicitly as the human-approval mechanism this whole governance section anchors to, not a separate new feature
- **Feedback loop** — a lightweight mechanism for a doctor to flag a suggestion as unhelpful/wrong beyond the approve/edit/reject decision itself, feeding back to whoever owns model quality — scope only what the backend can actually receive and store; do not invent a client-only feedback log that goes nowhere
- **AI audit trail** — every suggestion, its decision, and its provenance metadata (prompt/model version) surfaced through the same shared Audit Timeline capability defined in Phase 19, consistent with how Consent Management (Phase 10) also plugs into that same shared audit view rather than each phase building its own

**Key decisions & constraints:** every AI suggestion the UI shows must carry its `requiresAcknowledgment` state and route through the same `recordDoctorDecision` flow the backend enforces (approve/edit/reject, settable exactly once) — the UI must never let a doctor "silently ignore" a suggestion that requires acknowledgment, since that's the exact safety gate Phase 11 depends on. AI Governance must preserve ADR-002's distinction (Section 1.5): confidence scores, explainability, and model-version tracking apply to *generative* suggestion types — the deterministic `interaction_flag` result is not a "model" with a "confidence score" in the same sense, and governance UI must not accidentally imply the deterministic check is itself a probabilistic AI output.

---

### 3.14 Phase 13 — Telemedicine (LiveKit)

**Priority:** P1 · **Status:** 📋 Planned · **Depends on:** Phase 9 · **Backend dependency:** `ConsultationModule` (session lifecycle exists); LiveKit itself is not integrated on either side yet, though it is the architecturally decided provider (Section 1.1)

**Scope:**
- Video consultation core: join/leave/reconnect flows against `ConsultationSession` state
- Virtual waiting room (patient-side, before the doctor joins)
- Screen sharing
- File sharing during a live session
- In-session chat (session-scoped, distinct from Phase 14's general chat/notifications)
- AI meeting summary (feeds into Phase 12's `summary` suggestion type once a session closes)
- Network quality indicator, device (camera/mic) selection
- Consultation timer
- Recording — 🧊 **explicitly future**, pending a retention-policy/storage decision (Section 1.2) before any UI is built for it, since recording clinical consultations has real compliance weight this document will not pre-empt

**Key decisions & constraints:** every telemedicine UI state must degrade gracefully to the documented "manual workflow still works" principle (`docs/10-backend-architecture.md`'s Clinical/AI dependency rule extends in spirit here) — a LiveKit outage must never block the underlying `ConsultationSession` record-keeping the rest of the clinical workflow depends on.

---

### 3.15 Phase 14 — Chat & Notifications

**Priority:** P2 · **Status:** 🔒 Blocked · **Depends on:** Phase 13 · **Backend dependency:** no Notification module exists (email/SMS/push delivery); no general realtime transport exists outside a LiveKit session yet

**Scope (once unblocked):** general (non-session) chat, in-app notification center, notification preferences, delivery-channel display (email/SMS/WhatsApp/push — each channel itself is 🧊 deferred per Section 1.2 until a provider is chosen).

**Internal Communication** — staff-to-staff messaging, explicitly separate from both Phase 13's in-session telemedicine chat (scoped to a single consultation, patient-facing) and the general chat above (also potentially patient-facing): Doctor ↔ Nurse, Doctor ↔ Reception, Doctor ↔ Admin, and internal announcements (a broadcast-style message from Admin to a role or hospital, not a 1:1 thread). This is an operational/staff surface with no patient visibility at all, and must be built as a distinct feature module (per Section 1.6's module-boundary convention) rather than a "patient chat with different participants" — the audience and trust model are different enough that conflating them risks a staff-only message becoming patient-visible by a UI mistake.

**Key decisions & constraints:** Internal Communication, session chat (Phase 13), and general/notification chat (above) all consume the same underlying realtime transport from Phase 21, but must remain three distinct UI surfaces with independently enforced audience boundaries — the backend's authorization model for who can see which channel is the real boundary; the frontend's separation exists so a UI bug can't blur it.

---

### 3.16 Phase 15 — Laboratory & Radiology

**Priority:** P2 · **Status:** 🔒 Blocked · **Depends on:** Phase 10 · **Backend dependency:** no Laboratory or Radiology backend module exists in any form today — this is a full backend scoping effort, not a frontend task waiting on a ticket.

**Scope (once a backend module is scoped and built):** lab order creation, result upload/view, reference ranges, critical-value alerts, radiology image viewer (X-ray/CT/MRI/ultrasound), study comparison, history. Lab Orders and Radiology Reports both consume Phase 10's shared Clinical Workflow lifecycle (Draft → Review → Approved → Signed → Locked → Archived) for their status display, the same way Phase 11's Prescriptions do — a lab order in Draft is distinct from one that's been Approved by a lab technician and Signed off by a radiologist/pathologist, and the UI must reflect whichever of those states the backend actually reports rather than a single generic "pending/complete" toggle.

---

### 3.17 Phase 16 — Billing & Payments

**Priority:** P2 · **Status:** 🧊 Deferred (PSP undecided) · **Depends on:** Phase 9 · **Backend dependency:** `PaymentModule` exists (charge initiation against a real consultation fee, validated server-side) — no PSP is bound (`NotConfiguredPaymentGatewayAdapter`)

**Scope (buildable now, PSP-agnostic):** payment status display, transaction history, receipt view — anything that reads `PaymentTransaction` state.

**Scope (blocked on PSP + further backend work):** invoicing, insurance/claims, refunds, discounts/coupons, tax handling, subscriptions — none of these have a backend model today beyond a single transaction record.

**Key decisions & constraints:** never hardcode a PSP's checkout widget/SDK into a page speculatively — the moment a PSP is chosen, that choice affects the client-side integration shape too, and guessing wrong means rework, not progress.

---

### 3.18 Phase 17 — Analytics & Reports

**Priority:** P2 · **Status:** 🔒 Blocked · **Depends on:** Phase 6 · **Backend dependency:** `AnalyticsModule` is documented (event-consumption only, by design never synchronously called) but not confirmed implemented

**Scope (once unblocked):** financial/operational reports, doctor performance, hospital/platform analytics, chart visualizations, PDF/Excel export.

**Key decisions & constraints:** per the backend's own hard rule, analytics is event-derived and read-only — the frontend must never expect real-time strong consistency from analytics views the way it can from, say, an appointment status.

---

### 3.19 Phase 18 — Search

**Priority:** P2 · **Status:** 🔒 Blocked · **Depends on:** Phase 6 · **Backend dependency:** PostgreSQL Full Text is the decided technology (Section 1.1) but no search endpoint is documented in the current OpenAPI surface

**Scope (once unblocked):** global search across patients, doctors, appointments, medical records; filters; saved searches; **saved filters** (a named, reusable filter combination, distinct from a saved search query); **recent searches** (a client-side/per-user history of recent queries, cleared per the same data-retention posture as any other user activity log); **smart search** (typo-tolerant/fuzzy matching, a PostgreSQL Full Text capability per Section 1.1 rather than a new search technology); **AI-assisted search** — 🔒 depends on Phase 12's AI capabilities existing first — natural-language query interpretation feeding the same underlying search endpoint, not a parallel AI-only search path; must still respect every authorization boundary a manual search would (an AI-assisted query cannot surface a result a manual search wouldn't have been allowed to return).

---

### 3.20 Phase 19 — Admin Panel, Super Admin, Multi-Tenant/Multi-Hospital Operations, Hospital Resources, Audit Timeline & White Labeling

**Priority:** P2 · **Status:** 🔒 Blocked · **Depends on:** Phase 5 · **Backend dependency:** `AdministrationModule` today is a thin re-export of Trust's verification workflow; there is no multi-hospital/multi-tenant data model, no Hospital Resource Management module, and no general-purpose Audit/Change-History module anywhere in the backend (Section 1.4).

**Scope (once unblocked):**

- **Admin panel** — user/role/permission management UI, moderation queues, subscription-plan administration, impersonation (with its own audit trail — impersonating a user is a security-sensitive action, log it as one)
- **Audit Timeline** — a shared, general-purpose entity-history capability, built once here and consumed by Phase 10's Consent Audit Trail and Phase 12's AI Audit Trail rather than each phase building its own audit view: **entity history** (every tracked change to a given record), **before/after change display** (a diff view, not just "field X was changed"), **timeline view** (chronological, filterable by actor/entity/date range), **filtering** (by module, entity type, actor role, action type), **export** (CSV/PDF for compliance requests), and **change visualization** (a human-readable rendering of a diff for non-technical reviewers — e.g. a compliance officer — not a raw JSON dump). This is 🔒 blocked on the same general-purpose Audit/Change-History backend module named in Section 1.4; today's per-module domain events are not a substitute, since they're designed for in-process side effects, not a queryable, exportable change history.
- **Multi-Hospital Operations** (expanded beyond simple multi-tenancy):
  - **Branch management** — a hospital operator managing multiple physical branches under one logical hospital entity
  - **Clinic management** — clinics as a finer-grained unit than a branch (a branch may host multiple clinics/specialties)
  - **Department management** — departments within a hospital/branch (Cardiology, Radiology, etc.), the organizational unit Phase 7's Doctor Portal and Phase 6's dashboard both need to scope views by
  - **Hospital switching** — a Super Admin or multi-affiliated Doctor operating in the context of one hospital/branch at a time, with the active context always visible in the UI (never an ambiguous "which hospital am I acting in" state)
  - **Cross-branch doctors** — a doctor affiliated with more than one branch/hospital, whose availability (Phase 7) and appointment calendar (Phase 9) must correctly scope per branch rather than presenting one merged, ambiguous schedule
  - **Shared patients** — a patient who has records across more than one branch/hospital under the same operator; surfacing this requires the same tenant-isolation architecture below to distinguish "shared legitimately" from "leaked across tenants"
  - **Referral between clinics** — a doctor or clinic referring a patient to another clinic/branch/specialist, tracked as a first-class workflow (not an informal note), feeding Phase 10's Patient Journey Timeline as a distinct event type
  - Tenant isolation (a hospital's data must be architecturally unreachable from another tenant's session, not just filtered in a query), tenant configuration (per-hospital settings), and hospital-specific localization (a hospital's default language/timezone feeding Phase 3's locale defaults, Regional Configuration, and Date & Time sections)
- **Hospital Resources** — 🔒 blocked on backend Hospital Resource Management module (Section 1.4): **rooms**, **beds**, **operating rooms**, **equipment**, and **devices** as manageable, schedulable entities, with **availability** views feeding Phase 9's appointment/queue scheduling (a consultation room or an OR is a resource an appointment can be scoped to, the same way a doctor's availability window already is) — do not build this ahead of the backend module existing; scope only the UI shape now
- **White Labeling** — hospital branding: custom logo, custom color theme (built as a token-set swap on top of Phase 1's semantic color roles, not a component rewrite per hospital), custom domains (a hospital-specific subdomain or fully custom domain resolving to the same application with a different tenant context), and per-tenant theming applied consistently across every portal (Doctor, Patient, Admin)

**Key decisions & constraints:** multi-tenancy is a **data model and architecture decision**, not a frontend feature — this phase cannot start with frontend work alone. Flag this explicitly to product/architecture before scoping any UI, since it likely changes the shape of nearly every other module's data (patient/doctor records scoped per tenant, etc.). Cross-Branch Doctors and Shared Patients specifically cannot be built correctly until tenant isolation is settled — both require the system to distinguish "legitimately shared across tenants the operator controls" from "leaked across tenants," which is exactly the failure mode tenant isolation exists to prevent. White Labeling *specifically* cannot be scoped further than "uses Phase 1's token system" until tenant isolation is architecturally settled — a custom domain resolving to the wrong tenant's data would be a severe security incident, not a cosmetic bug, so this phase's sequencing (after tenant isolation is real) is deliberate and must not be reordered for a demo. The Audit Timeline capability must exist before Phase 10's Consent Audit Trail or Phase 12's AI Audit Trail can be considered complete — those phases reference it rather than duplicating it, so do not let scheduling pressure cause either of them to build a one-off audit view instead.

---

### 3.21 Phase 20 — Feature Flags

**Priority:** P3 · **Status:** 🔒 Blocked · **Depends on:** Phase 6 · **Backend dependency:** `ConfigurationModule` documented, not confirmed implemented

**Scope (once unblocked):** a `useFeatureFlag()`-style hook (explicitly named as a gap in `docs/13-engineering-bootstrap.md`'s own final readiness review) wiring real backend flag state into conditional rendering, covering the rollout mechanics a real feature-flag system needs beyond a plain on/off switch: **kill switches** (an instant, operator-triggered full disable, distinct from a gradual rollout — must not depend on a deploy to take effect), **percentage rollouts**, **tenant-based flags** (scoped to a specific hospital once Phase 19's multi-tenant model exists), **user-based flags** (scoped to a specific account, e.g. internal dogfooding), and **environment-based flags** (dev/staging/production). All of this is UI/consumption scope only — the flag-evaluation logic and storage live in the backend's `ConfigurationModule`; the frontend never invents its own flag state.

**Implementation checklist:**
- 🚧 **Scaffolded** — `useFeatureFlag(key, defaultValue)` (`shared/lib/feature-flags.ts`) — returns `defaultValue` only, no network call, no persistence
- 📋 **Remaining** — kill switches, percentage rollouts, tenant-based flags, user-based flags, environment-based flags — all of the actual rollout mechanics
- 🔒 **Blocked** — real backend-driven flag state: `ConfigurationModule` not confirmed implemented

Feature flags are **scaffolded, not implemented.** The hook exists so a call site written today (`useFeatureFlag('new-thing', false)`) won't need to change shape later — only its function body will. It provides zero actual flagging capability right now.

---

### 3.22 Phase 21 — Real-time Platform (WebSockets / Presence)

**Priority:** P2 · **Status:** 📋 Planned · **Depends on:** Phase 2 · **Backend dependency:** none required for the transport layer itself; consuming features (Phase 14) are separately blocked

**Scope:** the underlying realtime connection/presence layer (online/offline/typing indicators, live queue updates) that Phases 13 and 14 both build on. Building this once, generically, avoids Phase 13 and Phase 14 each inventing their own transport.

---

### 3.23 Phase 22 — File Uploads & Media Viewer

**Priority:** P1 · **Status:** 📋 Planned · **Depends on:** Phase 2 · **Backend dependency:** `AssetModule` (built, real S3-backed upload-intent/confirm flow)

**Scope:** a reusable upload component (progress, validation, retry) against the real upload-intent/confirm lifecycle, and a media viewer (images/PDF at minimum; DICOM viewing is scoped to Phase 15 once Radiology exists).

---

### 3.24 Phase 23 — Offline / PWA

**Priority:** P3 · **Status:** 📋 Planned · **Depends on:** Phase 3 · **Backend dependency:** none

**Scope:** installable PWA manifest (respecting Phase 19's per-tenant branding once that exists), offline shell and offline caching strategy specifically for the no-network case, camera upload, QR scanner. Biometric login depends on Phase 4 existing first.

**Offline data handling** — the mechanics of surviving a real no-network interval, not just an installable shell:
- **Offline queue** — actions taken with no connectivity (e.g. a nurse recording a vital) queued locally rather than failing outright
- **Sync queue** — the queued actions replayed against the real API once connectivity returns, in the order they were made
- **Retry strategy** — bounded, backed-off retries for a queued action that fails on replay, with a visible failure state rather than a silent infinite retry
- **Conflict resolution** — what happens when a queued, offline-made change conflicts with a server-side change made in the meantime; for anything clinically significant, the safe default is to surface the conflict to the user rather than silently picking a winner — this is not a place to apply a generic "last write wins" rule, since a clinical record is exactly the kind of data Section 1 forbids client-side authority over

**Key decisions & constraints:** owns the installable, offline-first shell and what renders with zero connectivity — Phase 27 owns runtime/data caching for the online experience. See Phase 27's note; the boundary is deliberate, not accidental overlap. Offline queueing must never be used as a way to let clinically significant writes (a clinical note, a prescription) bypass the backend's own validation and safety gates (e.g. Phase 11's signing gate) — those actions either replay through the exact same validated code path once online, or are excluded from offline queueing entirely, whichever the backend can actually guarantee; do not weaken a safety gate for the sake of offline convenience.

---

### 3.25 Phase 24 — Dark Mode

**Priority:** P2 · **Status:** 🚧 In Progress (pulled forward — see note) · **Depends on:** Phase 1 · **Backend dependency:** none

**Scope:** the actual light/dark toggle and persistence, built on Phase 1's token layer.

**Implementation checklist:**
- ✅ **Implemented** — `ThemeProvider`/`useTheme()` (`shared/providers/theme-provider.tsx`) — reads/writes `localStorage`, applies the `data-theme` attribute
- ✅ **Implemented** — `ThemeScript` — blocking inline script in `<head>` that applies the stored preference before first paint (no flash of the wrong theme)
- 📋 **Remaining** — a visible toggle *control* in the UI (a settings page, a header button) — nothing calls `setTheme()` from a real page yet, since no such page exists

Theme Provider is **implemented**, not just scaffolded — it is fully functional and would work correctly the moment any page calls `setTheme()`. What's missing is purely the UI affordance to trigger it, not the underlying mechanism.

**Priority-change note (per Section 0's rule — not a silent reorder):** the toggle mechanism itself shipped as part of Phase 2, ahead of this phase's original sequencing, because Phase 2's own scope ("Configure theme architecture") needed a `ThemeProvider` and it was cheap to build the whole mechanism rather than half of it. `shared/providers/theme-provider.tsx` provides `ThemeProvider`/`useTheme()`/`ThemeScript` (a blocking inline script in `<head>` that applies the stored preference before first paint, avoiding a flash of the wrong theme) and persists to `localStorage`. What's still missing, and still this phase's actual remaining scope: a visible toggle *control* in the UI (a settings page, a header button) — the mechanism exists, nothing calls `setTheme()` from a real page yet.

---

### 3.26 Phase 25 — Accessibility Hardening (WCAG 2.2 AA)

**Priority:** P1, continuous · **Status:** 📋 Planned · **Depends on:** Phase 1

**Target conformance level: WCAG 2.2 AA**, named explicitly rather than left as "accessible-ish" — a healthcare product serves users (patients especially) who disproportionately rely on assistive technology, and an unnamed target tends to quietly become no target.

**Scope:**
- Keyboard navigation (including RTL-correct tab order, per Phase 3)
- Screen readers (localized `aria-label`s and semantics, per Phase 3)
- High contrast mode
- Font scaling (the UI must not break at 200% browser zoom or OS-level large-text settings)
- Reduced motion (respecting `prefers-reduced-motion`, consuming Phase 1's motion system rather than each feature deciding independently)
- Focus management (especially for modals, toasts, and the multi-step flows Phases 9/11 introduce — focus must move predictably, not get lost)
- WCAG-conformant color contrast, validated per Phase 1's design tokens at the token level (so a compliant palette can't be broken by a one-off inline color in feature code)
- Voice navigation (structural support for voice-control assistive tools via correct semantic HTML/ARIA roles — not a bespoke in-app voice-command feature, which would be a separate product decision, not an accessibility baseline)
- Large text mode (in addition to the browser/OS-level font scaling above, an in-app text-size preference for users who need it without relying on OS settings)
- Dyslexia support (a dyslexia-friendly font option and adequate line-spacing/letter-spacing controls, consuming Phase 1's typography tokens rather than a one-off override)
- Keyboard shortcuts (a documented, consistent shortcut set for power users — clinical staff moving fast through repetitive tasks — that never conflicts with the keyboard navigation baseline above, and is fully discoverable, not hidden tribal knowledge)

**Key decisions & constraints:** treated as a continuous quality bar re-verified every phase, not a one-time pass at the end — a component that ships accessible in Phase 1 and regresses in Phase 10 is still a regression, and this phase's ongoing job is catching that.

---

### 3.27 Phase 26 — Testing Strategy

**Priority:** P0, continuous · **Status:** 🚧 In Progress · **Depends on:** Phase 0

**Implementation checklist:**
- ✅ **Implemented** — Vitest + React Testing Library, 22 tests passing across a representative component/logic set (Phase 1 + Phase 2)
- ✅ **Implemented** — Storybook (see Phase 1), a story per component
- ✅ **Implemented** — MSW (Mock Service Worker) — browser worker (opt-in) and Node `setupServer` (`src/mocks/server.ts`); no test uses it yet, it exists as infrastructure a feature test can opt into
- 📋 **Remaining** — OpenAPI contract tests (Phase 2's own open item)
- 📋 **Remaining** — Playwright (or equivalent) end-to-end tests for clinical-consequence paths — no such paths exist yet to test
- 📋 **Remaining** — visual regression testing, bundle analyzer, component documentation beyond what Storybook already provides

**Scope:** unit tests for pure logic, component tests for the design system, integration tests for the API layer (including the OpenAPI contract tests called out in Phase 2), and end-to-end tests for the critical clinical-consequence paths specifically (booking, consultation start, prescription signing) — mirroring the backend's own risk-based coverage philosophy (`docs/13-engineering-bootstrap.md`: higher bar for Clinical/Trust-adjacent code, standard bar elsewhere).

**Developer experience tooling** — the concrete tools this phase's tests and Phase 1's component library are built and verified with:
- **Storybook** (or equivalent) — the "documented set of primitives" Phase 1's Definition of Done already calls for; named explicitly here as the tool, with per-component states/locales/themes as stories
- **MSW (Mock Service Worker) / API mocking** — mocks the Phase 2 API layer at the network boundary for component and integration tests, so tests exercise real request/response handling code without hitting a live backend
- **Playwright** (or equivalent) — the end-to-end test runner for the critical clinical-consequence paths named above
- **Visual regression testing** — screenshot-diffing Storybook stories (or key pages) per locale/direction/theme combination, catching the "shipped accessible in Phase 1, regressed in Phase 10" scenario Phase 25 already warns about
- **Bundle analyzer** — visibility into what Phase 27's bundle-size budgets are actually being spent on, run in CI so a budget regression is caught at PR time, not after deploy
- **Component documentation** — usage guidance attached to each Storybook entry (props, do/don't examples, accessibility notes), so the component library is self-service rather than requiring the original author to explain it

---

### 3.28 Phase 27 — Performance Optimization

**Priority:** P2, continuous · **Status:** 📋 Planned · **Depends on:** Phase 6

**Scope:**
- **Rendering & data strategy** — Streaming, Partial Prerendering (PPR), React Server Components as the default (Client Components only where interactivity genuinely requires them), Server Actions for mutations where they reduce round-trip complexity over the API-layer pattern from Phase 2 (evaluate case by case — Server Actions must still funnel through the same contract-tested API layer, not bypass it)
- **Asset delivery** — image optimization (`next/image`, with Phase 19's per-tenant logos and Phase 22's uploaded media in mind), route-level code splitting, lazy loading of below-the-fold and rarely-used feature code
- **Data-heavy views** — virtualization for long lists/tables (Phase 1's data-table primitive must support this natively, not bolt it on per feature — relevant the moment Phase 10's medical timeline or Phase 7's patient lists grow past a trivial size)
- **Caching strategy** — HTTP/CDN caching for cacheable reads, client-side data caching for the Phase 2 API layer, with explicit invalidation rules for anything clinically time-sensitive (an appointment slot or a suggestion's acknowledgment state must never be served stale from a cache the way a doctor's public profile safely can be)
- **Bundle size budgets** and **Core Web Vitals monitoring** (feeds Phase 30's observability)

**Key decisions & constraints:** "Offline caching" is deliberately *not* owned here — it belongs to Phase 23 (PWA), which owns the installable, offline-first shell. This phase owns runtime and data-caching performance for the online experience; Phase 23 owns what happens when there's no network at all. Keep that boundary explicit so the two don't duplicate (or contradict) each other's caching rules.

---

### 3.29 Phase 28 — SEO

**Priority:** P3 · **Status:** 🚧 In Progress (infrastructure only) · **Depends on:** Phase 6

**Scope:** relevant only for the public-facing surfaces (marketing/landing, public doctor search once it exists) — the authenticated portal itself has no SEO surface.

**Implementation checklist:**
- ✅ **Implemented** — `buildPageMetadata()` helper (`shared/lib/seo.ts`) — canonical URLs, hreflang (`alternates.languages`) across both locales, Open Graph fields, from a page's locale/path/title/description
- 📋 **Remaining** — any real public-facing page for this helper to matter in practice — used today only by the locale root layout's placeholder metadata; sitemap, structured data, and localized Open Graph images are all untouched

The SEO *helper* is implemented; SEO as a *capability* is not, since there is no public page yet for it to apply to.

---

### 3.30 Phase 29 — Security Hardening

**Priority:** P0, continuous · **Status:** 📋 Planned · **Depends on:** Phase 4

**Scope:** CSP headers, XSS/CSRF posture appropriate to the eventual token-based auth model (`docs/13-engineering-bootstrap.md` Section 13's CSRF reasoning), dependency auditing, secrets hygiene (never a real secret in a committed `.env*` file, mirroring the backend's own enforced convention).

---

### 3.31 Phase 30 — Monitoring & Observability

**Priority:** P1 · **Status:** 🚧 In Progress (stub only) · **Depends on:** Phase 6

**Implementation checklist:**
- 🚧 **Scaffolded** — `trackEvent()` (`shared/lib/analytics.ts`) — logs to the console in development, a genuine no-op in production; no vendor, no real event pipeline
- 📋 **Remaining** — error monitoring (Sentry-shaped provider, vendor undecided), session replay (PHI-masking-by-default required before this can ship), Core Web Vitals reporting, correlation-ID propagation from the backend's request-ID scheme, structured/PHI-scrubbed frontend logs — this phase's entire real scope

Analytics is **scaffolded, not implemented.** `trackEvent()` gives every future feature a stable call site; it does not send data anywhere today.

**Scope:** structured client-side error tracking with correlation-ID linkage to the backend's existing request-ID scheme (`shared/correlation/correlation-context.ts` on the backend already generates one per request — the frontend should propagate/display it, not invent a parallel ID scheme), Core Web Vitals reporting, PHI-scrubbing on any error payload before it leaves the client (mirrors the backend's own stated error-tracking requirement in `docs/13-engineering-bootstrap.md` Section 12).

Concretely, this phase covers: **error monitoring** via a Sentry-shaped provider (vendor undecided — Section 1.2 — scope the integration behind an abstraction so swapping the actual SDK later is a config change, not a rewrite); **session replay**, scoped carefully given PHI exposure risk — any session-replay tool must support masking clinical data fields by default, not opt-in, since a healthcare product cannot afford a replay tool that silently records a patient's data; **user journey tracking** (funnel/flow analytics on the product usage itself, distinct from Phase 17's clinical/operational analytics); **correlation IDs**, propagated exactly as described above; **frontend logs** (structured client-side logging, PHI-scrubbed before leaving the client, same posture as error payloads).

**Key decisions & constraints:** PHI-scrubbing is not optional or "nice to have" for any of the above — session replay and error tracking are the two highest-risk surfaces in this entire document for accidentally exfiltrating clinical data to a third-party vendor, and both must be scoped with masking-by-default, reviewed against the vendor's actual data-handling terms once one is chosen (Section 1.2), before either ships to production.

---

### 3.32 Phase 31 — Deployment & CI/CD Maturity

**Priority:** P1 · **Status:** 🚧 In Progress · **Depends on:** Phase 0

**Shipped:** Vercel deployment, connected to the Render backend, with a documented root-directory/build-command configuration for the monorepo.

**Planned:** a dedicated frontend CI workflow (lint/typecheck/build as hard gates, mirroring `backend-ci.yml`'s structure), preview deployments per pull request, and — once Phase 26 exists — test execution as a gate too.

---

### 3.33 Phase 32 — Future Mobile App Preparation

**Priority:** P3 · **Status:** 📋 Planned · **Depends on:** Phase 2, Phase 22

**Scope:** ensuring the API client (Phase 2) and design tokens (Phase 1) are structured so a future React Native (or equivalent) client can reuse the contract layer and token definitions rather than starting over — matches `docs/13-engineering-bootstrap.md`'s `packages/api-sdk` vision, not yet extracted into its own package but architected so extraction later is a move, not a rewrite.

---

## 4. Cross-Cutting UX Inventory (referenced across phases, not a separate phase)

These are building blocks, primarily delivered in Phase 1, consumed everywhere:

Skeletons · Empty states · Error pages · Success states · Toasts · Reusable components · Component library · Design tokens · Responsive layouts · Motion guidelines · Grid system · Icon guidelines · Illustration system · Avatar system · Charts system · Loading patterns

Also referenced across phases, delivered by a specific phase but consumed by others rather than duplicated: the Clinical Workflow document lifecycle (Draft → Review → Approved → Signed → Locked → Archived, Phase 10, consumed by Phases 11 and 15) and the Audit Timeline capability (Phase 19, consumed by Phase 10's Consent Audit Trail and Phase 12's AI Audit Trail).

## 5. Engineering Governance & Process Standards

Unlike Section 3's phases, these are process standards, not features — they have no backend dependency and no "done" state; they apply continuously, the same way Phase 25 (Accessibility) and Phase 29 (Security Hardening) are marked continuous. They exist here, at the document level, because they govern *how* every phase above gets built and shipped, not what gets built.

- **Coding standards** — the frontend equivalent of the backend's enforced strictness bar (TypeScript strict mode, ESLint flat config, per Phase 0); documented conventions for the patterns Section 1.6 names (feature-based structure, naming, dependency direction) so they're enforceable in review, not just aspirational.
- **Pull request checklist** — a minimum bar before a PR is opened: type-checks, lints, relevant tests pass locally, no secrets committed (mirrors the backend's own enforced convention referenced in Phase 29).
- **Code review checklist** — what a reviewer specifically verifies beyond "does it work": module-boundary adherence (Section 1.6), accessibility regressions (Phase 25's continuous bar), i18n correctness (a new string actually goes through `next-intl`, not a hardcoded literal), and — for anything touching a Clinical Workflow state (Phase 10) — that the UI never implies a stronger guarantee than the backend enforces.
- **Definition of Ready** — before a phase or feature within a phase starts: its Backend Dependency (per Section 3's per-phase field) is verified against actual current backend state, not assumed from this document alone (this document can go stale — see Section 0's own warning); its design (Phase 1 primitives) exists or is explicitly scoped as new.
- **Definition of Done** — beyond each phase's own stated Definition of Done: accessibility verified (Phase 25), both locales/directions verified (Phase 3), tests written per Phase 26's risk-based bar, and the Change Log (Section 6) updated.
- **Release checklist** — build/typecheck/lint gates pass (Phase 31's CI), a preview deployment has been manually verified for the specific change (per this document's own repeated "verify against the live app before claiming done" discipline), and any newly-completed phase has its status updated in Section 3's master table per Section 0's rules.
- **Breaking change policy** — a breaking change to a shared primitive (Phase 1's component library, Phase 2's API layer, Phase 6's app shell) requires identifying every consuming feature module before merging, consistent with Section 1.6's dependency-direction rule (shared code has many dependents; breaking it is expensive by construction, so the process must treat it that way).
- **Deprecation policy** — a deprecated component/hook/pattern is marked as such (with a documented replacement) and tracked until every consumer has migrated, rather than removed the moment a replacement exists — mirrors Section 0's "do not delete history" principle applied to code, not just this document.

## 6. Change Log

| Date | Change |
|---|---|
| 2026-07-13 | Initial version. Formalizes `docs/roadmaps/orivex-master-roadmap.md` into this structured, dependency-and-priority-ordered specification. Phase 0 marked complete based on the actual current state of `apps/frontend` at the time of writing. |
| 2026-07-13 | Expanded Phase 3 into a full Internationalization (i18n) & Localization specification (languages, RTL/LTR, `next-intl` + App Router architecture decision, Medical Localization flagged 🔒 pending Reference Data, date/time, numbers/currency, i18n-specific accessibility, search/SEO/notifications/AI cross-references, testing). Added the i18n architecture decision to Section 1.1 and a retrofit-debt note to Phase 0. Expanded Phase 1 (Design System) with typography/color-system/spacing/icons/motion-system/charts/data-tables/form-components detail and absorbed Responsive Design into it. Expanded Phase 19 to explicitly include White Labeling and Multi-Hospital Support (hospital switching, tenant isolation, custom domains/branding). Expanded Phase 25 to a named WCAG 2.2 AA target with its full sub-scope. Expanded Phase 27 with Streaming/PPR/Server Actions/RSC/virtualization/caching-strategy detail and clarified its caching boundary against Phase 23. |
| 2026-07-13 | Enterprise-quality pass: added Section 1.6 (Frontend Internal Architecture Conventions) and Section 5 (Engineering Governance & Process Standards); flagged Consent Management, Hospital Resource Management, Queue Management, and a general-purpose Audit/Change-History module as missing backend capabilities in Section 1.4. Expanded Phase 1 with grid system, icon guidelines, illustration system, avatar system, a named charts system, and loading patterns. Expanded Phase 3 with Regional & Country Configuration (country profiles, locale-specific validation, phone/address formatting, timezone profiles). Expanded Phase 9 with Queue Management (waiting/doctor queue, token system, estimated wait time, queue dashboard), 🔒 blocked on a new Queue module. Expanded Phase 10 with Patient Journey Timeline (cross-module, distinct from the clinical-only Medical Timeline), Consent Management (🔒 blocked on a new Consent module), and the shared Clinical Workflow document lifecycle (Draft → Review → Approved → Signed → Locked → Archived), consumed by Phases 11 and 15. Expanded Phase 12 with an AI Governance sub-scope (confidence scores, explainability, prompt/model versioning, human approval, feedback loop, AI audit trail), verified consistent with ADR-002. Expanded Phase 14 with Internal Communication (Doctor↔Nurse/Reception/Admin, announcements), explicitly separated from telemedicine and general chat. Expanded Phase 18 with saved filters, recent searches, smart search, and AI-assisted search. Expanded Phase 19 with an Audit Timeline capability, Multi-Hospital Operations (branch/clinic/department management, cross-branch doctors, shared patients, referral between clinics), and Hospital Resources (rooms, beds, ORs, equipment, devices), 🔒 blocked on a new Hospital Resource Management module. Expanded Phase 20 with rollout mechanics (kill switches, percentage/tenant/user/environment-based flags). Expanded Phase 23 with offline queue/sync-queue/retry-strategy/conflict-resolution mechanics. Expanded Phase 25 with voice navigation, large text mode, dyslexia support, and keyboard shortcuts. Expanded Phase 26 with Developer Experience tooling (Storybook, MSW, Playwright, visual regression, bundle analyzer, component documentation). Expanded Phase 30 with named observability tooling (Sentry-shaped error tracking — vendor undecided, added to Section 1.2 — session replay with mandatory PHI masking, user journey tracking). Updated the master sequencing table's Phase 9/10/19 titles and backend-status notes accordingly. No existing scope, priority, or status was removed or reordered. |
| 2026-07-13 | Began Phase 1 implementation (status moved 📋 → 🚧 In Progress; not yet ✅, per the phase's own updated Definition of Done note). Shipped: design tokens (color/typography/spacing/radius/shadow/opacity/motion/z-index/breakpoints) wired into Tailwind v4's `@theme`; a light/dark token layer (Phase 24 still owns the actual toggle); typography, responsive, and icon primitives; the full base/overlay/navigation/state/layout/form component set on Radix UI + cva/clsx/tailwind-merge; the shared form system (React Hook Form + Zod + Radix Label); Storybook (switched from `@storybook/nextjs`'s webpack builder to the Vite-based `@storybook/experimental-nextjs-vite` after the former hit a structural, unfixable conflict with Next.js's internally-vendored webpack copy) with a story per component; and Vitest + React Testing Library with tests for a representative component subset. All of typecheck/lint/test/production-build/Storybook-build verified passing. Explicitly not yet done and tracked in the phase's own section: a charts system (no chart library chosen yet), date/time and file pickers, live table sort/filter, `packages/ui` extraction, and human/screenshot visual verification (no browser available this session). |
| 2026-07-13 | Fixed a production regression from the previous entry: pinning Next.js to 15.1.8 to work around the Storybook/webpack conflict caused Vercel to reject deployments outright (`"Vulnerable version of Next.js detected"` — confirmed via the actual Vercel build log, not guessed). Restored Next.js to the latest, non-vulnerable 15.5.20. That, in turn, broke `@storybook/experimental-nextjs-vite` the same structural way as the webpack framework before it — its bundled `vite-plugin-storybook-nextjs` dependency reaches into a specific internal Next.js file path that isn't a public API and moved between Next 15.1.x and 15.5.x. Concluded both of Storybook 8.x's Next.js-specific integrations are incompatible with current Next.js and switched to the plain, Next-agnostic `@storybook/react-vite` framework instead (verified none of our components import `next/image`/`next/font`/`next/navigation`/`next/link`, so no Next-specific shims are needed). Removed the now-pointless root `pnpm.overrides` webpack pin added during the earlier, incorrect diagnosis. Re-verified typecheck/lint/test/`next build`/`build-storybook` all green on Next.js 15.5.20. |
| 2026-07-13 | Began Phase 2 implementation (status moved 📋 → 🚧 In Progress; not yet ✅ — see Phase 2's own updated Definition of Done note). Restructured `app/` under `app/[locale]/` with `next-intl` middleware, English/Arabic message files, and `dir="rtl"|"ltr"` switching on `<html>` (Phase 3's architecture decision, now real, not just decided — Phase 0's retrofit-debt note is resolved). Shipped: TanStack Query (one `QueryClient` per app instance, conservative defaults, global error→toast wiring); an imperative toast system on top of Phase 1's Radix `Toast` primitive (`shared/ui/use-toast.ts`, callable outside React); `shared/lib/api/` (relocated `apiFetch` from Phase 0's `src/lib/`, a query-key factory convention, a single `toUserMessage`/`reportQueryError` error-handling convention, an auth-header injection point that's a documented no-op today); environment validation upgraded to a lazily-evaluated Zod schema; MSW wired for both browser (opt-in) and Node (test) mocking; Next.js App Router special files for error handling (`error.tsx`, `global-error.tsx`) and route-level loading (`loading.tsx`); a theme architecture (`ThemeProvider`/`useTheme`/`ThemeScript`, pulled forward from Phase 24 — see that phase's own priority-change note) with `localStorage` persistence and a no-flash inline script; an SEO metadata helper (`buildPageMetadata`, hreflang + canonical + Open Graph); an analytics stub (`trackEvent`, console-only, vendor undecided); a feature-flags stub (`useFeatureFlag`, local-default-only). Auth/RBAC architecture (`shared/auth/`: types, `AuthProvider`, `RequireAuth`, `RequireRole`) was built as explicitly-unwired scaffolding, per Phase 4/5's own binding "no fake auth" rule — every session it produces today is genuinely unauthenticated, consistent with those phases remaining 🔒 Blocked. All of typecheck/lint/22 Vitest tests/production-build/Storybook-build verified passing; the production build's `dynamic = 'force-dynamic'` behavior was empirically re-verified against a running `next start` instance (not just trusted from the build's status symbols) after the new `generateStaticParams`-driven `●` marker looked concerning at first glance. Explicitly not yet done and tracked in Phase 2's own section: OpenAPI contract tests (named in Phase 2's original Definition of Done, still the single most important open item), and this document's own listed items 16 (feature flags — stub only) and 19 (SEO — infrastructure only, no real public page consumes it yet). |
| 2026-07-14 | Added an explicit per-item "Implementation checklist" (✅ Implemented / 🚧 Scaffolded / 📋 Remaining / 🔒 Blocked / 🧊 Deferred) to Phases 2, 3, 4, 5, 20, 24, 26, 28, and 30, alongside their existing prose — precise about what is genuinely working code versus honest-but-inert scaffolding versus not built at all, since the previous entry's prose summaries risked reading as more complete than they are. No status changed as a result of this pass (all were already accurate); this only makes the same facts checkable at a glance, per item, rather than requiring a full paragraph read. Confirmed no scope/priority/status was silently altered. |
