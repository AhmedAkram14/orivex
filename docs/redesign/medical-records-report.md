# ORIVEX — Medical Records: one place per kind of record (`/[locale]/patient/records`)

**Scope:** the Records page, now split into tabs. It reads the same data as before plus two sources you approved (one new endpoint, one existing endpoint read for the first time), and uses the same upload flow.

## Findings you asked for

### Why "Last visit" said Sep 24 when the newest visit was Aug 17

The two values came from different records:

| | Source | What counts as a visit |
|---|---|---|
| Summary "Last visit" (before) | `GET /patients/me/dashboard-summary` → `lastVisitAt` = the most recent **completed appointment's scheduled time** (`PatientDashboardController.computeLastVisitAt`) | Any completed appointment |
| Timeline visits | `GET /patients/me/medical-records` → one entry per **clinical note**, dated when the note was written (`findVisitEntries`) | Only appointments where the doctor wrote a note |

An appointment that was completed on Sep 24 with no note counts as a visit for the summary but never appears in the timeline.

**Fix (UI only):** "Last visit" now uses the newest visit record from the Visits list, so it always matches what the patient can open. The Patient Overview's own stat strip still shows the appointment-based "Last visit". That's a different card on a different page, unchanged here.

### Is there an endpoint that lists uploaded documents?

There wasn't one for patients. Doctors could already list a patient's documents (`GET /doctor/patients/{id}/documents`). With your approval, I added **`GET /patients/me/documents`**:
- **What it returns:** the caller's own confirmed `clinical_attachment` / `lab_report` assets, newest first, each with a short-lived signed download URL.
- **Shared with the doctor endpoint:** the same use case (`ListMediaAssetsForOwnerUseCase`), the same item shape and the same purposes.
- **Never included:** identity-verification documents and unconfirmed uploads.
- **Scope:** read-only, scoped by the JWT. The route lives on `PatientDashboardController`, with 3 new integration tests (18/18 pass) and a row in `docs/11-api-contracts.md`.

What the data does **not** have, so the page doesn't show it:
- a **file name**: each document is named by type ("Medical document" / "Lab report"), format and date;
- **who uploaded it**;
- a **delete** endpoint: no Delete button.

### Labs & imaging

As you approved, results come from the patient's own health graph (`GET /patients/{id}/health-graph`, already readable by the patient): the `lab_result` and `radiology_result` nodes. That's a new read on an existing endpoint, with no API change.

A node is only a **text description, a date and a source**. It has no value, reference range or image, so there are no range bars and no thumbnails. Rows are text. Range bars and image previews need a structured results API.

## Other gaps in the data (reported, not invented)

