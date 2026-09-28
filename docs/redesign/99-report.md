# ORIVEX Visual Redesign — Final Report

Direction: **Calm clinic, living pulse.** Commits (no push): `c0dcf1b` P1 · `f8e3d0a` P2 · `f755043` P3 · `b62c60d` P4 · `33167e1` P5 · `f8f67f0` P6 · `a190fc0` P7 · `a18e73d` P8 · P9 (this report + docs).

## Phases → scope
1. **P0 fixes** — session bootstrap retries only transient errors; protected routes render a shell skeleton instead of "Sign in required"; single scroll owner in the shell; Reports chart blank-render bug; time-aware "awaiting outcome" state.
2. **Tokens** — colors (light/dark), type (Outfit + IBM Plex), density/radius/elevation/motion scales, `cn()` custom-size support, focus rule moved into `@layer base`.
3. **Primitives** — see below; all call sites migrated.
4. **Shell** — grouped patient nav, pulse active state, bottom nav, help card, user menu, command palette, notification bell/panel.
5. **Doctor** — dashboard hero + timeline, queue, appointments, patients, reports, schedule calendar, earnings, profile, settings, knowledge composer, localized notification copy.
6. **Patient** — overview, appointments (calendar + list), doctor profile/booking card, booking flow rewrite, records timeline, prescriptions, messaging, knowledge feed, profile/intake forms (TagInput, Health Passport accordion).
7. **Public/auth** — landing sections on live data (no baked fake data), specialties plural fix, footer, auth brand panel (ink + PulseLine, localized wordmark), removed unsubstantiated "thousands of professionals" claim.
8. **Polish** — 200ms popover/dropdown fades, tab crossfade, bell tilt; logical properties (`ms/me/ps/pe/start/end`) in touched files; radius/shadow arbitrary values removed; overflow fixes (landing hero blob, FAQ decoration, table sr-only escape).
9. **Verification** — below.

## Primitives
- **Created:** PulseLine, DateBlock, HeroSurface, InsetRow, MetricStat, VitalCard, EmptyState + illustrations, ErrorState, ConfirmDialog, skeleton set, SegmentedControl, TagInput, SpecialtyChip/IconTile, specialty palette, vital reference ranges.
- **Consolidated:** one `StatusBadge` + `STATUS_TONE` map (replaces per-feature badges), Button (3 heights), Avatar, Card, Toast.
- **Deleted/replaced:** duplicate status badges, ad-hoc empty/error markup, inline stat tiles, baked-image fake landing panels.

## Tokens changed
Re-pointed existing `--color-*`; added `pulse*`, `care*`, `warm-1/2`, `surface-2`, `spec-1..9`, density vars, five radii, `--animate-*` set (fade-in, pop-in, slide-in-end, bell-tilt, pulse-*).

## Bugs fixed
Blank Reports chart; session-bootstrap flake on 5xx/408/429; Browse Doctors card overflow; unlayered focus rule overriding `outline-none`; tailwind-merge dropping custom type sizes; Arabic notification strings; "1 doctors" plural; landing/table/FAQ horizontal overflow; notification copy in wrong locale; landing typos/fabricated data.

