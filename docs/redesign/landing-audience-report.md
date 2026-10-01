# ORIVEX Landing — "For patients" / "For doctors" redesign

**Scope:** only the two audience sections of the public landing page. No other section, and no API, schema or OpenAPI change.

## What replaced what

| Before | After |
|---|---|
| "For Patients": a 5-item hairline list beside a peach card holding one calendar illustration | One warm surface (peach to canvas; a warm tint on surface in dark), with the copy at the start and three vignettes at the end |
| "For Doctors": 5 checkmarks beside a seal box, "Your practice, simplified" | The full-bleed ink band, now **ink in both themes**, with the vignettes at the start and the copy at the end |
| Two unrelated layouts | One structure, mirrored: a 12-column grid, copy 5 and stage 7. Both sections use the same copy component and the same stage component |
| Steps repeated from How It Works | Exactly three benefits each (icon, bold lead, one clause). The steps stay in How It Works |
| A signed-in patient saw **"Go to Dashboard"** in the doctors section | The CTA follows the viewer (matrix below) |

## Component structure

| Component | File | Role |
|---|---|---|
| `ForPatientsSection`, `ForDoctorsSection` | `features/landing/components/for-{patients,doctors}-section.tsx` | Surface and grid, and the viewer-specific CTA (from the existing `useAuth`, no new auth call) |
| `AudienceCopy` | `features/landing/components/audience-copy.tsx` | The copy half, shared: eyebrow, h2, one sentence (52ch), three benefits, the CTA. A `tone="ink"` variant for the band |
| `AudienceShowcase` | `features/landing/components/audience-showcase.tsx` | The stage, `audience: 'patient' \| 'doctor'`, with three vignettes composed from the app's own components |

The vignettes inside `AudienceShowcase`. None is a copy of a component:

| Vignette | Built from |
|---|---|
| Patient › next visit | `Card`, `DateBlock`, `Avatar` (neutral role glyph), `StatusBadge status="confirmed"` |
| Patient › slot strip | five `TimeSlot`s, the middle one `selected` |
| Patient › prescription | `Card`, the pill glyph, a `Skeleton` bar for the name, "Once daily", `Badge` "Active" |
| Doctor › today | `DayStrip`, the Overview's own day strip, in `preview` mode |
| Doctor › new request | `Card`, `Avatar`, `Button`s with the Queue's real "Decline" / "Approve" labels |
| Doctor › earnings | `MetricStat` in `preview` mode, with a 6-bar `sparklineStyle="bars"` |

### Small additions to existing primitives (no forks)

- **`DayStrip`:** the drawing half of `TodayTimeline`, extracted unchanged. `TodayTimeline` now renders it with the doctor's real day. Its `preview` mode draws booked capsules as plain shapes: no tooltip, no button.
- **`MetricStat`:**
  - `preview` puts a still skeleton in place of the value, with the rest rendering as usual. `loading` would hide the sparkline.
  - `sparklineStyle="bars"`.
  - Sparklines now mirror under RTL, so time runs in the reading direction, as in `VitalCard`.
- **`TimeSlot`:** `selected` gives the pulse (lime) fill. `aria-pressed` appears only on a selected slot, so the real booking grid's slots are not announced as toggles.
- **`useRevealOnce`:** the logic behind `RevealOnScroll`, lifted into a hook so the stage can time its own staggered details. `RevealOnScroll` uses it and behaves the same.
- **Tokens:**
  - `--color-ink-band`, `--color-on-ink-band` and `--color-ink-band-raised`. The band and its text don't invert in dark mode; the stage is raised one more step there.
  - `--color-warm-band-end`: the patient gradient's end, canvas in light and surface in dark.

## Vignette content rules

- **No people:** role labels only ("Your doctor", "New patient"); avatars are a neutral person glyph, never initials of an invented name. No photos.
- **No amounts or invented figures:** the earnings value and the medicine's name are still placeholder bars.
- **Times:** the timeline uses relative hours only ("−2h … +2h"; Arabic "قبل 2 س … بعد 2 س").
- **Dates:** visit and slot times are tomorrow's date in the viewer's locale ("Tomorrow · 10:00 AM" / "غدًا · 10:00 ص"), computed at render. Wall-clock times are fixed in UTC, so the server render and the browser agree.
- **Hidden from assistive tech:** the stage is `aria-hidden="true"` with `role="presentation"`. Each fragment is `inert`, and its buttons are also `tabIndex={-1}`. One `sr-only` sentence per section describes the stage instead.