| Brief asked for | What the data has | What the page does |
|---|---|---|
| Active / Resolved conditions | No status on condition nodes | One list, by recorded date; the card and strip say "Conditions", not "Active conditions" |
| Link from a condition to the visit that recorded it | Not in the records response (the domain node has a consultation session id, but it isn't exposed) | No link |
| Visit type | Every visit's title is the fixed string "Clinical visit" | Not shown |
| Doctor avatar on a visit | Name only, no photo URL | Initials avatar (`xs`) |
| Real upload size limit | The API states none | Types only: PDF, JPG or PNG |

## Before → after

| | Before | After |
|---|---|---|
| Layout | 6 sections stacked in one column, about 2,000px at 1150 wide | Header, summary, then 5 tabs (Overview · Visits · Conditions · Documents · Labs & imaging), each with a count |
| Header | Title only | Title, plus **Upload document** (secondary), which opens a dialog from any tab |
| Summary | Total visits · Conditions · Last visit (**Sep 24**, from appointments) · Active prescriptions | Visits · Conditions · Documents · Last visit (**Aug 17**, the newest visit record). Each value equals its tab's count |
| Prescriptions | A "Recent Prescriptions" block that repeated the Prescriptions page | Gone from this page. A quiet "Medications → Prescriptions" link sits beside the tabs |
| Conditions | Shown in the timeline **and again** in their own block | Once per view: Overview shows up to 3; the Conditions tab shows them all |
| Visits | Mixed with conditions; full paragraphs, so 4 entries filled a screen | Visits only, grouped by month (the month label stays visible while you scroll). Each visit collapses to date, doctor and one line (the doctor's assessment); opening it shows the note in its four parts. Expand all / Collapse all; a doctor filter when more than one doctor |
| Upload | A button between read-only blocks, and no list of files | The header button, plus the doctor application's upload tile at the start of the Documents grid (drop, browse or phone camera, progress with Cancel, type error with Retry, the verification gate when needed). The new file appears in Documents and in Overview › Recent documents without a reload |
| Labs & imaging | Two permanent placeholders at the bottom | Their own tab with two cards: real rows when results exist, otherwise an empty state ("Results your doctor orders will appear here.") |
| Headings | h1 → h3 (axe `heading-order` failed on every account) | h1, one h2 per tab panel, h3 for cards and month labels (axe clean) |

**Type colours.** Each record type has one glyph and one tint wherever it appears: tabs, Overview cards and rows. These are existing `*-subtle` tokens, with their dark-theme values:
- visits: info, stethoscope;
- conditions: warning, heart;
- documents: primary, file;
- results: success, flask.

**URL.** The selected tab is in the URL as `?tab=` (Overview when there isn't one). Changing tabs adds a history entry, so Back steps through them.
- `?highlight=<id>` (from the dashboard and from "Read full note") opens the tab that holds that record and rings it. A visit opens with its note expanded.
- The dashboard's Recent medical records rows and Health snapshot's "Conditions on record" now link straight to their tab.

**Overview.** Two columns from 1024px (the same viewport breakpoint as the Patient Overview). Cards in a row stretch to one height, with `--card-gap` both ways. Each record appears at most once.

**Phones.** The tab bar scrolls sideways and keeps the active tab in view; the page itself never scrolls sideways. Overview cards stack, and visits use a narrower date column. In Arabic, tabs, the timeline and date blocks mirror. Doctor names, dates and Latin data are isolated (`<bdi>` / `dir="auto"`).

Screenshots are in `medical-records/before/` and `medical-records/after/`, named `{data|new}-{locale}-{theme}-{width}-{tab}.png`.

## Implementation

- **Backend:** `GET /patients/me/documents`, in `PatientDashboardController` plus an integration test.
- **Frontend API:**
  - `getDocuments` and `getHealthGraph`;
  - the `PatientDocument` and `HealthGraphNode` types;
  - hooks `usePatientDocuments` and `usePatientHealthResults`.
- **`features/patient/components/records/`, replaced:**
  - `record-kinds` (glyph and tint per type, visit-note parsing);
  - `record-row`;
  - `records-summary`;
  - `records-overview`;
  - `visits-timeline`;
  - `records-panels` (conditions, documents, results);
  - `document-list`;
  - `document-upload-tile` with the `use-document-upload` hook;
  - `upload-document-dialog`.
- **Removed:** the old timeline, conditions panel, recent-prescriptions panel, upload button and lab/imaging placeholders. The shared `RecordTimelineEntry` keeps its own stories and tests but is no longer used by this page.
- **Mocks:**
  - `GET /patients/me/documents`;
  - a patient's confirmed clinical upload joins that list;
  - the patient's own `GET /patients/{id}/health-graph`;
  - test-only result nodes.

## Verification

- Backend: typecheck, lint, and `patient-dashboard.controller` integration tests 18/18 pass.
- Frontend: typecheck, lint and the full unit suite pass. The new page test (11 cases) covers:
  - summary = tab counts, and Last visit = the newest visit record;
  - no record twice on Overview;
  - choosing a tab pushes `?tab=`;
  - month groups, collapsed notes, Expand all and the doctor filter;
  - `?highlight=` opening its tab and note;
  - conditions as one list;
  - results from the health graph;
  - an upload appearing without a reload;
  - the type error;
  - the identity-verification gate.
- Browser (production build, every API call answered in the browser):
  - Sizes and states: 1440×900, 1150×674 and 390×844, in EN/AR and light/dark, for an account with records and a new account.
  - Every tab: in the URL, Back steps back through them, no record twice, no sideways scroll.
  - Upload from the header button: Documents count 2 → 3, and the file shows in Overview › Recent documents without a reload.
  - axe: clean on Overview and Visits at 1440 and 390.
- `shell-layout-integrity.spec.ts` (it includes `/patient/records`): **not run yet for this change.** It needs a mock-mode production build, and two attempts ran out of memory on this machine (under 1 GB of RAM free). It is the next thing to run once memory is freed.
