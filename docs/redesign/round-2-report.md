# ORIVEX Redesign — Fix Pass (Round 2) Report

Reviewed size: 1046×612 with the sidebar open (~780px of content). All work is frontend-only: no API, schema or OpenAPI change.

## Root causes and what they fixed

| Root cause | Fix | Symptoms resolved |
|---|---|---|
| `sr-only` (position: absolute) had no positioned ancestor inside the scroll area | `<main>` is `relative` (plus `DateBlock` and the chart wrapper) | Patient Overview document 1427px and Doctor Reports 1101px on a 612px viewport: now exactly the viewport height on every route |
| Columns chosen by viewport width, not the width the content gets | `<main>` is the size container (`@container`); two named sizes `@pane` (640px) and `@wide` (960px); every in-app content grid moved off `sm/md/lg/xl` | Doctor profile main column collapsing to 0px, Browse Doctors truncation ("Ophthalmo…", "View…", "Search by sp"), doctor overview row squeeze, Doctor Patients table scrolling its actions off-screen |
| Large figures allowed to wrap | `MetricStat` values are one line, sized `clamp()` against their own width (`cqi`), qualifiers moved to the caption; the metric-xl hero never sits in a column under ~300px | "EGP 969. / 00", "380 EGP / consultatio / n" |

## Files changed, by section

- **P0** (`2d0a3ee`): `shared/ui/layout/content.tsx`, `shared/ui/date-block.tsx`, `features/doctor/components/reports/reports-trend-chart.tsx`, `tests/e2e/shell-layout-integrity.spec.ts` (new regression check), `features/doctor/components/profile/doctor-profile-view.tsx`, `app/[locale]/(protected)/patient/doctors/[id]/page.tsx`, `features/doctor/components/doctor-booking-card.tsx`, `shared/ui/metric-stat.tsx`, `features/payment/components/doctor-earnings-summary.tsx`, `features/landing/components/hero-section.tsx`, `features/doctor/components/patients/patients-list.tsx`, `features/notifications/lib/notification-copy.ts`, `features/notifications/hooks/use-localized-notification.ts`, `features/shell/components/notification-panel.tsx`, `features/doctor/components/recent-activity.tsx`, `shared/ui/layout/timeline-card.tsx`, `features/doctor/components/dashboard-hero.tsx`, `shared/ui/layout/widget-container.tsx`.
- **P1 layout** (`8791532`): `design-system/tokens/scales.css`, `shared/ui/layout/page.tsx` (`DashboardGrid`), 24 grid call sites (directory, specialties, records, prescriptions, patient profile, schedule, messaging, knowledge, booking time grid, consultation container, analytics panels, skeletons), `todays-progress`, `upcoming-availability`, `patient-queue-mini`.
- **P1 consistency** (`5245797`): `shared/ui/status-badge.tsx`, `records-summary`, `prescription-summary-cards`, `doctor/schedule/page.tsx`, `shared/ui/date-range-picker.tsx` (new, shared by Reports and Earnings), `shared/ui/filter-tabs.tsx`, `landing/faq-section.tsx`, `design-system/tokens/colors.css` + `theme-dark.css`, `shared/lib/specialty-palette.ts` (+ test), `appointment-list.tsx`, `appointment-overflow-menu.tsx` (new), `reschedule-action.tsx`, `cancel-action.tsx`.
- **P1 booking** (`1737eaa`): `features/scheduling/components/booking-flow.tsx`.
- **P1 doctor overview** (`76d7372`, `adaa241`): `welcome-header.tsx`, `design-system/typography.tsx`, `today-timeline.tsx`, `dashboard-hero.tsx`.
- **P1 earnings and reports** (`97ed812`): `doctor-earnings-summary.tsx`, `shared/ui/charts/bar-chart.tsx`, `reports-trend-chart.tsx`.
- **P1 patient chart** (`0a040b7`): `doctor/patients/[id]/page.tsx`, `sticky-patient-bar.tsx`, `shared/ui/health/vital-card.tsx`.
- **P1 landing** (`89df3a8`): `shared/ui/illustrations/{scenes,illustration}.tsx`, `for-doctors-section`, `back-to-top-button`, `for-patients-section`, `core-features-section`, `security-trust-section`, `specialties-section`, `doctor/components/doctor-card.tsx`.
- **P1 RTL** (`99c6ede`): `vital-card.tsx`, `health-snapshot-card.tsx`, `consultation-workspace-action.tsx`, `doctor-consultation-summary-action.tsx`, `admin-payments-table.tsx`, `needs-attention-card.tsx`.
- New i18n keys (en + ar) for every new string: `ds.dateRange.*`, `shell.notifications.{audienceClinical,audiencePersonal,personalTag,audienceFilter}`, `doctor.dashboard.activity.viewAll`, `doctor.profile.hero.perConsultation`, `doctor.patients.patientStatus.new`, `doctor.patients.actions.openChartFor`, `bookingUi.slotPrice`, `doctor.earnings.{chartNote,chartNoteNoRate,learnMore,detailsToggle}`.

