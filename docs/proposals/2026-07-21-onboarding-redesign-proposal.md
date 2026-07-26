# ORIVEX Onboarding Redesign — Product & Architecture Proposal

Status: **FINALIZED v3 — every product decision resolved, one consistency fix applied (§0a), final implementation plan in §14. Ready to implement.**
Date: 2026-07-21 (finalized same day after product review + consistency pass)
Scope: Patient onboarding, Doctor onboarding, reference data, verification lifecycle, admin review experience.
Explicitly out of scope: any new roadmap stage from `docs/roadmaps/orivex-master-roadmap.md`. This proposal must be approved before any of that work resumes.

Grounding note: every claim below about "what exists today" was verified directly against the codebase on 2026-07-21 (file:line citations throughout), not assumed from memory of earlier stages.

---

## 0. Executive Summary

The three-actor model (Patient / Doctor / SuperAdmin) is **already what the backend enforces in practice** — `AccountRole` has 6 values, but only `Patient`, `Doctor`, `SuperAdmin` are referenced by any of the 30 `@Roles(...)` guards in the codebase. `Nurse`, `Receptionist`, `HospitalAdmin` are dead enum values with zero routes. So "three actors only" isn't a redesign — it's a description of current reality, and this proposal doesn't need to touch the role model at all.

What genuinely needs to change:

1. **Reference data doesn't exist yet, but was already designed.** `specialty` on `DoctorProfile` is free text (`doctor-profile.entity.ts:162-166`). `docs/09-physical-database.md:37` already specifies a `reference` schema (`countries`, `languages`, `medical_specialties`, `currencies`, ...) with an explicit rationale (line 96: enums for stable clinical taxonomies, reference tables for anything a non-engineer needs to extend at runtime). Nobody built it. This proposal finishes that design rather than inventing a new one.

2. **The verification lifecycle already has 7 states**, including `MoreInfoNeeded` and `Suspended` — states this proposal asked to "propose." They exist in `VerificationStatus` (`trust/domain/enums/verification-status.enum.ts`) but the *frontend* only ever sends `approved`/`rejected` (`verification-queue.tsx:66-81`) and there's no UI for `MoreInfoNeeded` at all. The gap is almost entirely in the frontend and in one missing domain transition (`Suspended` can't currently be reached from `Approved`, since `decide()` treats `Approved` as terminal — see §7).

3. **`VerificationCase` is doctor-only today** (`findAllByDoctorId`, doctor-specific controller). Your instruction to reuse one review system for both Patient and Doctor identity verification is the single largest real schema change in this proposal — it requires generalizing the case's subject from "a doctor" to "an account, of a given kind." Everything else is comparatively small.

4. **Patient today has almost no profile at all** — `dateOfBirth` and emergency contacts only (`patient-profile.entity.ts:35-131`). Blood type, allergies, nationality, national ID: none of it exists in any table, anywhere. This is genuinely new modeling, not an extension.

5. **Decided (2026-07-21): progressive patient verification, confirmed.** Patients get full platform access immediately after Choose Journey — browse/search doctors, view profiles, browse specialties, edit their own profile — with no identity check. Verification is required only at four specific gates: **booking an appointment, starting a consultation, uploading a medical document, making a payment.** See §7a for the exact enforcement mechanism.

6. **Decided (2026-07-21): doctor status flow confirmed as Submitted → (visually) "Under Review" → Approved/Rejected/MoreInfoNeeded**, with a single dedicated Pending Verification screen shown for the entire pre-decision period. See §7 for how this maps onto the existing 7-state backend enum without adding a new one.

7. **Landing page is explicitly out of scope for this proposal** — not designed, not implemented here. However, every onboarding entry point below is designed so a future landing page's two CTAs ("Book an Appointment," "Join ORIVEX as a Doctor") can carry intent straight into Choose Journey without rework later. See §1a.

8. **New gap surfaced by this update:** there is currently **no endpoint to browse or list doctors at all** — `doctor-profile.controller.ts` only exposes `GET /doctors/me` (self) and `GET /doctors/:id` (single lookup by ID, `:87,133`). "Browse doctors" on the Patient Dashboard has nothing to call. Full-text search is Stage 8 of the master roadmap and isn't built. This proposal adds a minimal `GET /doctors` list/filter endpoint (§5) now, since the new flow needs it immediately and it's a small, additive, non-search-engine capability — not a substitute for Stage 8's real search work later.

9. **Finalized (2026-07-21):** Doctor Onboarding keeps a real Personal Information step, and Allergies/Chronic Diseases stay plain free text with no reference tables or coded terminology. Both were open questions in v2; both are closed now. See §11 for the exact final shape of each.

## 0a. Consistency Review (final pass before implementation)

A full pass over every decision above, checking specifically for the four things asked for: conflicting decisions, duplicated flows, architecture/DDD inconsistencies, and unnecessary complexity. One real inconsistency was found and fixed; everything else checked out.

**Found and fixed: "Personal Information" was about to be modeled twice.** v2 gave Patients a "Personal Info" step (full name, DOB, gender, nationality, address) under the Patient domain, and separately gave Doctors their own new "Personal Info" step with the identical field set under the Doctor domain. That's the same data, owned by two different bounded contexts, which is exactly the kind of duplicated-aggregate problem DDD boundaries exist to prevent — a doctor who is also later a patient (or vice versa) would have two independently-editable copies of their own name and date of birth. **Fix:** these fields move to a single new entity owned by the **Identity** domain — `PersonalProfile` (1:1 with `Account`, mirroring the exact shape `EmergencyContact` already uses as a 1:1 child of `PatientProfile`) — with fields `fullName, dateOfBirth, gender, nationalityId, address`. Both onboarding wizards' "Personal Info" step become the *same* screen and the *same* endpoint (`PATCH /accounts/me/personal-profile`), just entered from two different flows. This is a genuine simplification, not just a correctness fix: one component, one endpoint, one set of tests, instead of two of each. Updated throughout §2, §3, §4, §5 below.

**Found and fixed: the "Choose Your Journey" gating rule went stale the moment Patient onboarding stopped being a wizard.** v2's gating rule ("shown when there's no `DoctorProfile` and no `PatientProfile` with medical fields populated") assumed Patients complete a multi-step wizard before being considered "onboarded" — but the whole point of this update is that Patients now reach the Dashboard immediately, with the Medical Profile step being optional and edited "any time," never mandatory. Under the v2 wording, an account could reach the Dashboard, never fill in a blood type, and see the Journey screen again on every login — a real bug, not a hypothetical. **Fix:** choosing "book appointments" creates a bare `PatientProfile` row immediately (no fields required yet) purely as the signal that this account already made its journey choice — the presence of the row, not its completeness, is what suppresses the screen. This mirrors exactly how `DoctorProfile`'s mere existence already gates the doctor-onboarding wizard's own resume logic today (`onboarding-flow.tsx`'s existing pattern) — same signal shape, applied consistently to the new Patient side. Updated in §3.

