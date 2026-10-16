# ORIVEX demo data: implementation report

Date: 2026-10-13/14. Environment: **local only**. The local Docker stack ran Postgres 16, Redis, MinIO and Mailpit, against a fresh database `orivex_demo` that was created for this work. Your existing local `orivex` database and the hosted Render/Vercel deployment were **not touched**. Nothing was committed or pushed.

---

## 1. What was built

A new seed stage, the **demo timeline** (`apps/backend/prisma/demo/`), replaces the old seed's history sections. It is run as stage 2 of `npm run seed`, or on its own with `npm run demo:seed`. Usage is in `prisma/demo/README.md`.

| | Old seed (hosted demo today) | Demo timeline (local `orivex_demo`) |
|---|---|---|
| Time range | Relative to the seed day, then frozen | Anchored (`--anchor` / `DEMO_ANCHOR_DATE`, default now); a re-run slides the whole timeline |
| Appointments | 152 | 447 (353 completed, 46 upcoming confirmed, 6 pending, 24 cancelled, 10 rescheduled, 7 no-show, 1 expired) |
| doctor03 | 6 appointments, 4 ratings | 51 completed, 13 upcoming, 3 pending approval, 16 patients, 38 visible reviews (4.76) |
| patient03 | 8 appointments, 0 documents | 19 completed with 6 doctors; next visit doctor03 tomorrow, plus a reschedule chain (internal medicine) and a pending free request (ophthalmology); 13 prescriptions (3 active); 7 lab requests; 9 documents; 33 vitals; 8 Health Passport entries |
| SOAP notes | content only, no S/O/A/P | 365, every completed visit; all four sections; occasional addenda |
| Prescriptions | `verificationCode` null, PDF 404 | 254, all signed by the real HMAC signer; code, verify and PDF all work |
| Payments | dated at seed time | 386, dated at booking (pay-then-confirm); refunds follow the product's own rules |
| Documents | broken ID images, no clinical documents | 62 synthetic clinical files plus 61 repaired SPECIMEN identity images, all present in object storage |
| Messages / Knowledge / Disputes / Waitlist | all empty | 53 threads with 144 messages; 20 articles (EN and AR, every state); 6 disputes; 6 waitlist entries |
| Notifications | 538, all from the seed day | 794 in total (timeline plus re-timed identity notifications); wording, recipients and links mirror the real handlers |

### Files

New:
- `apps/backend/prisma/demo/`: `core.ts`, `load.ts`, `catalog/clinical.ts`, `catalog/stories.ts`, `catalog/content.ts`, `plan/types.ts`, `plan/schedule.ts`, `plan/soap.ts`, `plan/planner.ts`, `files.ts`, `apply.ts`, `checks.ts`, `run.ts`, `verify-api.ts`, `README.md`, `REPORT.md`
- `apps/frontend/tests/demo-data/walkthrough.mjs`

Changed:
- `apps/backend/prisma/seed.ts`. Sections 1–4 (identities through real use cases) are kept. The legacy history sections 5–7 are replaced by a call to the timeline. Hand-made off-grid availability windows are removed. Seeded hospitals get real addresses. Your uncommitted `nameAr` work is kept as-is; its import moved into the local-imports group to satisfy `import/order`.
- `apps/backend/package.json`: added `demo:seed`, `demo:dry-run` and `demo:check`.

---

## 2. Architecture and seed findings (Phases 1–3)

### Write paths, and why the timeline writes historical rows with Prisma

- **Commands self-timestamp.** The write-path commands (book, start, close, note, diagnosis, prescription, feedback) all stamp `new Date()`, and `AvailabilityWindow.define()` rejects a start time in the past. Both are correct production rules. So history cannot go through them; the old seed already worked around this with `reconstitute()`.
- **Repositories cannot do idempotent historical upserts:**
  - `PrismaPaymentTransactionRepository.save()` never writes `createdAt`, so it falls back to Postgres `now()`.
  - Prescriptions are create-only; a re-save throws.
  - Appointments and sessions use optimistic version increments.
  - Health-graph nodes use `createMany` with `skipDuplicates`.
- **So the timeline writes with Prisma**, using deterministic UUIDv5 ids and historical timestamps, and derives every value it can from real code:
  - the HMAC prescription signer, run over each prescription's own `signedAt`;
  - `generateCandidateSlotsForDate`, the product's own slot grid;
  - `GetBookableAvailabilityUseCase`, which materialises the next 14 days of slots;
  - the SOAP-to-`content` format from `ClinicalNote.record()`;
  - the wording, recipient rules and link rules of each notification handler.

### Entity inventory: supported / not in schema