## CTA matrix

| Viewer | For patients | For doctors |
|---|---|---|
| Signed out | "Find a doctor" → `/patient/doctors` | "Apply as a doctor" → `/register` (the journey screen then offers the doctor path) |
| Patient | "Find a doctor" | "Apply as a doctor" → `/doctor/onboarding` |
| Doctor | "Find a doctor", shown **unavailable** with a one-line reason | "Go to your workspace" → `/doctor` |
| Admin, other roles | "Find a doctor", unavailable | no CTA |

- **Role switching is allowed in the product.** Every account starts as a patient. `/doctor/onboarding` is open to patient accounts, and an admin's approval promotes the account to doctor (`PromoteDoctorRoleOnVerificationHandler`). So a signed-in patient keeps "Apply as a doctor", leading to onboarding rather than registration.
- **Deviation from the matrix for a signed-in doctor.** `/patient/doctors` is patient-only (`RequireRole(['patient'])`), so a live "Find a doctor" would land a doctor on /forbidden. Instead it shows as unavailable, the same pattern as Book on the doctor cards: focusable, with a tooltip and screen-reader text ("Finding and booking doctors is for patient accounts.").
- **Other roles.** An admin can neither apply nor has a doctor workspace, so the doctors section shows no CTA.

## Motion, dark mode, RTL

- **Motion:**
  - First reveal (once, 10% in view, only when the stage starts below the fold): fragments rise 12px and fade in, 80ms apart.
  - Then the doctor's now-marker draws in, and the patient's chosen slot takes its lime about 300ms later.
  - Without JavaScript or with reduced motion, the final state renders immediately.
- **RTL:** the composition, vignette offsets, slot order and sparkline all mirror. The eyebrow is uppercase with letter-spacing in English only, since spacing would break Arabic's joined letters. Meaningful icons are not flipped.
- **Dark mode:** the patient surface takes a warm tint on surface; the doctor band stays ink, with the stage one step up.
- **Phones (< 768px):** copy first, then the vignettes as a snap-scrolling row with a peek of the next card. No stacked tall cards.

## Verification

| Check | Result |
|---|---|
| Typecheck, lint | Clean |
| Unit tests | 902/902 |
| Production build | OK |
| `shell-layout-integrity.spec.ts` | 8/8 |
| New `landing-audience.spec.ts` | 7/7 |

The new spec covers:
- the CTA matrix for signed out, `patient02` and `doctor02`;
- the stage `aria-hidden`/`presentation`/`inert`, with no images, amounts or names, and one sr-only description;
- Tab never stopping inside a stage;
- axe (wcag2a/aa and best practice) reporting no serious or critical violations in the two sections, EN light and AR dark.

`avatar-sizing.spec.ts` now skips avatars inside a showcase stage, which are drawn at 0.9 scale on purpose.

**Browser:** 1440×900, 1046×612 and 390×844, in EN and AR, light and dark, as signed out, `patient02@orivex.dev` and `doctor02@orivex.dev`. The CTA matrix held in all 36 combinations.

## Screenshots

Before and after, in `docs/redesign/landing-audience/`:

| What | Files |
|---|---|
| Both sections, EN light | `{patients,doctors}-signedOut-en-light-1440.png` |
| Both sections, AR dark | `{patients,doctors}-signedOut-ar-dark-1440.png` |
| The old "Go to Dashboard" bug for a signed-in patient | `before/doctors-patient-en-light-1440.png` (fixed in `after/`) |

After only:
- `doctors-doctor-…`, `patients-doctor-…`: the CTAs for a signed-in doctor;
- `…-390.png`: phones;
- `patients-signedOut-en-dark-1046.png`, `doctors-signedOut-ar-light-1046.png`: 1046 in both themes.

## Choices to confirm

- **Next-visit avatar:** the brief asks for `Avatar` (`sm`) beside the DateBlock. I kept the Round 4 appointment-row rule instead (DateBlock as the one leading anchor, the avatar inline before the name at `xs`), so this fragment matches every real appointment row.
- **Request buttons:** they use the Queue's real labels, "Approve" / "Decline", rather than "Accept", so the preview shows the product as it is.
- **Copy:** the benefit copy and Arabic strings are new. Worth a read by whoever owns marketing copy.