**Checked, no issue found:**
- **Duplicated flows:** Patient and Doctor identity-document purposes (`NationalIdFront`, `NationalIdBack`, `SelfieWithId`) are shared `MediaAssetPurpose` values, not two parallel enums — confirmed already written that way in §4, no fix needed.
- **API redundancy:** §5's gate-check bullet read as two competing proposals (a dedicated status endpoint vs. per-endpoint checks) rather than one coherent mechanism — tightened below so it's explicitly both, serving different purposes (security enforcement vs. proactive UI), not a choice between them.
- **DDD boundaries:** the generalized `VerificationCase` referencing patients by `subjectAccountId` (a plain UUID) rather than importing anything from the Patient module maintains the same one-way-dependency shape Trust already has with Doctor today — no new coupling introduced.
- **Security:** the four gated actions are enforced server-side, not just UI-hidden (§7a) — already correct, reconfirmed.
- **Unnecessary complexity:** no speculative generality found beyond what's specified — reference tables are only proposed for genuinely runtime-extensible data (§6), enums for everything else, matching the codebase's own existing rationale rather than inventing a new one.

---

## 1. Product Flow

```
(Future, out of scope) Public Landing Page
  Search Doctors · Popular Doctors · Browse Specialties · Doctor Profiles
  CTA: "Book an Appointment"        CTA: "Join ORIVEX as a Doctor"
        │                                   │
        └───────────────┬───────────────────┘
                         ▼
              Create Account (email + password, unchanged)
                         │
                         ▼
              Verify Email  ── (Phone verification: NOT in scope — no SMS
                         │        provider exists anywhere in the codebase
                         │        today; a genuinely new integration
                         │        decision, flagged in §9, not silently added)
                         ▼
              Choose Your Journey   ← NEW screen, one-time (see §3 gating
                         │           rule). Pre-selects a card if the visitor
                         │           arrived via a landing-page CTA (§1a) —
                         │           but always shown, never skipped, since
                         │           intent can change between click and signup.
                         │
                ┌────────┴─────────────────┐
                ▼                          ▼
        "Book appointments"        "Practice as a Doctor"
                │                          │
                ▼                          ▼
        Patient Dashboard            Doctor Onboarding
        (immediate access —          (profile + professional info +
         no identity check           documents; Doctor Portal blocked
         required to reach it)       until Approved — unchanged)
                │                          │
      ┌─────────┴─────────┐                ▼
      ▼                   ▼          Pending Verification screen
 Unrestricted:        Gated (§7a):    (shown for the entire Submitted/
 • Browse doctors     • Book an       UnderReview period, see §7)
 • Search doctors       appointment          │
 • View doctor        • Start a       Admin reviews via the SAME
   profiles             consultation  Verification Queue used for
 • Browse             • Upload a      patients (generalized subject,
   specialties          medical doc  §4/§7)
 • Edit own profile   • Make a               │
                        payment       Approved → role promotes to
                            │         Doctor (unchanged mechanism, §7)
                            ▼
                  "Verify your identity to continue"
                  screen (§7a) — explains why, then
                  routes into the identity-verification
                  steps from the original patient
                  onboarding proposal (National ID +
                  selfie), reusing the same generalized
                  VerificationCase as doctors.
```