**Supported and seeded:**
- Accounts and profiles (signup dates, addresses, allergy status, blood type, chronic conditions); portfolio (publications, awards, experience); emergency contacts.
- Verification cases (realistic review times); weekly hours; schedule exceptions; availability windows.
- Appointments (every status), reschedule chains, sessions, payments and refunds.
- Health graph (conditions: suspected → confirmed via `supersedesNodeId`, ruled out); journeys and journey links; SOAP notes and addenda; vitals; prescriptions and line items; lab requests (`ORDERED`/`CANCELLED`); follow-up recommendations.
- Feedback with three dimensions, and moderation states.
- MediaAssets with their objects; message threads, messages and read state; notifications.
- Knowledge articles (all 5 states), saves and follows; disputes (4 statuses, 5 categories); waitlist (4 statuses); Health Passport notes and entries.

**Not in schema, or not reachable — reported, not faked:**
- ICD-11 code column. Codes are written into the description where well known.
- Drug catalog table. `drugCatalogId` is a free string, so stable UUIDv5 values per drug are used.
- Lab results. `LabRequestStatus` has only `ORDERED`/`CANCELLED`; results are represented as the patient's uploaded lab-report PDF.
- Partial-day time off. Exception types are only `VACATION`, `UNAVAILABLE` and `EXTRA_HOURS`.
- Notification severity. Every handler emits `INFO`, so "mixed severity" can't occur.
- Payout or earnings-cycle table. Cycles are computed from payments at read time.
- "Cancelled by" on an appointment. Not stored; it is visible only through notifications and refunds.
- "Uploaded by" on a document. A doctor's chart upload is owned by the patient's account.
- AI suggestion history. There is no read endpoint, and the Copilot keeps suggestions in component state, so seeded rows would never be visible (see §8).
- Dependants. There is no guardian or child model; see paediatrics in §8.

### Background jobs that act on demo data

- **No-show sweep** (every 5 min): `CONFIRMED` + `WAITING_ROOM` more than 30 min past its slot → `NO_SHOW`.
- **Expiry sweep:** past `REQUESTED` → `EXPIRED`.
- **Stale-session sweep** (every 15 min): see D13 below. This is a real bug.

---

## 3. Invariant results (`npm run demo:check`)

All 15 invariants and the coverage floors pass on the final local run:

| # | Rule | Result |
|---|---|---|
| I1 | Completed visit → one closed, completed session, 5–50 min | PASS (353) |
| I2 | On the doctor's slot grid; no doctor or patient overlaps | PASS (447) |
| I3 | Paid visit → exactly one payment for the fee snapshot, dated at booking; refunds only on cancel, reschedule or admin refund | PASS (357) |
| I4 | Every charged visit has its payment (earnings = payments × 85%) | PASS (20 doctors) |
| I5 | Reviews only on completed consultations, by that patient | PASS (270) |
| I6 | Prescriptions: treating doctor, own patient, signed with a code, allergy-safe, within the specialty | PASS (254) |
| I7 | Notes and diagnoses by the treating doctor; diagnoses fit the specialty; every completed visit has SOAP | PASS (489) |
| I8 | Vitals plausible; weight changes gradually | PASS (411) |
| I9 | Every document row has its object, with the right type and size | PASS (123) |
| I10 | Notification links open an authorised page; entities exist; nothing in the future | PASS (794) |
| I11 | Threads only between related pairs; `lastMessageAt` in sync | PASS (53) |
| I12 | Doctors practise only after approval (realistic review time); nothing after a suspension | PASS (20) |
| I13 | No stale `CONFIRMED`/`REQUESTED` rows, no sessions left in progress | PASS (447) |
| I14 | Scope: timeline rows reference only allow-listed accounts | PASS |
| I15 | Dates: history ≤ anchor, upcoming ≤ 30 days, pending requests in the future | PASS (447) |
| C1 | Coverage floors (doctor: ≥15 completed, ≥2 upcoming, ≥5 visible reviews; patient: ≥5 completed with ≥3 doctors, ≥1 upcoming, ≥2 documents) | PASS (patient17 exempt by design) |

**Idempotency:** three consecutive runs with `--anchor 2026-10-13T15:15:00Z`. The third run reported 0 created, 0 updated, 0 pruned, 0 patches applied and 0 uploads, with every table "unchanged". Re-anchoring (14:05 → 15:15) updated rows in place and pruned 1 stale notification, with no duplicates.

---

## 4. API verification (`verify-api.ts`, against a running local backend)

**1,222 / 1,222 checks passed**: 20 doctors × 38 (doctor15 × 35, because a paediatrician writes no prescriptions), 20 patients × 22, admin × 18 and authorisation × 7. Each account signs in through the real `POST /auth/login`, then:

- **Doctor:**
  - Dashboard summary, upcoming work, queue and schedule all answer 200.
  - The patient list length equals the distinct patients in the database.
  - Pending approval loads.
  - Reports summary and analytics load for 7, 30, 90 and 270 days.
  - **Earnings summary equals the succeeded payments** (lifetime count and gross), with at least 2 monthly cycles over 90 days for paid doctors; transactions load.
  - Weekly hours, time-off and upcoming slots are non-empty.
  - **The number of visible reviews equals the database count.**
  - Threads, unread count, notifications, articles, disputes and search load.
  - All six chart endpoints load for the most-seen patient.
  - A consultation summary loads, **the prescription PDF returns `application/pdf` (>1 KB) and the public verification answers `valid: true`** (D1).
- **Patient:**
  - Profile, dashboard, upcoming visits (non-empty, except suspended patient17), active and all prescriptions, health dashboard and medical records load.
  - **Documents are non-empty and the first one downloads (HTTP 200) through its presigned URL.**
  - Health Passport, appointments, threads, notifications, waitlist, disputes, knowledge (all, saved, followed) and health graph load.
  - **Their own prescription PDF returns 200.**
- **Admin:** KPIs, 8 analytics sections over 90 days, payments, verification queue, audit log, flagged reviews, disputes, knowledge moderation, accounts and hospitals.
- **Authorisation (all denied as expected):**
  - patient03 cannot read patient06's prescription, its PDF or a document;
  - a patient cannot call the doctor-chart endpoint;
  - a doctor cannot open an unrelated patient's chart;
  - a doctor and a patient both get 403 on `/admin/kpis`.

The first run found 20 failures, all from a bug in the verifier: it did not recognise the `{ reviews: [...] }` response shape. The verifier was fixed and the check made stricter (exact count against the database) before the 1,222/1,222 re-run.

---

## 5. Browser verification (Playwright, `apps/frontend/tests/demo-data/walkthrough.mjs`)

Run against a production build (`next build` and `next start`) and the local backend. **42 / 42 accounts clean.**

- **What each account did:** signed in through the real login form, landed on the right workspace, and opened its screens.
- **Coverage:** every screen for doctor03 (14), patient03 (18) and admin (10), plus 375 px mobile views; 4 screens for every other doctor and patient; the hospital-admin dashboard.
- **What "clean" means:**
  - each screen waited until every skeleton placeholder was gone (the data actually rendered);
  - no 4xx/5xx from the API;
  - no console errors;
  - no broken images (`naturalWidth > 0`);
  - no "Access restricted", "Something went wrong" or "Sign in required" pages;
  - no horizontal scroll at 375 px.
- **One known product behaviour is reported separately for every patient:** the app shell's `GET /doctors/me` returns 404.
- Screenshots and `results-*.json` are in `apps/frontend/test-results/demo-data/` (git-ignored).

**What the screenshots confirm:**

- **D2:** identity images render as SPECIMEN cards in the admin verification case.
- **D5:** doctor03's earnings show EGP 5,250 gross over 30 days from 15 paid consultations, with a populated chart.
- **D7:** the dashboard shows "Next: Thu, Oct 15, 10 AM" instead of "No open slots".
- **D10:** smooth weight, BP and glucose trends on the Health Dashboard.
- **doctor03's chart of patient03:** the penicillin allergy banner, ICD-11-coded conditions (hypothyroidism ruled out after a normal TSH) and 2 active prescriptions.

**How the walkthrough had to be built** (and what it found):

- `next dev` compiles each route on demand (40–70 s each), so the run uses a production build.
- The script navigates in-app (`router.push`), like a user clicking through. A full reload per screen re-runs `POST /auth/refresh`, which is limited to 5 per minute per IP, and the app then shows "Sign in required" (see §7).
- Screens are paced against the global 100 requests/minute throttle.

### Regression (Phase 19)

| Suite | Result |
|---|---|
| Backend `npm test` (1,662 tests) | **All pass.** 25 real-PostgreSQL integration tests were first *cancelled* on the empty scratch database (they need seeded specialties) and pass once reference data exists. Run against a separate scratch database, not your `orivex` one. |
| Backend `typecheck` / `lint` | Clean / 0 errors (6 pre-existing warnings in `src/`, none from this work) |
| Frontend `tsc --noEmit` / `eslint src` | Clean / 0 errors (7 pre-existing warnings) |
| Frontend Vitest | **977 / 977** (230 files) |
| Frontend `next build` | Succeeds |

---

## 6. Coverage by account (measured with SQL on `orivex_demo`)

### Doctors (20)