## Decisions and rules

- **Patient status (Doctor › Patients)**, derived from existing list fields only:
  - **New**: no completed visit with this doctor yet (`lastVisitAt` absent), whether or not an appointment is booked.
  - **Active**: a completed visit, plus an upcoming appointment or a completed visit within the last 90 days.
  - **Inactive**: last completed visit more than 90 days ago and nothing booked.
  The old "Follow up" and "Completed" chips are gone. A follow-up recommendation is still on the chart, just not a status here.
- **Patient-side notifications on a doctor account**: the API has no recipient-role field, but every notification's `actionUrl` is role-scoped (`/patient/...` or `/doctor/...`). Those under `/patient` are "Personal":
  - kept out of the doctor's Recent Activity;
  - shown under a Clinical / Personal filter in the bell (only when any exist);
  - tagged "Personal" on the full Notifications page.
  The "As a patient:" prefix is removed. No API change was needed.
- **Status labels**: `StatusBadge` now always reads `ds.status.<status>` (every status has a shared label in both locales); a caller's `label` is only a fallback for an unknown status. So "Awaiting approval" is the one label everywhere.
- **Hero card (landing)**: sits fully inside the photo, bottom-right, from `sm`. It uses physical `right` on purpose: the photo is not mirrored in Arabic and its call controls sit bottom-left, so `end` would cover them in RTL. Below `sm` it follows the photo.
- **Appointment rows**: one primary action plus a ⋯ menu (Add to calendar, Reschedule, Cancel). Cancel still opens its confirmation. There is no separate "View": the list row is already the full appointment (no detail page exists).
- **Specialty hues**: 7 is now green and 9 is fuchsia. Lime is reserved for `--pulse` and amber means `warning`. Internal Medicine and Dermatology have fixed hues, so the nine seeded specialties get nine different hues (tested).
- **Earnings chart**: at least the last six months, with zero months shown. "All time" starts at the first month with data instead of years of empty bars.
- **Reports volume**: bars per day up to a month, per week up to ~6 months, per month beyond, summed from the API's own daily counts.

## Deferred / not done

- Doctor overview quick actions still wrap onto a second line at ~780px (four equal secondary buttons). They wrap evenly, but they are not a single line at that width.
- The Doctor Patients filter row wraps its sort select to a second line at ~780px.
- AR "احجز" at reduced opacity: no reveal animation leaves anything below full opacity (checked by computed opacity after scrolling, EN/AR, light/dark). The only dimmed Book button is the intentionally disabled one shown to a visitor who is not signed in as a patient.

## Verification

- **Checks:** `tsc` clean; `eslint` 0 errors (12 pre-existing warnings); `vitest` all green; `next build` passes.
- **New Playwright regression spec** (`tests/e2e/shell-layout-integrity.spec.ts`): on every patient and doctor route, the document is never taller than the viewport and `<main>` never scrolls sideways. It runs at 1046×612 and 390×844, in EN and AR. All 8 cases pass (3.2 min, one worker).
- **Browser matrix** (production build, mock API): 1046×612, 390×844, 768×1024 and 1440×900 × EN/AR × light/dark.
  - Landing.
  - Patient: Overview, Appointments (both tabs), Browse Doctors, Doctor profile, Booking up to Review (not confirmed), Records, Health.
  - Doctor: Overview, Appointments, Patients, Patient chart, Schedule, Earnings, Reports, Profile.
  - Each route asserts: document height equals the viewport, no horizontal overflow in `main` (or the page), no wrapped or clipped `[data-numeric]` value, no enabled control left below full opacity (after scrolling the landing through), and no page errors.
  - **272 of 272 checks pass.**
- **Found and fixed during verification:**
  - A sentence used as a stat value (Records "Last visit" in Arabic at 390px).
  - The blood-pressure value wrapping in narrow vital tiles.
  - Timeline hour labels wrapping.
  - The profile hero initials counting "Dr.".
  - The doctor-overview Patients list overflowing at 390px in Arabic (`TimelineCard` could not shrink).
- **Mock data:** in mock mode every link in the doctor's seeded patient list opened "Patient not found", because the list and the patient store use different ids. The mock now builds a minimal chart from the list entry, and it returns `allergiesStatus` like the real API. The real backend was never affected.
