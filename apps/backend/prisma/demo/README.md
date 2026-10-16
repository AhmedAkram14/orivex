# Demo timeline (`prisma/demo/`)

Populates every demo account with nine months of coherent, specialty-correct
history plus today's queue and the next 30 days, so every screen of the
product has real data behind it. It runs as stage 2 of `npm run seed` and on
its own.

The data flows through the real architecture: rows in PostgreSQL are read by
the existing NestJS use cases and API endpoints, and the existing frontend
hooks render them. No UI code, mock layer or API response is involved.

## Commands (from `apps/backend`)

| Command | What it does |
|---|---|
| `npm run seed` | Identity seed (accounts, profiles, hours, verification) and then the timeline |
| `npm run demo:seed` | Timeline only. The anchor defaults to the current time floored to 5 minutes |
| `npm run demo:seed -- --anchor "2026-10-14 11:00"` | Reproducible run, anchored at a Cairo date/time (or pass an ISO instant) |
| `npm run demo:dry-run` | Prints the plan and the per-table create/update/prune counts and writes nothing |
| `npm run demo:check` | Runs the invariant suite only (15 consistency rules plus coverage floors) |
| `npm run demo:verify-api` | API verification against a running backend (`API_BASE_URL`, default `http://localhost:4000`): all demo accounts plus authorisation-negative checks |
| `npm run demo:audit-relations` | Relationship audit against a running backend: for doctor03 ↔ patient03 and the four other busiest pairs, checks that the doctor's API, the patient's API and the database show the same appointments, payments, SOAP notes, prescriptions (PDF and public verification), documents, messages, notifications and reviews |
| `node tests/demo-data/walkthrough.mjs [all\|reference\|others\|public\|doctor03 ...]` (in `apps/frontend`) | Browser walkthrough with Playwright: every screen and tab, logging each empty state it shows, with screenshots in `apps/frontend/test-results/demo-data/` |

`DEMO_ANCHOR_DATE` works like `--anchor`. Add `DEMO_DEBUG=1` to log every field the writer changes.

### Refreshing the demo before a screenshot session

The data is relative to the anchor. Re-run `npm run demo:seed` (or pass a
morning anchor such as `--anchor "2026-10-14 10:30"`, then browse that
morning) right before taking screenshots:

- doctor03's queue for the anchor day contains two visits completed earlier
  that day, one starting within two hours, and two later that day. These only
  fit when the anchor falls early in his working day (Mon–Thu 10:00–18:00).
  A late anchor logs a warning and skips the pins that no longer fit.
- Re-anchoring moves the whole timeline in place: the same rows keep the same
  ids, and nothing is duplicated.

## Safety

- **Allow-list.** Only `doctor01–20`, `patient01–20`, `admin` and
  `hospitaladmin` (`@orivex.dev`) are read or written. Every planned row is
  scope-checked before the first write, and one out-of-scope reference aborts
  the run.
- **Local only.** Any `DATABASE_URL` that is not localhost is refused.
  `npm run seed` skips the timeline stage on a remote database unless
  `DEMO_REMOTE_APPROVED=yes` is set. The standalone runner also requires
  `--allow-remote`. The hosted database holds real users, so a remote run
  needs the owner's explicit approval first.
- **Rows owned by the timeline** get UUIDv5 ids derived from a semantic key.
  The writer only updates or prunes rows with those ids. Rows created by real
  usage (UUIDv4) are never modified or deleted. The one exception is a small
  set of scoped re-timings of rows the identity seed creates (signup dates,
  verification review times, seed-time notifications).
- **No external calls.** The timeline makes no Stripe, LiveKit, email or AI
  provider calls. Payment rows carry synthetic `pi_demo_seed_…` references.
  Audit-log and login-history rows are never fabricated; they only come from
  real actions.
- Every generated file is visibly stamped `SYNTHETIC DEMO DOCUMENT`, and
  identity images are stamped `SPECIMEN - NOT A REAL ID`.

## How the data is built

| File | Role |
|---|---|
| `core.ts` | Deterministic ids, seeded RNG, Cairo calendar, anchor parsing, allow-list, database guard |
| `catalog/clinical.ts` | Specialty catalog: conditions (ICD-11 code in the text where well known), SOAP fragments by visit phase, regimens with allergy classes and alternatives, lab tests, vitals relevance |
| `catalog/stories.ts` | One hand-written care story per patient, each doctor's specialty focus for top-ups, coverage floors, rating means |
| `catalog/content.ts` | Reviews, message scripts, knowledge articles (EN and AR), Health Passport, profile enrichment, disputes, waitlist |
| `plan/` | Pure planner, with no I/O: slot placement on the real grid, lifecycle, clinical content, notifications |
| `files.ts` | Synthetic PDFs (pdfkit) and PNGs (built-in encoder) |
| `apply.ts` | Writer: scope check, create/update only what changed, prune stale timeline rows, upload files |
| `checks.ts` | Invariant suite |
| `run.ts` | Entry point |

Where real code exists, the derived values come from it:

- **Prescriptions** are signed by the real `PrescriptionSignerPort` (HMAC)
  over each prescription's own historical `signedAt`. Every prescription
  therefore has a working verification code and PDF.
- **Visit times** come from SchedulingModule's own
  `generateCandidateSlotsForDate`.
- **Bookable slots** for the next 14 days are materialised through
  `GetBookableAvailabilityUseCase`.
- **Notifications** reproduce the wording, recipients, link rules and
  conditions of the real handlers, kept within a 75-day retention window.

Historical rows can't go through the write-path commands: the commands stamp
the current time on every write, and `AvailabilityWindow.define()` rejects a
start time in the past (both correct production rules). The repositories
either drop `createdAt` or are create-only. For these reasons the timeline
writes with Prisma using deterministic ids.