| doctor | completed | upcoming | pending_approval | other_states | patients | visible_reviews | avg_rating | paid | gross_egp | earning_months | threads | notifications | unread | articles | time_off | prescriptions |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| doctor01 | 16 | 2 | 0 | 1 | 3 | 15 | 4.87 | 18 | 8100 | 9 | 2 | 8 | 0 | 2 | 2 | 16 |
| doctor02 | 20 | 2 | 0 | 2 | 5 | 14 | 4.71 | 21 | 7980 | 8 | 3 | 5 | 0 | 1 | 2 | 10 |
| doctor03 | 51 | 13 | 3 | 8 | 16 | 38 | 4.76 | 63 | 22050 | 10 | 8 | 24 | 5 | 4 | 3 | 25 |
| doctor04 | 15 | 2 | 1 | 0 | 3 | 10 | 3.90 | 0 | 0 | 0 | 2 | 8 | 2 | 1 | 2 | 15 |
| doctor05 | 15 | 2 | 0 | 5 | 3 | 13 | 4.92 | 16 | 8000 | 8 | 3 | 14 | 0 | 0 | 2 | 15 |
| doctor06 | 15 | 2 | 0 | 2 | 4 | 11 | 4.91 | 17 | 6800 | 9 | 2 | 5 | 0 | 1 | 2 | 15 |
| doctor07 | 15 | 2 | 0 | 1 | 3 | 10 | 4.70 | 17 | 5440 | 8 | 3 | 7 | 0 | 1 | 2 | 15 |
| doctor08 | 16 | 2 | 0 | 1 | 5 | 11 | 4.73 | 18 | 10800 | 9 | 2 | 8 | 0 | 0 | 2 | 16 |
| doctor09 | 15 | 2 | 0 | 1 | 5 | 6 | 4.50 | 17 | 6460 | 9 | 3 | 5 | 0 | 0 | 2 | 15 |
| doctor10 | 15 | 2 | 1 | 3 | 6 | 11 | 4.55 | 0 | 0 | 0 | 2 | 9 | 0 | 1 | 2 | 5 |
| doctor11 | 15 | 2 | 0 | 1 | 4 | 12 | 4.25 | 17 | 7140 | 8 | 3 | 5 | 0 | 0 | 2 | 11 |
| doctor12 | 16 | 2 | 0 | 3 | 7 | 14 | 4.86 | 18 | 9000 | 8 | 2 | 7 | 0 | 2 | 2 | 13 |
| doctor13 | 15 | 2 | 0 | 0 | 5 | 12 | 4.25 | 17 | 6800 | 7 | 3 | 8 | 0 | 0 | 2 | 6 |
| doctor14 | 17 | 3 | 0 | 2 | 10 | 14 | 4.71 | 20 | 7000 | 7 | 2 | 13 | 1 | 2 | 2 | 17 |
| doctor15 | 16 | 2 | 0 | 1 | 6 | 12 | 4.83 | 18 | 5400 | 7 | 2 | 4 | 0 | 1 | 2 | 0 |
| doctor16 | 19 | 2 | 0 | 3 | 6 | 15 | 4.67 | 23 | 6900 | 10 | 3 | 8 | 1 | 2 | 2 | 14 |
| doctor17 | 16 | 2 | 0 | 1 | 8 | 13 | 4.31 | 17 | 9350 | 7 | 2 | 4 | 0 | 1 | 2 | 13 |
| doctor18 | 16 | 2 | 0 | 3 | 7 | 14 | 4.50 | 18 | 3600 | 7 | 2 | 12 | 0 | 0 | 2 | 11 |
| doctor19 | 15 | 2 | 0 | 1 | 8 | 11 | 4.73 | 18 | 5760 | 9 | 2 | 6 | 0 | 1 | 2 | 15 |
| doctor20 | 15 | 2 | 1 | 3 | 9 | 11 | 4.18 | 0 | 0 | 0 | 2 | 13 | 2 | 0 | 2 | 7 |

### Patients (20)