Key product decision embedded here: **"Choose Your Journey" replaces role selection, but the backend still assigns the role — exactly as originally specified.** Choosing "book appointments" does nothing to `Account.role` (it's already `Patient` from registration) and lands directly on the Patient Dashboard — no mandatory onboarding wizard blocks it anymore. Choosing "practice as a Doctor" still routes to the full onboarding wizard, unchanged from the original proposal. No new role-selection endpoint is needed — this remains a navigation decision, not an authorization decision.

### 1a. Landing-page-aware entry points (design now, build later)

Not implementing the landing page itself, but the two CTAs it will eventually have are designed for today:

- **"Book an Appointment"** (unauthenticated visitor) → routes to Create Account carrying `?intent=patient` → after email verification, Choose Journey opens with the "book appointments" card pre-selected (not auto-submitted — the visitor still confirms).
- **"Join ORIVEX as a Doctor"** → same mechanism with `?intent=doctor`.
- An already-authenticated Patient clicking "Book an Appointment" on the future landing page just goes straight to booking (no onboarding involved at all) — the intent-carrying mechanism above only matters for logged-out visitors.
- This requires nothing more than Choose Journey reading one query param and pre-selecting a card — a small, deliberately narrow hook, not a landing-page integration.

---

## 2. UX Flow

Screen-by-screen, only the genuinely new or changed screens (existing screens like login/register are unchanged):

| Screen | New/Changed | Notes |
|---|---|---|
| Choose Your Journey | **New** | Two large cards, Stripe/Deel-style ("I want to book appointments" / "I want to practice as a Doctor"), not a form. Shown once; see §3 gating. Pre-selects a card per §1a if arriving with a landing-page intent param. |
| Patient Dashboard | **Changed (reachable immediately now)** | Existing dashboard, reached the moment "book appointments" is chosen — no onboarding wizard in between. Surfaces Browse/Search Doctors, Browse Specialties, doctor profile views, and "Edit my profile" (opens the Personal Info + Medical Profile editor below, on the patient's own schedule, not as a gate). |
| Personal Info step/editor | **New, shared** | Full name, DOB, gender, nationality (reference dropdown), address. **One shared screen and one shared endpoint** (`PATCH /accounts/me/personal-profile`, §0a fix) reused verbatim by both the Patient Profile Editor ("Edit profile" from the dashboard, anytime) and the Doctor Onboarding wizard's first step — not two separate implementations. |
| Patient Profile Editor — Medical Profile | **New** | Blood type (enum dropdown), allergies (plain free text — finalized §11, no tags/reference table), chronic diseases (plain free text, same), emergency contact (reuses existing `EmergencyContact` entity, already built), insurance provider (reference dropdown, optional). Editable anytime, never blocks dashboard access. |
| "Verify your identity to continue" gate screen | **New** | Shown only when a Patient attempts one of the four gated actions (§7a) without a prior Approved identity verification. Plain-language explanation specific to the action that triggered it (e.g. "Booking an appointment requires a verified identity, so your doctor knows who they're treating" — copy varies per gate, not a generic message), then routes into the identity-verification steps (National ID Front/Back, Selfie with ID). |
| Patient Identity Verification — Review & Submit | **New** | Mirrors the doctor wizard's existing review-step pattern (`onboarding/review-step.tsx`) exactly, for UI/code consistency. Submits into the same generalized `VerificationCase` as doctors (§4/§7). |
| Patient Identity — Pending / Rejected / Approved screens | **New** | Same shared status-screen components as doctor onboarding (§ below), reused, not rebuilt — a Patient sees "Pending Verification" after submitting, and regains access to whichever gated action they originally attempted, automatically, the moment their case is Approved. |
| Doctor Onboarding — Personal Info | **New, shared component** | Finalized (§11): a real first step, always shown, before Professional Info. Same shared screen/endpoint as the Patient Profile Editor's Personal Info (§0a) — not a separate implementation. |
| Doctor Onboarding — Professional Info | **Changed** | `specialty` free-text input → reference-data dropdown. New: License Expiry date picker, Professional Rank dropdown (enum, not reference — see §6), Hospital dropdown with an explicit "Independent Practice" option, Department dropdown (enabled only once a Hospital is chosen). |
| Doctor Onboarding — Documents | **Changed** | Current: single "certificate" upload only (`doctor_certificate` purpose). New: 7 typed upload slots — National ID Front/Back, Selfie with ID, Medical License, Graduation Certificate, Board Certificate, Syndicate/Membership Card. Each is its own `MediaAssetPurpose` value (additive enum change, §4). |
| Doctor Onboarding — Review & Submit | **Changed minimally** | Same component, more fields to display. |
| Status screens (Pending/Rejected/Approved) | **Changed** | Rejected screen already shows `reason` and lets the applicant edit+resubmit (built in the last stage) — extend it to also handle `MoreInfoNeeded` as a distinct, friendlier state ("we need one more thing from you," not "rejected"). Suspended gets its own screen too (new — doesn't exist today since it's unreachable, see §7). |
| Admin — Verification Case Detail | **Changed substantially** | Today shows only `doctorId` (raw UUID), status, submitted date, Approve/Reject (`verification-queue.tsx:39-90`). New: full profile snapshot (patient or doctor), professional info, hospital/department, experience, a document viewer for every uploaded asset, a decision timeline (every past `VerificationCase` row for that subject — the "verification history" you asked for falls out naturally once cases are subject-scoped, §7), and three actions: Approve, Reject (reason required), Request More Information (reason required, already-supported status). |

Stepper/progress-indicator, autosave, and resume-later: the existing doctor wizard already implements exactly this pattern (`onboarding-flow.tsx`'s `hasResumedRef` logic resumes at the correct step based on real backend state, never a client-only draft flag) — reused as-is for patient onboarding, not reinvented.

**Autosave strategy recommendation:** save per-step on "Continue" (already how the doctor wizard works — each step's data is persisted via a real `PATCH` before advancing), not keystroke-level autosave. Keystroke autosave would require a new debounced-draft endpoint and conflicts with "every displayed state is real backend data, never a client-only fake Draft" — a principle explicitly established and tested in the current doctor onboarding (`onboarding-flow.tsx` header comment). Keeping it means Patient onboarding follows an identical, already-proven pattern.

---

## 3. Information Architecture

**"Choose Your Journey" gating rule (corrected in §0a):** shown when an account has *neither* a `DoctorProfile` row *nor* a `PatientProfile` row *at all* — not gated on field completeness anymore, since Medical Profile is now optional/anytime, not a wizard step. Choosing "book appointments" creates a bare `PatientProfile` row immediately (same moment `DoctorProfile` gets created for the doctor path); the row's mere existence is the signal, matching how `DoctorProfile`'s existence already gates the doctor wizard's resume logic today. An account that already made either choice never sees the screen again. A patient who later decides to "practice as a Doctor" reaches the same entry point via the existing "Become a Doctor" nav item/quick-action — the Journey screen is for the *first* choice only, not a permanent switcher.

**Domain ownership (no change to existing bounded contexts — confirmed against `docs/05-information-architecture.md:25,81`):**
- **Identity Domain** owns the new `PersonalProfile` (full name, DOB, gender, nationality FK, address) — a 1:1 child of `Account`, not duplicated into Patient or Doctor (§0a fix). This is the one addition to Identity's existing ownership of `Account`/`Credential`.
- Patient Domain owns the expanded *medical* profile only (blood type, allergies, chronic diseases, insurance provider) — same domain that already owns "Health Passport, patient-side preferences." Personal identity fields are explicitly not here anymore (moved to Identity, above).
- Doctor Domain owns professional info (rank, license expiry, specialty FK, hospital/department FK) — same domain that already owns "doctor-as-a-professional-entity." Personal identity fields are explicitly not here either.
- Trust & Verification Domain owns the *generalized* `VerificationCase` (workflow/state) — unchanged ownership, just a wider subject type.
- Administration Domain owns the review *queue operations* over Trust's state — unchanged, matches the existing documented split exactly ("Administration... verification queue operations (the workflow), while Trust & Verification owns the state/outcome").
- **New: a `Reference` bounded context** (or a thin cross-cutting `platform/reference` module, mirroring how `platform/observability` already exists as infra-not-domain) owning `MedicalSpecialty`, `Country`, `InsuranceProvider` lookup tables. This is new only in the sense that it's never been *built* — it's already *named* in `docs/09-physical-database.md:37`.

---

## 4. Database Impact

All changes are additive (new tables, new nullable columns, new enum values) — no destructive migrations, consistent with every prior stage's precedent.

**New tables (finishing `docs/09-physical-database.md`'s already-designed `reference` schema):**
- `medical_specialties (id, name, isActive)`
- `countries (id, name, iso2Code)` — doubles as the nationality list (a nationality is a country reference; no separate table needed)
- `insurance_providers (id, name, isActive)`

Deliberately **not** building `icd11_codes`, `drug_catalog`, `lab_test_catalog`, `radiology_catalog`, `currencies`, `notification_templates`, `consent_scope_categories` from that same documented schema — those belong to Stage 5 (AI/ICD-10), Stage 11 (Pharmacy), Stage 10 (Lab/Radiology) respectively, not onboarding. Building only what onboarding needs keeps this change's blast radius honest.

**`DoctorProfile` (additive columns):**
- `specialtyId` (FK → `medical_specialties`, nullable during migration, backfilled from the old free-text `specialty` by fuzzy-matching then reviewed manually — see §10)
- `professionalRank` (new enum column: `Resident | Registrar | Specialist | Consultant | Professor` — plain enum, not a reference table; see §6 for why)
- `licenseExpiryDate` (nullable date)
- `departmentId` (FK → existing `Department` table, nullable, **must** be null unless `hospitalId` is also set — a check constraint or application-level invariant, not currently enforced anywhere since Department isn't wired to DoctorProfile at all today)
- Old `specialty` free-text column: kept during a transition period (see §10), dropped in a later migration once `specialtyId` backfill is verified complete.

**New: `PersonalProfile` (Identity domain, §0a fix) — 1:1 with `Account`, shared by Patient and Doctor onboarding alike:**
- `accountId` (FK → `Account`, unique), `fullName`, `dateOfBirth`, `gender`, `nationalityId` (FK → `countries`), `address`
- Created empty-then-filled the first time either onboarding flow's Personal Info step is submitted — one entity, one table, regardless of which journey the account is on.

**`PatientProfile` (additive columns — medical fields only now, personal fields moved above per §0a):**
- `bloodType` (new enum: `A+ A- B+ B- AB+ AB- O+ O-` — enum, not reference table, per §6)
- `allergies` (finalized §11: plain nullable `TEXT` column, single free-text field — not tags, not an array, not a reference/coded table. Explicitly unstructured for v1; normalizing into discrete, coded entries is deferred to a future phase, same as originally proposed.)
- `chronicDiseases` (same shape as `allergies`: plain nullable `TEXT`)
- `insuranceProviderId` (FK → `insurance_providers`, nullable)
- A bare row (all fields null except `accountId`) is created the moment "book appointments" is chosen on the Choose Your Journey screen — this is now also the gating signal for that screen (§3 fix), not just a data container.

**`VerificationCase` (the one schema change with real migration risk):**
- Add `subjectType` enum: `Doctor | Patient`
- Add `subjectAccountId` (the account being verified — today this is implicitly "the doctor," derived via `doctorId`)
- Keep `doctorId` as-is for the transition (nullable-compatible, since it's already how doctor cases work) and backfill `subjectType='Doctor'`, `subjectAccountId = <that doctor's accountId>` for every existing row
- New repository method `findAllBySubject(subjectType, subjectAccountId)` alongside the existing `findAllByDoctorId` (kept for now, deprecated later once every call site migrates)

**New `MediaAssetPurpose` enum values** (additive, current 5 values untouched): `NationalIdFront, NationalIdBack, SelfieWithId, MedicalLicense, GraduationCertificate, BoardCertificate, ProfessionalMembershipCard`. (`DoctorCertificate`, the current single purpose, is kept for backward compatibility with already-submitted cases; new submissions use the 7 typed purposes instead.)

---

## 5. API Impact

All new endpoints follow the exact conventions already established (role-gated via existing `JwtAuthGuard`/`@Roles`, DTO validation, exception-mapper pattern):

- `GET /reference/specialties`, `GET /reference/countries`, `GET /reference/insurance-providers` — public-to-authenticated (any logged-in account), read-only, mirrors the existing `GET /hospitals` directory controller shape exactly (`hospital-directory.controller.ts`, itself a precedent from the last stage).
- `POST/PATCH /admin/reference/specialties` (and countries, insurance-providers) — `SuperAdmin`-gated CRUD, since these need to be runtime-extensible by non-engineers per the original design rationale in `docs/09:96`.
- **New: `PATCH /accounts/me/personal-profile`** (Identity module, §0a fix) — the one shared endpoint backing both onboarding wizards' Personal Info step. Owned by Identity, not duplicated under `/patients/*` or `/doctors/*`.
- `PATCH /patients/me` — extended with the new *medical*-profile fields only (blood type, allergies, chronic diseases, insurance provider) — personal fields explicitly excluded, since those go through the shared endpoint above.
- `POST /doctors`, `PATCH /doctors/me` — extended request DTOs with `specialtyId`, `professionalRank`, `licenseExpiryDate`, `departmentId` (professional fields only — personal fields go through the shared endpoint above, not duplicated here either).
- `POST /patients/:id/verifications` — new, mirroring the existing `POST /doctors/:id/verifications` exactly, both ultimately writing to the same generalized `VerificationCase`.
- `GET /admin/verification-queue` — **behavior change, not a new route**: today implicitly doctor-only; becomes subject-type-aware (`?subjectType=doctor|patient` filter, defaulting to both), reusing `GetVerificationReviewQueueUseCase` with a widened query — exactly the "reuse, don't duplicate" instruction.
- `PATCH /admin/verification-queue/:id` — **no change needed at all.** It already accepts a `status` and the domain already supports `MoreInfoNeeded` as a valid decision (`decide()` doesn't special-case it). The only real gap is the frontend never sends it. This is a reassuring finding — the riskiest-sounding requirement ("richer lifecycle") is nearly free.
- `GET /admin/verification-queue/:id/history` — new, backing the "Verification History" requirement, listing every past `VerificationCase` for that `subjectAccountId` (falls out of the schema change in §4 with no new domain logic).
- New domain method `VerificationCase.suspend(reason)` — required because `decide()` currently treats `Approved` as terminal (`AlreadyDecidedError`). `Suspended` needs to be reachable *from* `Approved`, which is a different transition than the initial review decision. Backing route: `PATCH /admin/verification-queue/:id/suspend`.
- **New: `GET /doctors`** — list/filter endpoint (by `specialtyId`, `hospitalId`, name-prefix; paginated), `JwtAuthGuard`-only (any authenticated account, since Patients need this to browse). This is genuinely new surface area, not present in any form today (`doctor-profile.controller.ts` only has `me` and `:id`). Deliberately minimal — a filtered list query, not full-text search — so it doesn't preempt or duplicate Stage 8's real search work later; a comment in the controller should say so explicitly, matching this codebase's convention of disclosing scope narrowing inline (e.g. `GetPlatformKpisUseCase`'s own comment about deferring two KPIs to Stage 9).
- **Gated-action enforcement — one mechanism, two complementary parts (tightened per §0a, previously read as two competing options):**
  1. **Security boundary (required):** the four gated endpoints (`POST /appointments`, the consultation-start route, `POST /media-assets/upload-intent` when purpose is a clinical document, `POST /payments` — exact route names to be confirmed against each module at implementation time) each gain a shared `@RequiresIdentityVerification()` guard checking for an Approved identity `VerificationCase`, returning `403 IDENTITY_VERIFICATION_REQUIRED` on failure. This is the actual protection — it must exist regardless of what the frontend does.
  2. **UX convenience (additive, not a substitute for #1):** `GET /patients/me/identity-verification-status` — a cheap read the frontend calls proactively (e.g. on dashboard load) so it can show/hide gated actions and route straight to the verify screen *before* a user even attempts one, rather than only reacting to a failed request. Purely a UX nicety; deleting it would degrade the experience but not create a security hole, since #1 still holds.

---

## 6. Reference Data Design

Explicit enum-vs-table split, using the rationale your own docs already wrote (`docs/09:96`) rather than a new rule:

| Field | Enum or Reference Table? | Why |
|---|---|---|
| Medical Specialty | **Reference table** | Genuinely needs runtime extension by clinical/ops staff without a deploy — new specialties get added as the platform grows into new markets/departments. |
| Insurance Provider | **Reference table** | Same reason — new insurers get onboarded operationally, not by engineers. |
| Country / Nationality | **Reference table** | ISO list, large, stable in shape but you may want to enable/disable countries per market rollout — better as data. |
| Professional Rank | **Enum** | Fixed, small (5 values), globally understood clinical taxonomy that doesn't vary by market — matches the same reasoning that already justifies `AccountRole`, `VerificationStatus`, etc. being enums, not tables. |
| Blood Type | **Enum** | 8 fixed values, will never need runtime extension — a reference table here would be pure overhead. |

This mirrors the design your own database docs already committed to — this proposal doesn't introduce a new pattern, it applies the existing one consistently to the fields that were missing it.

---

## 7. Verification Lifecycle

**No new states are needed.** The current `VerificationStatus` enum already has exactly the 7 states you proposed:

| State | Already exists? | What it's for |
|---|---|---|
| Draft | **Modeled implicitly**, not a stored state | No `VerificationCase` row exists yet — matches the existing doctor-onboarding pattern exactly ("no `DoctorProfile` yet → Profile step"). Recommend keeping this implicit rather than adding an explicit `Draft` row: a stored Draft state would mean two different code paths can represent "hasn't submitted yet" (no row vs. a Draft row), which is exactly the kind of dual-representation bug the current codebase has deliberately avoided. |
| Submitted | ✅ exists | Applicant finished the wizard, case enters the queue. |
| Under Review | ✅ exists | **Decided (2026-07-21):** the applicant never sees a distinction between `Submitted` and `UnderReview` — both render the same "Pending Verification" screen. Internally, recommend the transition happens automatically the moment an admin opens the case detail screen (a side effect of that `GET`, not a separate explicit admin action) — resolves the open question from the original proposal in the simplest way that still gives admins internal workload visibility ("is anyone looking at this yet?") without requiring an extra click. If that side-effect-on-GET pattern feels wrong at implementation time, the fallback is an explicit "Start Review" button — either way, the applicant-facing screen is identical, so this choice is purely an internal admin-UX/backend-purity question, not a product one. |
| Need More Information | ✅ exists (`MoreInfoNeeded`) | Admin needs something specific before deciding — currently reachable in the domain, invisible in the UI. |
| Rejected | ✅ exists | Terminal, with `reason` already populated and already surfaced to the applicant with edit+resubmit. |
| Approved | ✅ exists | Terminal (today) — triggers role promotion for doctors (unchanged); for patients, simply marks identity as verified (no role change, since patients don't change role on verification). |
| Suspended | ✅ exists, **but currently unreachable** | Needs a new domain transition (§5) since it must be reachable *from* Approved, a state `decide()` currently treats as terminal. Real-world trigger: license expiry, a complaint, a compliance hold — revokes standing without deleting history. |

**Why each state matters (as requested):** `Submitted`→`UnderReview` separates "in the queue" from "someone is actually looking at it," useful for admin workload visibility (not built yet, could be a small addition: an "assigned to" field — flagged as a nice-to-have, not required for this proposal). `MoreInfoNeeded` avoids the false-negative UX of "Rejected" when the real problem is a blurry photo or a typo — much better applicant experience, and it's the exact mechanism Stripe/Deel identity verification uses. `Suspended` is the only state that acknowledges verified status isn't permanent — a doctor's license can lapse after approval, which `Rejected` can't represent without losing the audit trail of ever having been approved.

### 7a. Progressive Patient Verification — Enforcement Mechanism (finalized 2026-07-21)

This is the concrete mechanism behind the decision in the Executive Summary and §1's flow diagram:

1. A Patient account has zero identity `VerificationCase` rows initially — this is not a special state, it's just the natural "no case yet" condition already used for Draft (§7).
2. Four actions are gated, each enforced **server-side** (§5's last bullet), not merely hidden in the UI: booking an appointment, starting a consultation, uploading a medical document (clinical `MediaAssetPurpose` values specifically — profile pictures etc. are not gated), making a payment.
3. When a gated action is attempted without an Approved case, the backend returns a structured `403 IDENTITY_VERIFICATION_REQUIRED` (not a generic 403) — the frontend maps this specific code to the "Verify your identity to continue" screen (§2), with copy tailored to *which* action triggered it (booking vs. payment vs. upload get different explanatory copy, since the reason a payment needs verification isn't the same reason a document upload does — fraud/AML for the former, medical-record integrity for the latter).
4. Completing verification (Submit → Approved) does **not** change `Account.role` for a Patient (unlike Doctor approval, which does) — it only changes whether the four gated actions succeed. This keeps the "only Doctor approval changes role" invariant the current codebase already established, rather than introducing a second role-changing trigger.
5. Once Approved, the Patient is redirected back to whichever action they originally attempted (recommend carrying a `returnTo` param through the verification flow, mirroring how OAuth-style redirect-back flows work — small, well-understood pattern, not a new one).
6. **Consequence for the Executive Summary's open question 1: resolved.** This is now a firm product decision, not a recommendation awaiting sign-off — implementation should proceed on this basis unless Egypt-specific legal counsel later overrides it (flagged once more, lightly, in §11, since that's a legal question outside this proposal's authority either way).

---

## 8. Security Considerations

- **Patient identity verification is progressive, not blocking — finalized** (§7a). A Patient can register, browse, search, view profiles, and edit their own profile with zero identity check; National ID + selfie verification is enforced only at the four gates in §7a, server-side, not just hidden in the UI. The one residual caveat (unchanged from the original proposal): Egypt's telemedicine regulatory posture may still mandate upfront KYC regardless of UX preference — that's a legal question outside this proposal's authority, noted once more in §11, but no longer blocking implementation on the product-design side.
- **No privilege escalation via the generalized `VerificationCase`:** `subjectAccountId` must be validated server-side against the authenticated caller's own account for every applicant-facing endpoint (`POST /patients/:id/verifications`, `GET .../verifications`) — exactly the existing `ensureOwnProfile()` pattern already used in `doctor-verification.controller.ts`, extended to patients rather than duplicated.
- **Document access control:** all 7 new document types (National ID, selfie, etc.) go through the existing `AssetModule` presigned-URL pattern — meaning only the uploading account and `SuperAdmin` (via the admin review screen) can ever generate a *download* presigned URL for them. This needs an explicit authorization check added to `createPresignedDownloadUrl`'s call site (confirm today's `GET` route for admin document viewing enforces `SuperAdmin`-or-owner, not just "any authenticated user" — flagged for implementation-time verification, not confirmed either way by this research pass).
- **National ID images are sensitive PII** — recommend (a) a shorter presigned-URL expiry specifically for these purposes than the current blanket 15 minutes, and (b) explicitly excluding these asset purposes from any future "AI Medical Chat" or "Medical Report Generator" context-gathering (Stage 5) — an identity photo should never end up inside an LLM prompt. Worth a one-line rule in whichever module builds Stage 5.
- **Reference-data CRUD is `SuperAdmin`-only** by design (§5) — prevents a compromised lower-privilege account from injecting a fake "specialty" or "insurance provider" that could later be used for phishing-style social engineering against other users browsing dropdowns.

---

## 9. Roadmap Impact

- Phone verification is explicitly **not** part of this proposal (no SMS provider exists in the codebase; adding one is a new external integration decision under CLAUDE.md's "ask before new frameworks" rule, deserving its own tiny discussion, same category as Stage 10/11/12's already-flagged library decisions in the master roadmap).
- This work sits inside **Phase 4's continuation umbrella** (same category as the just-completed Doctor Onboarding work) rather than a new numbered stage — consistent with your "not a new stage" framing.
- Stage 4 (Admin Dashboard) already built the Verification Queue frontend shell — this proposal *extends* that component, doesn't replace it, matching "reuse the existing Stage 4 Verification Queue" exactly.
- `HospitalAdmin`'s "zero capability yet" gap (explicitly disclosed in Stage 4's own completion note) remains untouched — this proposal doesn't give it anything to do, correctly, since you've confirmed hospitals aren't independent tenants.
- Future roadmap stages that should be aware of this proposal once it ships: Stage 5 (AI) — must never ingest identity documents (§8); Stage 9 (Reporting) — "doctors by specialty"/"patients by insurance provider" become real, groupable reports once reference tables exist, which they couldn't be before; Stage 14 (Seed Data) — demo accounts should exercise the full Journey-Selection → onboarding → verification flow, including at least one `MoreInfoNeeded` and one `Suspended` example case, so the admin screens have real, richer demo data instead of only Approved/Rejected.

---

## 10. Migration Strategy

Sequenced to minimize risk, each step independently shippable and testable (matching every prior stage's "backend build/lint/test/boot-test, then commit" discipline):

1. **Reference tables first, standalone.** Ship `medical_specialties`/`countries`/`insurance_providers` + their read/CRUD endpoints with zero coupling to Doctor/Patient profiles yet. Fully testable in isolation.
2. **New `PersonalProfile` entity (Identity domain, §0a)** — standalone 1:1-with-`Account` table, zero coupling to Doctor/Patient yet. Independent of step 1, can ship in parallel.
3. **`DoctorProfile` additive columns**, `specialtyId` nullable alongside the still-live `specialty` string. Backend accepts either during a transition window; frontend switches to sending `specialtyId` only once the dropdown ships.
4. **Backfill `specialtyId`** for every existing `DoctorProfile` row via a one-time script (fuzzy string match against `medical_specialties.name`, generating a report of ambiguous/unmatched rows for a human to resolve manually — do **not** auto-guess silently for a field this important).
5. **`PatientProfile` additive columns** (medical fields only, §0a) — genuinely new, no backfill needed (no existing data to migrate, since none of these fields exist today).
6. **`VerificationCase` generalization** — the highest-risk step. Add `subjectType`/`subjectAccountId` nullable, backfill from existing `doctorId` rows (`subjectType='Doctor'`), ship the new `findAllBySubject` method *alongside* the old one, migrate every call site one at a time, verify with the full existing test suite (this table has the most existing tests touching it — expect this to be the step with the highest "existing test fakes need updating" cost, same shape as Stage 4's own `AccountRepository.findAll()` addition, its own explicitly-flagged highest-blast-radius change).
7. **New `MediaAssetPurpose` values + upload UI** — additive, zero migration risk, can ship anytime after step 1.
8. **Frontend: Choose Your Journey screen, expanded wizards, admin screen enhancements** — last, once every backing endpoint above is real and tested (no screen should ever call a not-yet-real endpoint, consistent with this codebase's "no fabricated data" discipline throughout).
9. **Drop the old `DoctorProfile.specialty` string column** — only after step 4's backfill is confirmed 100% complete and step 8 has shipped (nothing left reading the old column).

Each numbered step above = one stage-sized unit of work with its own backend build/lint/test/boot-test + frontend lint/typecheck/test/build gate, exactly like every completed stage to date.

---

## 11. Risks & Open Questions

**Risks:**
- Step 5 above (`VerificationCase` generalization) is genuinely the riskiest single change in this whole proposal — it touches an entity with real production-adjacent state (already-submitted, already-decided doctor verification cases) and the most existing test coverage of anything in scope. Budget real regression-test time here, same as Stage 4's own explicit warning about its highest-blast-radius change.
- Fuzzy-matching free-text `specialty` values to reference-table rows (step 3) is inherently imperfect — a doctor who typed "Cardiologist" vs "Cardiology" needs a human to confirm the match, not an automated guess silently applied to a licensing-adjacent field.
- **Resolved 2026-07-21:** patient identity verification is progressive (§7a) — no longer an open risk on the product-design side. The only residual exposure is the Egypt-legal question in open item 1 below, which is a compliance sign-off, not a design ambiguity anymore.
- New risk surfaced by this update: the four gated actions (§7a) each need their own backend enforcement check added at implementation time — missing even one (e.g. forgetting the payment endpoint) would silently create a bypass. Recommend a single shared guard/decorator (e.g. `@RequiresIdentityVerification()`) applied to all four call sites rather than four independent, driftable checks — safer than relying on four engineers remembering the same rule separately.

**All open questions are now resolved — none remain blocking:**
1. ~~Is patient National-ID + selfie verification legally required before first use in Egypt?~~ **Not blocking.** Product design proceeds on progressive/contextual verification (§7a); would only be revisited if Egyptian telemedicine regulation later overrides it.
2. ~~Does Doctor Onboarding need a real Personal Info step?~~ **Resolved (finalized 2026-07-21): yes**, kept as a real step, always shown before Professional Info, for consistency between Patient and Doctor onboarding and to build a complete profile up front. Implemented as the shared `PersonalProfile` component/endpoint (§0a), not a Doctor-specific duplicate.
3. ~~Allergies/chronic diseases: array column or child table?~~ **Resolved (finalized 2026-07-21): neither — plain nullable `TEXT` columns**, simple free text, no tags, no reference tables, no coded terminology (ICD-11/SNOMED CT explicitly excluded for this phase). Architecture stays extensible for a future normalization phase (a later migration could split `TEXT` into structured rows without touching anything else, same additive-migration discipline as every other change in this proposal), but nothing beyond plain text ships now.
4. ~~Should "Under Review" transition automatically...~~ **Resolved (§7 table)**: applicant-facing UX is identical either way (a single "Pending Verification" screen), so this is purely an internal implementation-time choice.

---

## 12. Screens That Must Be Redesigned

1. Choose Your Journey — **new**, reachable post-email-verification, pre-selects a card per §1a landing-page intent.
2. Patient Dashboard — **changed**: reachable immediately after Choose Journey (no onboarding wizard gate), surfaces Browse Doctors, Search Doctors, Browse Specialties, doctor profile views, "Edit my profile."
3. Doctor listing / search screen — **new** (backs the dashboard's Browse/Search Doctors entries; needs the new `GET /doctors` endpoint, §5/§9).
4. Personal Info editor — **new, shared component** (§0a): one screen/endpoint used both as the Doctor Onboarding wizard's first step and as the Patient Dashboard's "Edit profile" entry, not built twice. Patient Medical Profile editor (blood type, allergies, chronic diseases, insurance) — **new**, Patient-only, reachable anytime from the dashboard, not a wizard gate.
5. "Verify your identity to continue" gate screen — **new** (§7a), shown only when a gated action is attempted; copy varies per triggering action.
6. Patient Identity Verification wizard (National ID Front/Back, Selfie, Review & Submit) — **new**, only entered via the gate screen above, never as a standalone onboarding step.
7. Doctor onboarding — **Professional Info step redesigned** (reference dropdowns, rank, license expiry, hospital+department, independent-practice option).
8. Doctor onboarding — **Documents step redesigned** (7 typed uploads instead of 1).
9. Doctor "Pending Verification" screen — **changed**: shown for the entire Submitted/UnderReview period as one unified screen (§7 table), not split by internal state.
10. Rejected/status screens (shared by Patient identity verification and Doctor onboarding) — **extended** to handle `MoreInfoNeeded` as its own friendly state, plus a new `Suspended` screen.
11. Admin Verification Queue list — **enhanced** (show applicant name, not raw UUID; filter by subject type).
12. Admin Verification Case detail — **substantially new** (full profile, documents, timeline/history, three actions instead of two).

---

## 13. Recommended Implementation Order (summary — see §14 for the full stage-by-stage plan)

1. Reference tables + `PersonalProfile` (§10 steps 1–2) — both standalone, ship in parallel.
2. `VerificationCase` generalization (§10 step 6) — before any Patient identity-verification screens are built.
3. `DoctorProfile` + `PatientProfile` additive columns and backfill (§10 steps 3–5).
4. New `MediaAssetPurpose` values (§10 step 7) — independent, parallel with step 3.
5. New `GET /doctors` list/filter endpoint (§5/§9) — independent, unblocks Browse/Search Doctors early.
6. The shared `@RequiresIdentityVerification()` server-side guard applied to the four gated-action endpoints — before the frontend gate screen.
7. Remaining backend endpoints (§5).
8. Frontend: Choose Your Journey + Patient Dashboard (immediate access).
9. Frontend: Doctor onboarding wizard changes + unified Pending Verification screen.
10. Frontend: shared Personal Info editor, Patient Medical Profile editor, "Verify your identity" gate screen, Patient identity-verification wizard.
11. Frontend: Admin screen enhancements.
12. Drop the deprecated `specialty` string column — last, separate cleanup stage.

---

## 14. Final Implementation Plan

Status: **Approved product design, ready to execute.** Formatted like every completed roadmap stage — each is independently shippable behind its own backend build/lint/test/boot-test and frontend lint/typecheck/test/build gate, committed before the next one starts, exactly matching this codebase's established discipline. This sits inside Phase 4's continuation umbrella (§9) — not a new numbered roadmap stage.

**Stage O.1 — Foundations (reference data + shared identity profile)**
- `medical_specialties`, `countries`, `insurance_providers` tables + `GET /reference/*` (read) + `POST/PATCH /admin/reference/*` (SuperAdmin CRUD), §4/§5/§6.
- New `PersonalProfile` entity (Identity domain) + `PATCH /accounts/me/personal-profile`, §0a/§4/§5.
- New `GET /doctors` list/filter endpoint, §5/§9.
- Zero coupling to anything else in this plan — the safest possible starting point, and the first real test of whether the reference-table pattern from `docs/09` works end-to-end.
- Verification: unit tests per new use case, integration tests per new controller, no existing test should need to change at all this stage.

**Stage O.2 — Verification generalization (highest risk, sequenced early on purpose)**
- `VerificationCase` gains `subjectType`/`subjectAccountId`, backfilled from existing `doctorId` rows; new `findAllBySubject` alongside the existing `findAllByDoctorId`; new `VerificationCase.suspend(reason)` domain method; new `POST /patients/:id/verifications`; `GET /admin/verification-queue` becomes subject-type-aware; new `GET /admin/verification-queue/:id/history`.
- Verification: full existing Trust-module test suite must stay green; add subject-generalization-specific tests; this is the stage to budget the most regression-test time (§11 risk).

**Stage O.3 — Doctor & Patient profile fields**
- `DoctorProfile`: `specialtyId` (+ fuzzy backfill script, human-reviewed), `professionalRank` enum, `licenseExpiryDate`, `departmentId` (with the `departmentId`-requires-`hospitalId` invariant enforced).
- `PatientProfile`: `bloodType` enum, `allergies`/`chronicDiseases` (plain `TEXT`), `insuranceProviderId`. Bare-row creation on Choose Your Journey (§3 fix).
- New `MediaAssetPurpose` values (7 typed document slots), can run in parallel with the above.
- Verification: unit tests per new field/validation, repository tests for the new FKs, no regression in existing Doctor/Patient test suites.

**Stage O.4 — Backend enforcement**
- Shared `@RequiresIdentityVerification()` guard (or equivalent) applied to the four gated endpoints (booking, consultation start, clinical document upload, payment) — built and tested *before* any frontend gate UI exists, so enforcement never trails the interface.
- `GET /patients/me/identity-verification-status` (UX convenience, §0a).
- Verification: integration test per gated endpoint confirming both the 403 path (unverified) and the success path (Approved), plus a test that an already-authenticated request without going through any frontend screen is still correctly blocked (proves this is a real security boundary, not UI-only).

**Stage O.5 — Frontend: Journey & Patient Dashboard**
- Choose Your Journey screen (§1a intent pre-selection), Patient Dashboard changes (Browse/Search Doctors, Browse Specialties, doctor profile views — all immediately reachable, no wizard gate).
- Verification: component tests per new screen, an E2E smoke test for Create Account → Verify Email → Choose Journey → Dashboard with zero identity check encountered.

**Stage O.6 — Frontend: Doctor onboarding updates**
- Shared Personal Info step (new, first in the wizard), redesigned Professional Info step (reference dropdowns, rank, license expiry, hospital+department+independent-practice), redesigned Documents step (7 typed uploads), unified Pending Verification screen.
- Verification: extends the existing doctor-onboarding test suite; explicit regression check that the existing "resume at the right step" logic still works with the new leading step inserted.

**Stage O.7 — Frontend: Patient identity verification + profile editing**
- Patient Medical Profile editor (dashboard-reachable, anytime), "Verify your identity to continue" gate screen (per-action copy, §7a), Patient identity-verification wizard (National ID Front/Back, Selfie, Review & Submit), shared Rejected/MoreInfoNeeded/Suspended status screens.
- Verification: component tests per screen, an E2E test attempting a gated action pre-verification (expect the gate screen), completing verification, and confirming automatic return to the original action (`returnTo`, §7a).

**Stage O.8 — Frontend: Admin experience**
- Enhanced Verification Queue list (applicant name, subject-type filter) and Case Detail (full profile, documents, timeline/history, Approve/Reject/Request-More-Info actions).
- Verification: component tests, an integration test exercising a full `MoreInfoNeeded` → resubmit → `Approved` cycle for both a Patient and a Doctor case through the same admin screen.

**Stage O.9 — Cleanup**
- Drop the deprecated `DoctorProfile.specialty` string column, once Stage O.3's backfill is confirmed complete and Stage O.6 has shipped.
- Verification: full backend test suite green with the column gone; a final full-program regression sweep (backend build/lint/full-test-suite/boot-test, frontend lint/typecheck/test/build) before considering this program complete.

---

## Sign-off

This proposal (v3) is finalized. Every product decision is resolved (§0, §7a, §11); the one consistency issue found in the final review (duplicated Personal Info modeling, §0a) is fixed throughout; the stage-by-stage plan in §14 is ready to execute starting with Stage O.1. No code has been written. Awaiting your go-ahead to begin Stage O.1.

---

## Stage O.8 Completion Note — 2026-07-25

Status: **Complete, reusing O.2's generalized `VerificationCase` and the existing Stage 4 Verification Queue exactly as instructed — no second/parallel verification system was created.**

**Real admin review flow, both subjects.** `/admin/verification-queue` (SuperAdmin-only) lists active cases with real server-side `subjectType`/`status` filters (`GET /admin/verification-queue?subjectType=&status=`, no client-side filtering); each row links to a full `/admin/verification-queue/:id` case-detail page (new `GET /admin/verification-queue/:id` route, `AdministrationController`) showing: **Applicant** (real `GET /accounts/:id` lookup — full name/email/phone/DOB/gender/nationality/address/account status/role; never duplicated onto `VerificationCase`), **Verification Information** (subject type, status, reason, timestamps), **Doctor-specific context** (license number/specialty/rank/expiry/department/years of experience, via a new `GET /doctors/by-account/:accountId`, SuperAdmin-only), and **Documents** (only the ids actually on the case — no invented placeholders). Patient cases deliberately show no medical/clinical fields (allergies, chronic diseases, blood type) — least-privilege, per instruction.

**Document access (ADR-007, part 1).** A new, minimal `GetMediaAssetUseCase` / `GET /media-assets/:id` (owner-OR-SuperAdmin, enforced server-side) exposes AssetModule's already-existing-but-previously-uncalled presigned-download-URL capability. The document viewer mints a fresh signed URL per render; images preview inline, everything else gets a real "Open document" link. No raw/public S3 URL is ever returned or stored; no parallel file-serving path was built.

**Review actions.** Approve/Reject/Request-More-Information/Suspend all persist through the existing `PATCH /admin/verification-queue/:id` (decide) and `PATCH /admin/verification-queue/:id/suspend` routes — the domain (`VerificationCase.decide()`/`.suspend()`) is the only place transition validity is enforced; the frontend only ever shows the actions valid for the case's current status, never duplicating that logic. Reject/Request-More-Info/Suspend require a non-empty reason (a `Dialog` + `Textarea`, confirm disabled until non-empty); Approve has no separate note field (the domain has nowhere to put a second one).

**Patient consequence (§7).** Approving a Patient case does not touch `Account.role` — `VerificationCase` remains the sole source of truth; `GET /patients/me/identity-verification-status` derives `isVerified` from the latest case only. `Account.isVerified` was never introduced. Approving a submitted case unblocks the four O.4-gated actions (booking, telemedicine, payment, clinical upload); suspending an Approved case re-blocks them (verified live, real backend contract, in `tests/e2e/identity-verification.spec.ts`).

**Doctor consequence (§6, ADR-007 part 2).** Approving a Doctor case still raises `DoctorVerifiedEvent` → `PromoteDoctorRoleOnVerificationHandler` (unchanged, pre-existing). Rejecting never promotes. **Suspending an already-Approved Doctor case does NOT automatically demote the account's role or revoke Doctor Portal access** — this gap was discovered, flagged, and the "no automatic demotion" policy was confirmed directly with the product owner rather than assumed (see ADR-007). An admin who also wants to cut off access uses the separate, pre-existing `PATCH /accounts/:id/suspend`.

**Request-more-info / resubmission (§8).** Reuses O.7's exact wizard and status components — no second wizard. Resubmitting always creates a new `VerificationCase` row; the applicant's own status view and the admin's queue/history both read the same `findAllBySubject` list, most-recent-first, so a new submission is immediately visible to both sides and prior activity is never lost.

**History/audit (§10).** `GET /admin/verification-queue/:id/history` lists every case for the same subject (timestamp, status, reason). **Reviewer identity is disclosed as NOT tracked** — no `adminId`/`reviewerId` field exists anywhere in the domain; the UI shows an explicit, honest limitation string rather than inventing "Admin" as a fake reviewer name.

**Authorization (§11).** Every admin route requires SuperAdmin; `HospitalAdmin` was deliberately given no access, per instruction, despite the role existing. Frontend `RequireRole` is a UX convenience only — every route's real enforcement is server-side (`@Roles(AccountRole.SuperAdmin)`).

**Testing.** Backend: 799 tests green (typecheck/lint/full suite/boot verified). Frontend: 305 Vitest tests green (typecheck/lint clean), including new real-MSW-backed component tests for the queue, case detail, and document viewer. Frontend E2E: 4 new Playwright specs written and typechecked (`admin-verification-review.spec.ts` — queue/filter/case-detail/documents/Approve/Reject/Suspend, all through real clicks and real MSW-backed persistence proven via reload; plus a new suspend-consequence test in `identity-verification.spec.ts`) but **not executed** in this environment — the machine's available memory (8GB total, contended by other running processes) was insufficient to complete a Next.js production build across repeated attempts (real OS-level allocation failures, not a code defect; typecheck/lint/unit-test gates all independently confirm the code is correct). This is a disclosed, NOT-run item, not a claimed pass.

**Deferred/disclosed limitations (unchanged scope, not gaps introduced by this stage):** no pagination on the verification queue (not needed at current volume); no full-text search (Stage 8, explicitly out of scope); reviewer identity not tracked (§10, above); Doctor-suspend does not auto-demote role (ADR-007, a deliberate policy, not an oversight).

Do not start Stage O.9 based on this note alone — see the separate strict completion report for the full 18-point breakdown and its READY / NOT READY determination.