## Verification
- `tsc --noEmit`: clean. `eslint`: 0 errors (12 pre-existing warnings). `next build` (mock mode): passes.
- `vitest`: 847/850. Failures: `booking-flow` "inline payment step for a Paid slot" (**pre-existing**, fails on untouched baseline); two others (`verification-case-detail`, `book/page`) time out only under full-suite load and pass in isolation.
- Overflow: no horizontal scroll at 390/768/1150/1440, EN + AR, for landing, login, register, patient and doctor routes (390/768 sweep of patient/doctor main routes).
- Screenshots (light/dark, EN/AR, 390/768/1440): [after/](after/). Before-shots kept in the scratchpad baseline only, not committed.
- The Paid-slot booking test is fixed: it depended on the weekday (the seeded doctor's weekend is Free); it now sets Paid pricing explicitly.
- **Not run:** Lighthouse a11y scores (≥95 target) and a real-backend hard-reload of every authenticated route — mock mode only. Contrast was checked via the token script, not per-page axe.

## Deferred
- Auth "Sign in required" flash could not be reproduced in mock mode; fix targets transient session errors — verify against production.
- Tabs use a crossfade, not a sliding indicator.
- Tables→cards below 768 and KPI snap-scroll only where already present; doctor calendar default view under 768 unchanged.
- No "None known" allergy chip (doctor banner treats any non-empty string as an allergy).
- No dose-schedule dots; admin got token/primitive-level changes only.
- Hero photo retains its baked English overlay, masked with live translated labels.

## Open product questions

2. Free-vs-fee display rules.
3. Clinical reference-range source — BP 90–120/60–80, glucose 70–200 are pre-existing constants; **need clinical review**.
4. Help-card destination (currently Knowledge Center per role, else mailto).
5. Is the patient profile-completion gate mandatory? (kept as mandatory redirect to `/patient/intake`)
6. Cancel hidden where not permitted, and search placeholder wording — decisions made, confirm.

## Product decisions applied (post-report)
1. **Doctor contact:** email/phone no longer shown to patients; the profile says to use ORIVEX Messages. A doctor-published "Clinic phone" field is not built (needs an API change).
2. **Fee display:** a free slot shows "Free · normally {fee}" on the booking card, reading the doctor's profile fee. The review step already showed the standard fee. Still to confirm: what makes a slot "free" — today it is a per-slot pricing type the doctor sets.
3. **Vital ranges:** status chips and shaded bands are off. `VITAL_RANGES` in `shared/lib/health/vital-reference-ranges.ts` holds the version, source guideline and the on/off switch. The glucose fasting/after-meal/random field is not built (data-model change).
4. **Help card:** opens the landing FAQ (`/#faq`, ends with a support contact) for every role.
5. **Profile-completion gate:** now only date of birth, gender and phone (name is set at registration) gate the dashboard, via a one-step intake. Nationality, address, blood type, allergies, chronic conditions, emergency contact and insurance are optional and nudged by a completion ring on the Overview. Allergies are asked in the booking review step until some are on record. "None known" is now stored as a patient-reported status -- see *Patient-reported allergy status* below.

## Patient-reported allergy status (2026-09-28)

A new field on `PatientProfile`, separate from the `allergies` text and from the doctor's `allergiesConfirmedNoneAt` confirmation.

**Shape** (named to match the existing `allergies*` fields; stored as a plain string like `bloodType`):
- `allergiesStatus`: `unknown` (default) | `none_reported` | `has_allergies`
- `allergiesStatusUpdatedAt` (nullable), `allergiesStatusUpdatedByRole` (nullable, e.g. `patient`)
- API: `PATCH /patients/me` accepts `allergiesStatus: 'none_reported'` (the only value a client may send). Patient and doctor-chart profile responses return all three fields.

**Rules** (enforced in the `PatientProfile` domain entity, so no caller can bypass them):
- Saving any `allergies` text sets `has_allergies` on the server. Clearing the only allergy text reverts it to `unknown`.
- `none_reported` is rejected (422, `PatientDomainError`) while allergy text is on record, including text sent in the same request. This is the same rule the doctor confirmation already has.
- The doctor confirmation flow (`confirmNoKnownAllergies`, `PATCH /patients/{id}/allergies/confirm-none`) is untouched. Neither field reads or writes the other, so a patient's `none_reported` can never count as, or satisfy, the confirmation.

**Doctor's existing confirmation when the patient later adds an allergy:** already cleared today, and unchanged. `PatientProfile.update()` nulls `allergiesConfirmedNoneAt` and `allergiesConfirmedByDoctorId` whenever `allergies` becomes non-empty, so the assumption (yes) matches the backend. The reverse is deliberately not done: a patient reporting `none_reported` does not touch a doctor's confirmation.

**Doctor chart banner** (priority: present > doctor-confirmed > patient-reported > unknown):
- Unknown: "Allergies not recorded" (warning), with the Confirm button.
- Patient reports none: "Patient reports no known allergies · not confirmed" (neutral), with the existing Confirm button.
- Doctor confirmed: the existing confirmed state, unchanged.
- The sticky patient bar and the prescription dialog badges follow the same four states.

**Booking gate:** asked only while `allergiesStatus === 'unknown'`. Both answers are saved, so it never asks again. The patient can change it any time in Profile (a "no known allergies" switch, or the allergy chips).

**Migration** (`20260928090000_add_patient_reported_allergy_status`, applied to the local database):
- Adds `allergiesStatus TEXT NOT NULL DEFAULT 'unknown'`, `allergiesStatusUpdatedAt` and `allergiesStatusUpdatedByRole`.
- Backfill: every existing profile is `unknown` except those whose `allergies` already has non-blank text, which become `has_allergies` (timestamp = the row's `updatedAt`, role left null).
- Nothing else needs migrating. Profiles with a doctor confirmation and no text stay `unknown` and still show the doctor-confirmed banner. Patients are asked once, at their next booking.
- Additive and backward compatible: old clients ignore the new fields.

**i18n** (en and ar): new `publicPatient.allergiesReportedNoneNotConfirmed`, `publicPatient.allergiesReportedNoneShort`, `patient.profile.noKnownAllergiesToggle`, `patient.profile.noKnownAllergiesReported`, and the `profileFlow.*` booking-prompt strings. `publicPatient.allergiesNotYetConfirmed` was reworded to "Allergies not recorded".