| patient | completed | doctors | upcoming | other_states | prescriptions | active_rx | lab_requests | documents | vitals | passport | threads | notifications | unread | reviews | waitlist | saved | follows |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| patient01 | 21 | 6 | 4 | 1 | 15 | 4 | 2 | 2 | 32 | 4 | 3 | 51 | 3 | 21 | 0 | 1 | 1 |
| patient02 | 18 | 6 | 2 | 6 | 11 | 1 | 1 | 2 | 24 | 2 | 4 | 31 | 2 | 9 | 0 | 1 | 1 |
| patient03 | 19 | 6 | 3 | 5 | 13 | 3 | 7 | 9 | 33 | 8 | 4 | 50 | 5 | 15 | 1 | 3 | 2 |
| patient04 | 21 | 5 | 4 | 0 | 15 | 2 | 0 | 2 | 16 | 1 | 4 | 27 | 6 | 17 | 0 | 0 | 0 |
| patient05 | 20 | 6 | 2 | 0 | 14 | 1 | 2 | 2 | 22 | 4 | 3 | 30 | 1 | 15 | 0 | 1 | 1 |
| patient06 | 20 | 6 | 5 | 1 | 17 | 8 | 7 | 5 | 39 | 5 | 2 | 53 | 6 | 15 | 0 | 1 | 0 |
| patient07 | 17 | 5 | 2 | 2 | 15 | 1 | 2 | 2 | 11 | 1 | 2 | 19 | 2 | 11 | 1 | 1 | 1 |
| patient08 | 19 | 7 | 3 | 3 | 17 | 1 | 7 | 6 | 29 | 5 | 2 | 38 | 6 | 16 | 0 | 2 | 1 |
| patient09 | 20 | 6 | 2 | 0 | 13 | 1 | 5 | 4 | 26 | 2 | 2 | 23 | 2 | 17 | 0 | 1 | 1 |
| patient10 | 16 | 5 | 3 | 2 | 12 | 1 | 3 | 3 | 22 | 0 | 3 | 28 | 2 | 11 | 0 | 0 | 0 |
| patient11 | 16 | 5 | 2 | 1 | 14 | 1 | 4 | 2 | 16 | 3 | 3 | 25 | 1 | 10 | 0 | 1 | 1 |
| patient12 | 17 | 6 | 2 | 2 | 11 | 3 | 0 | 2 | 12 | 1 | 2 | 35 | 2 | 12 | 1 | 0 | 1 |
| patient13 | 16 | 5 | 3 | 6 | 10 | 1 | 2 | 2 | 18 | 2 | 3 | 23 | 3 | 14 | 0 | 0 | 0 |
| patient14 | 21 | 7 | 1 | 1 | 14 | 0 | 5 | 4 | 19 | 0 | 2 | 15 | 2 | 12 | 1 | 0 | 0 |
| patient15 | 18 | 6 | 3 | 2 | 14 | 1 | 3 | 2 | 26 | 4 | 3 | 25 | 1 | 16 | 0 | 0 | 0 |
| patient16 | 17 | 6 | 5 | 4 | 12 | 3 | 2 | 4 | 13 | 3 | 2 | 35 | 11 | 14 | 1 | 1 | 1 |
| patient17 | 7 | 3 | 0 | 0 | 7 | 0 | 1 | 2 | 12 | 0 | 2 | 3 | 0 | 4 | 0 | 0 | 0 |
| patient18 | 17 | 5 | 2 | 2 | 12 | 1 | 2 | 2 | 22 | 4 | 2 | 28 | 1 | 14 | 0 | 0 | 0 |
| patient19 | 16 | 5 | 1 | 1 | 7 | 0 | 2 | 3 | 6 | 0 | 2 | 15 | 2 | 12 | 1 | 0 | 0 |
| patient20 | 17 | 7 | 3 | 3 | 11 | 1 | 2 | 2 | 13 | 2 | 3 | 24 | 2 | 15 | 0 | 1 | 1 |

patient17 has no upcoming visits by design: the identity verification was suspended three weeks before the anchor.

### Platform (admin)

| account | notifications | flagged_reviews | hidden_reviews | disputes | open_disputes | articles_pending | verification_pending | avg_review_hours | refunds | appointments_total |
|---|---|---|---|---|---|---|---|---|---|---|
| admin | 42 | 2 | 1 | 6 | 2 | 2 | 2 | 25.9 | 33 | 447 |

Refunds include the product's automatic refunds on cancellations and reschedules plus 4 admin goodwill refunds. `avg_review_hours` is the verification review time: 25.9 h, against 0.0 h on hosted.

---

## 7. Root causes: D1–D14 and new findings

| # | Root cause | Status |
|---|---|---|
| D1 | **Seed defect.** Historical prescriptions were built with `Prescription.reconstitute()` without `signatureHash`/`verificationCode`; `GET /prescriptions/:id/pdf` deliberately returns 404 when the code is null (`prescription.controller.ts`). Random `drugCatalogId` too. | **Data-fixed.** Every prescription is signed by the real `PrescriptionSignerPort` over its own `signedAt`; PDF and verify are verified through the API. Note: the public page is `/verify-prescription/[code]`, not the `/verify/*` paths the audit tried. |
| D2 | **Seed defect.** `createDemoDocument()` saves identity and licence MediaAsset rows (`image/png`) with no object behind them. | **Data-fixed.** 61 SPECIMEN PNGs uploaded only where the object was missing (I9). |
| D3 | **Code defect.** `notify-applicant-of-verification-decision.handler.ts` sets `actionUrl = '/doctor/onboarding'` for every doctor decision, including approvals, and a verified doctor gets "Access restricted" there. | **Code-fixed (readiness pass):** an approved doctor's "Verification approved" links to `/doctor`; a rejection still links to `/doctor/onboarding`. Verified end to end through the real API: a new applicant registered, uploaded a licence, applied, and was approved by the admin. The demo rows were data-fixed earlier. |
| D4 | **Not a bug.** `paymentRequired`/`feeAmount` on appointment list items are only set for a paid appointment still awaiting payment, to drive "Pay now" (`appointment-list-item-response.dto.ts`). The fee snapshot lives on the appointment and the summary. | Product decision only: expose `feeSnapshot` separately if the chart should show it. |
| D5 | **Seed defect**, made worse by repository behaviour. `PrismaPaymentTransactionRepository.save()` never persists `createdAt`, so reconstituted historical payments got seed-time dates. Upcoming visits confirmed by doctor approval had no payment at all. | **Data-fixed.** Payments are dated at booking; earnings reconcile (I4 and the API check). The repository behaviour is fine for real, live charges. |
| D6 | **Code defects** in `reporting`. (a) `verifiedDoctors = verification.approved` counts every approved case, doctors and patients alike (37 of 20 on hosted). (b) `completedSessions` counts `state = COMPLETED`, which `ConsultationSession.close()` never sets: completed sessions are `CLOSED` + `completionReason = COMPLETED`. | **Code-fixed (readiness pass):** (a) distinct doctors with an approved doctor case; (b) `state = CLOSED AND completionReason = COMPLETED`. `/admin/analytics/kpis` now reports 20 verified doctors and 353 completed sessions, matching the database. Real-PostgreSQL regression test: `admin-kpi-counters.integration.test.ts`. |
| D7 | **Data-caused.** The doctor timeline reads only already-materialised `OPEN` windows (`/scheduling/upcoming-slots`); windows are materialised lazily when a patient opens a booking page. The old seed created a few windows on the hour, off the slot grid, which the product later voided. | **Data-fixed.** The timeline materialises 14 days through `GetBookableAvailabilityUseCase`; the dashboard shows "Next: Thu, Oct 15, 10 AM" (browser-verified). |
| D8 | **Intentional.** The domain allows `cancel()`/`markRescheduled()` from `NO_SHOW`, and `appointment-list.tsx` deliberately shows both menu items for `no_show`, covered by its own tests. | Product decision. |
| D9 | **Seed defects.** Every non-psychiatry doctor drew from one `GENERAL_DIAGNOSES` pool (hence a cardiologist treating rhinitis); three template notes; "today" visits created at `now + N minutes` (off-grid times like 12:34); the old today-queue path closed sessions at arbitrary times (the 241-minute session). | **Data-fixed.** A specialty catalog (I6/I7), the real slot grid (I2), and sessions of 10–34 min (I1). |
| D10 | **Seed defect.** Every top-up visit re-randomised the patient's base weight (`randomInt(58,110)`), hence 74.5 → 64.1 kg. | **Data-fixed.** Per-patient linear trajectories with small noise (I8). |
| D11 | **Not a bug.** `BookAppointmentUseCase` has no identity-verification gate, only no-show and free-tier caps. | Pending-identity patients with visits are valid. Product decision if verification should gate booking. |
| D12 | **By design.** `MIN_RATING_COUNT_FOR_CONFIDENT_DISPLAY = 5` (frontend). | Every doctor now has ≥6 visible reviews. |
| D13 | **Code defect** (also the root cause of the stuck "Needs resolution" doctor03 ↔ Nadia Fawzy appointment). See below. | **Code-fixed (readiness pass).** See below. |
| D14 | Data. `nameAr` is handled by your uncommitted migration and seed change. Hospital addresses were all seeded as "Cairo, Egypt". | **Data-fixed.** The seed now writes real addresses, and the timeline corrects the old placeholder only. |

### D13 in detail: the stale-session sweeper closes future appointments' sessions

`StaleConsultationSessionReconciliationService` (every 15 min) calls `findStale(updatedBefore)`, which selects **every** `WAITING_ROOM`/`IN_PROGRESS` session whose `updatedAt` is more than 4 hours old. It does not check the appointment's time. A session is created in `WAITING_ROOM` when a booking is confirmed and nothing touches it until the visit. So for **any appointment booked more than 4 hours ahead**:

1. the sweeper closes its session as `INTERRUPTED_TECHNICAL`, and "Consultation interrupted" goes to both parties, before the visit has even happened;
2. the doctor can no longer start the consultation (start requires `WAITING_ROOM`);
3. the no-show sweep only looks at `WAITING_ROOM` sessions, so after the slot passes the appointment stays `CONFIRMED` forever. That is the "Needs resolution" item on the hosted demo.

**Evidence:** at 15:21 UTC on `orivex_demo`, the sweeper's own query matched 48 sessions, and all 48 belonged to future appointments (the earliest tomorrow at 08:10 UTC). That is every upcoming confirmed visit.

The local backend was then left running. At **15:36:25 UTC**, exactly 15 minutes after boot (the first sweep), it closed **44 upcoming confirmed sessions plus 2 reschedule originals** as `INTERRUPTED_TECHNICAL`; the earliest was for a visit two days later. It also sent **96 "Consultation interrupted" notifications**, two per session, for consultations that had not happened. That reproduces the hosted D13 symptoms exactly.

**Fix (applied in the readiness pass):**

- **The query.** `findStale` now also requires `appointment.scheduledAt < cutoff`, so only a session whose slot started more than 4 hours ago, and that nothing has touched for 4 hours, is reconciled. An upcoming appointment's session is never stale.
- **The notification.** `NotifyOfConsultationInterruptedHandler` stays silent when the appointment was cancelled, rescheduled or expired, because nobody's consultation was interrupted. A no-show still notifies both sides.
- **The demo.** The planner mirrors this: those sessions are closed at slot + 4 h with no notification.
- **Tests.** Regression tests run on real PostgreSQL (`prisma-consultation-session.repository.integration.test.ts`) and in the handler test. They cover an upcoming appointment, an active consultation, a genuinely stale one, a completed one, and cancelled future and past ones.
- **Live check.** The backend ran on `orivex_demo` through two sweeps (11:35 and 11:50 UTC on 2026-10-16). No session was closed, the 47 upcoming sessions stayed open, and no "Consultation interrupted" notification was created.

Cancelling a confirmed appointment still leaves its session in `WAITING_ROOM` until the sweep closes it silently. **Since the final fix pass, that leftover session can no longer be started or joined.** `StartConsultationUseCase` and `MintConsultationRoomTokenUseCase` both call `Appointment.assertConsultationAllowed()`, which accepts only a `Confirmed` appointment; the API answers 422. This is verified live on doctor03's superseded Oct 22 appointment and on a no-show.

### Other findings, reported and not changed

- **Pending requests can be re-offered.** A free request leaves its slot `HELD` with a 15-minute hold, and `GetBookableAvailabilityUseCase` returns "`Held` with a lapsed hold" as bookable. So a pending request's slot can be offered to, and held by, a second patient. Approval itself works, because `ConfirmAvailabilityWindowUseCase` re-holds the slot. Likely bug; not confirmed end-to-end.
- **A `RESCHEDULED` appointment is treated as upcoming (frontend, and the doctor-side backend mapper).** In the backend, `RESCHEDULED` is the status of the old, superseded appointment; the new booking is a separate row. But `PATIENT_UPCOMING_STATUSES` (`features/patient/lib/upcoming-appointments.ts`) includes `'rescheduled'`. As a result, every past reschedule original shows forever under "Needs your attention → Awaiting an update" on the patient dashboard, and every future one inflates the "Upcoming appointments" count (patient03 shows 5 instead of 4). The backend has the same assumption on the doctor side: `toUpcomingWorkStatus` maps `Rescheduled` to `'upcoming'`, and the dashboard's "consultations today" counts it. This would affect every real user who reschedules. **Fixed in the readiness pass**, in the backend first and the frontend to match; nothing is hidden in the UI:

- **Patient dashboard.** The patient dashboard summary and the frontend's upcoming and needs-attention logic now use `requested`/`confirmed` only.
- **Doctor side.** Upcoming work, "consultations today" and a patient's next appointment exclude `Rescheduled` (the mapper maps it to `'cancelled'`).
- **Admin analytics.** The "upcoming appointments" counts, platform-wide and per doctor, no longer count it.
- **Verified through the API.** For patient03, the original is in history and not in upcoming; the replacement is upcoming; the count is 3, which matches the database. For doctor03, upcoming work shows only the replacement, and the patient list's next appointment is the new time.
- **Left as is.** Doctor Reports' "Upcoming" tile still includes rescheduled rows. That is a documented design: the tiles partition every row, and the helper text reads "Confirmed/rescheduled". Changing it is a product decision.
- **Session refresh is likely to sign users out on the hosted setup.** `POST /auth/refresh` is limited to 5 per minute per IP, and the frontend proxies `/auth/*` through its own origin (the Next rewrite). With `app.set('trust proxy', 1)`, the backend probably sees the proxy's address (Vercel) rather than the user's, so every user's refresh would share one 5-per-minute bucket. Locally, five full page loads within a minute already sign a user out ("Sign in required"); this was observed during the browser run. **Proven locally in the readiness pass (not changed):**

- **Shared bucket.** Six `POST /auth/refresh` calls carrying `X-Forwarded-For: <different client>, 203.0.113.7` returned 401 ×5 and then 429. The same client behind six different last hops got 401 ×6.
- **Root cause.** `ThrottlerGuard`'s default tracker is `req.ip`. Under `trust proxy 1` that is the last hop before Render, which for the rewritten `/auth/*` calls is Vercel's egress, not the user.
- **Scope.** The storage is in-memory, and the backend is a single free-plan Render instance, so the bucket is per route per egress IP across all users.
- **Refresh, fixed in the final pass.** A second named throttler (`refreshToken`, opt-in, declared in `platform/http/throttlers.ts`) limits `POST /auth/refresh` to 5/min per refresh token (keyed on its SHA-256), or per IP when there is no cookie. The API-wide `default` 100/min per IP still applies. Tests are in `authentication-throttling.integration.test.ts`.
- **Login, unchanged.** Keying login on email + IP would let one address try unlimited accounts, because per-IP spraying protection would rise from 5/min to the 100/min ceiling. A per-IP cap that stays at 5/min keeps the shared Vercel bucket. Fixing both needs a trustworthy client IP for proxied requests, for example an authenticated proxy hop, which is an architectural decision.
- **Waitlist entries named no doctor (seed gap, fixed in the readiness pass).**
  - **Cause.** Five of the six seeded entries were for doctors the patient had never booked. The only way to join a waitlist, `WaitlistPanel`, offers doctors from the patient's own appointment history and resolves names from that history, so these entries could not have been created in the product, and they showed as "Doctor".
  - **Fix.** The planner now keeps the catalog's doctor when the patient had already booked them; otherwise it uses the doctor they had booked most often.
  - **Guard.** Invariant I11 now checks this.
- **A patient's app shell calls `GET /doctors/me` on every page load** and gets a 404, which shows up as a console error. Harmless, but noisy.
- **The waitlist matcher fires on every availability change.** A `WAITING` entry is therefore only stable while no slot can open in its range. Demo `WAITING` entries are ranged on the doctor's leave day.
- **hospital_admin has no workspace.** `/dashboard` renders a generic page for that role (by design, per `dashboard/page.tsx`), so nothing role-specific is seeded.

---

## 8. Limitations and product decisions

1. **D13, D3, D6 and the reschedule classification** were fixed in the readiness pass. The cancelled-appointment start/join guard and per-token refresh throttling were fixed in the final pass. **Login throttling** still shares a bucket behind the Vercel proxy and needs an architectural decision (see §7).
2. **Specialty skew.** 11 of 20 doctors are psychiatrists. The audit's targets also conflict arithmetically: 20 doctors × ≥12 patients needs ≥240 doctor–patient pairs, but 20 patients × 3–8 doctors gives at most 160. The plan therefore gives each specialist 3–10 distinct patients (doctor03 has 16), and some patients see 3–4 psychiatrists (second opinions or a change of doctor). Rebalancing specialties would change account identity, so it's your call.
3. **Paediatrics.** All demo patients are adults and there is no dependant or guardian model. doctor15's visits are **parent-guidance consultations about the patient's child**: notes only, with no diagnosis, prescription or vitals written onto the parent's record.
4. **Labs & imaging tab.** It reads `LAB_RESULT`/`RADIOLOGY_RESULT` health-graph nodes. `RecordDiagnosisUseCase` supports them, but no endpoint creates them, so they are not seeded. Lab results exist as uploaded lab-report PDFs. Approve seeding if wanted.
5. **AI Copilot history.** Not seeded (see §2). Capture it live in a local consultation instead.
6. **Doctor verification states.** All 20 demo doctors practise, so they are all approved; doctor11 has a rejected → resubmitted → approved history. Showing pending or rejected doctor applications needs extra demo accounts that don't practise; proposed, not created.
7. **Volume.** 443 appointments, against the audit's 650–800, because per-patient volumes stay realistic (patient03 ≈ 30). doctor notification counts (4–24) are limited by which events the product notifies doctors about (free requests, same-day confirmations, patient cancellations, reviews, disputes); no new notification types were invented.
8. **Today's queue depends on the anchor's time of day.** At the anchor used here (18:15 Cairo, after doctor03's hours) the three "later today" pins could not be placed. Re-anchor in the morning before screenshots (see README).
9. **Audit log and login history** contain only real actions, as required. The login rows from the API and browser runs are genuine.
10. **The hosted database was not touched.** Running there needs your explicit approval (`DEMO_REMOTE_APPROVED=yes` plus `--allow-remote`), and the existing legacy rows there would first need a scoped reconciliation, which is not built.
11. **`patient21`–`patient23`** are not on the allow-list (not asked).

---

## 9. Commands

```bash
# from apps/backend
npm run seed                                       # identities + timeline (local DB only)
npm run demo:seed                                  # timeline only, anchored at now
npm run demo:seed -- --anchor "2026-10-14 10:30"   # morning anchor (Cairo) for screenshots
npm run demo:dry-run                               # plan + per-table diff, writes nothing
npm run demo:check                                 # invariant suite
npm run demo:verify-api                            # needs a running backend
npm run demo:audit-relations                       # doctor <-> patient record correspondence, needs a running backend

# from apps/frontend (backend on :4000, `next build && next start` on :3000)
DEMO_IDS='{"patient03":"…","doctor03":"…","pendingCase":"…","rxCode":"…"}' node tests/demo-data/walkthrough.mjs all
```
