# ORIVEX Redesign — Polish Pass (Round 4) Report: Avatars and final fixes

**Scope:** Part A (avatars) is done. In Part B, items 1–3 are done; **item 4 (doctor search by name) is blocked on an API change**, see "Decision needed" below. No API, schema or OpenAPI change was made.

## Commits

| Commit | Contents |
|---|---|
| `84f9c661` | A: one avatar system (primitive, size scale, framing, every call site, appointment-row pattern, doctor cards, Overview hero, patient chart ID) |
| `f10e0446` | B2 slot buttons, B3 fee shown two ways |
| `10e4b067` | B1 notifications: names and reasons in both languages, three missing Arabic types, demo data aligned with the backend |

## A. Avatars

### The primitive

The existing `Avatar` already had the brief's exact scale (`xs` 24, `sm` 32, `md` 40, `lg` 56, `xl` 96), so no second primitive and no new size prop. What changed in `shared/ui/avatar.tsx`:

- **Framing:** photos use `object-cover` with `object-position: 50% 22%`, a face-biased crop for the portrait sources. Dr. Omar Hassan and Dr. Salma Adel now show similar face sizes in the same row.
- **Ring:** a 1px hairline just inside every avatar, drawn as an overlay above the photo. The color is a new token, `--color-avatar-ring`: black 5% in light, white 10% in dark, set in both dark blocks (OS preference and the explicit theme override).
- **Initials:** 40% of the diameter (9.6px at 24 … 38.4px at 96), weight 600, on a tint from the name hash. An initials avatar has the same size and ring as a photo.
- **`PersonAvatar` is the one way to show a person.** Twelve call sites composed `Avatar` + `AvatarImage` + `AvatarFallback` by hand, each with its own local initials helper and an untinted (or brand-colored) fallback. They and the calendar chip's hand-made 20px CSS circle all now use it. It is decorative (`aria-hidden`), because the name is always shown beside it.
- Every avatar carries `data-slot="avatar"` and `data-size`, which the new Playwright spec checks.

### Sizes per context

| Context | Before | After | Text beside it |
|---|---|---|---|
| Doctor cards (Browse Doctors, landing Top Rated) | ~56, centred on 4 lines | `lg` 56, top-aligned, 3 lines | name, specialty, rating |
| Appointment rows, both roles | `md` 40 beside the DateBlock | `xs` 24 inline before the name | (see pattern below) |
| Doctor Overview hero | `lg` 56 | removed | — |
| Overview › Upcoming work | `sm` 32 | `md` 40 | 14px name + badge, 14px reason |
| Overview › Patient Queue | `sm` 32 | `sm` 32 | 14px name, 12px wait |
| Patients table / mobile cards | `sm` / `md` | unchanged | one line / two lines |
| Patient chart hero, doctor profile hero (both views) | `xl` 96 | `xl` 96 (halo and brand-colored fallback removed) | h1/display name |
| Patient chart sticky header | `sm` | `sm` | 14px name, 12px meta |
| Patient's own profile card | `xl` 96 beside a 16px name | `lg` 56, top-aligned | 16px name + 3 short lines |
| Patient hero › next appointment's doctor | `lg` 56 | `md` 40 | name, specialty |
| Booking doctor chip, needs-attention rows, conversations | `md` | `md` | two lines |
| Reviews list | `sm` | `sm`, top-aligned | name + date, stars, comment |
| Schedule popover | `lg` | `lg` | 18px name + type |
| Schedule month chip | 20px CSS circle | `xs` 24 | two small lines |

The notifications dropdown shows no avatars: its payload has no person to show.

### Appointment-row pattern chosen: DateBlock anchor, avatar inline at `xs`

The `DateBlock` is each row's one leading anchor. The person rides inline before their name at 24px. It's the same in both roles and on every appointment row:
- patient Upcoming/History (the shared `AppointmentCard`, also used by the Overview widget);
- doctor Appointments (all tabs);
- doctor Queue › pending approvals;
- the visit-summary dialog.

RTL follows from flex order with logical gaps: in Arabic the avatar sits at the name's inline start (its right). I chose inline over the corner overlap because the overlap would cover part of the DateBlock's month text.

*Note:* the size table lists "queue request cards" under `lg`. The pending-approval cards are appointment requests with a DateBlock, so I applied the appointment-row rule to them. Say if you'd rather they take `lg`.

### Doctor cards

- **Photo:** `lg`, top-aligned, with `mt-1.5`, so its top meets the name's cap height. Measured within 0–2px in EN and AR.
- **Rating:** one line, "★ 4.9 · 10 ratings · 10 reviews" (the separate "· N written reviews" line is gone), so the block is 3 lines.
  - Measured at every width from 390 to 1600: the full wording fits except at 1216–1264. There the three-column grid leaves the text column about 170px, less than the line needs even at 13px.
  - In that band, the review count shows as a comment icon plus its number. "10 reviews" stays the tooltip and the screen-reader text.
  - No width wraps the line.
- **Rank badge:** "Top Rated" / "Most Booked" moved from the card's top corner to the end of the fee row. Pinned to the corner, it ran over longer names at 640 and 1024–1120. This predates this round, but it is on the doctor card. Measured: no overlap at any width now.

### Doctor Overview hero

The avatar is removed, as you preferred. The header already shows it; the greeting and the timeline are the hero.

### Patient chart ID

"Patient ID: PATIENTP" came from the demo data's slug IDs (`patient-p…`); the real backend uses UUIDs.
- The short ID now shows only for a UUID (its first 8 hex characters, uppercased) and is omitted otherwise, in the hero, the sticky header and the prescription dialog.
- The copy button goes with it.

## B. Final fixes

1. **Arabic notification string.** Findings first:
   - **The rated notification.** "A patient rated your consultation" was a title only the frontend's demo data used. The backend's real type is "New consultation review", which already had Arabic copy.
   - **Names were being dropped.** The backend puts the patient's name only in the English body of three doctor-facing notifications (review, appointment request, check-in). The localized copy replaced that body with generic wording ("A patient left a review…") in both languages, so the name was lost everywhere.
   - **Three real types had no copy at all:** "Verification rejected", "More information needed" and "New verification application submitted". They rendered in English on the Arabic UI.

   What changed:
   - **Names:** for those three types, the name (and the rating and comment on a review) is read from the backend's exact English template and put into a translated sentence. The Arabic reads "قيّم Youssef Hassan الاستشارة بـ 5/5." with the full stop at the sentence's end. Wording that doesn't match the template falls back to the generic sentence; no name is ever guessed.
   - **Isolation:** the name is isolated with FSI…PDI, the plain-text equivalent of `<bdi>`, because this copy is rendered as a string.
   - **The three missing types:** added in EN and AR. Rejected and more-info notices keep the admin's reason.
   - **Demo data:** the mock fixture and the demo seeder now use only titles and wording the backend really sends. Seven fixture entries and five seeder entries were replaced in place, so pagination and unread counts are unchanged.
   - **Tests:** four new unit tests. The notification-flow e2e was resynced; it had been failing since 2026-09-24, when opening the bell started marking everything read.
2. **Slot buttons** fill their grid cells: each slot is full width and height inside `repeat(auto-fill, minmax(7rem, 1fr))`.
3. **Fee shown two ways:**
   - The Date & time step reads "Price per visit: EGP 500.00 (standard fee EGP 450.00)" whenever the day's price differs from the profile fee.
   - The Review step reads "This slot: EGP 500.00 (standard fee EGP 450.00)".
   - The profile's booking card already showed both.
   - **The API has no reason field for a slot's price**, so no "evening rate" is shown (backend follow-up below).
4. **Doctor search by name: blocked.** `GET /doctors` matches its search text only against the English specialty name, so "Dina" returns nothing. The placeholder stays "Search by specialty…". I did not filter client-side over the paginated list.

## Decision needed

**Name search (B4):** may the backend match the doctor's name, and the Arabic specialty name, in the directory search? This is an API change.
- The directory query already joins each doctor's account for the name, so it needs no extra query.
- It could go behind the existing `specialty` parameter or a new `q` parameter.
- After that, the placeholder change ("Search doctors or specialties" / "ابحث عن طبيب أو تخصص") is one string per language.

## Backend follow-ups

- **Square or face-cropped avatar thumbnails:** the API exposes only the original `avatarUrl`. The frontend uses a face-biased crop instead; no image processing was added.
- **A reason field for a slot's price**, for example "evening rate", so the booking flow can say why a slot differs from the list fee.
- **Name search in `GET /doctors`**, as above.
- **Carried over from Round 3:** a structured patient name and avatar on doctor-facing notifications, instead of free text. It would also give Recent Activity its photos. Also the patient photo on `GET /appointments/doctor/patients`.

**Correction to Round 3.** That report said doctor-facing notifications carry "only a generic description". Three of them (review, request, check-in) do carry the patient's name, but only in free English text. The name is now shown from that text; a structured field is still the right fix.

## Verification

| Check | Result |
|---|---|
| Typecheck | Clean |
| Lint | 0 errors (1 existing unused-import warning in a touched file) |
| Unit tests | 896/896 (220 files) |
| Production build | OK |
| `shell-layout-integrity.spec.ts` | 8/8 |
| New `avatar-sizing.spec.ts` | 6/6 |
| `notification-flow.spec.ts` | 1/1 |

**The avatar spec** walks the landing page and both roles' pages in EN and AR:
- Patient: Overview, Browse Doctors, Appointments, Profile, Messages.
- Doctor: Overview, Appointments, Patients, Queue, Profile, Schedule, Patient chart.

Every visible avatar must render at 24/32/40/56/96, square, and every photo in one must use `object-position: 50% 22%`. The role runs must meet at least six avatars.

**Browser matrix:** 1046×612 and 1440×900, EN and AR, light and dark. Pages:
- Browse Doctors and landing Top Rated;
- patient Appointments (Upcoming and History, after a real booking in the session);
- doctor Appointments (all tabs);
- doctor Overview hero;
- Patients table;
- Patient chart (hero and sticky header);
- doctor profile (both views);
- the booking chip and Review step;
- the notifications dropdown.

Plus 1278 for the doctor cards and appointment rows.

**Measured separately:**
- the doctor-card rating line at every 16px step from 1024 to 1600, plus 390/640/768 (no wraps);
- photo-to-name alignment;
- badge overlap (none).

## Screenshots

In `docs/redesign/round-4/`, before and after with the same framing:

| What | Files |
|---|---|
| Doctor card | `browse-doctors-en-1278.png`, `browse-doctors-ar-1046.png` (after also: `landing-top-rated-en-light-1278.png`, `landing-top-rated-ar-light-1440.png`) |
| Appointment row (patient) | `patient-appointments-upcoming-{en,ar}-1046.png` |
| Appointment row (doctor) | `doctor-appointments-en-1046.png`, `doctor-appointments-ar-1278.png` |
| Doctor Overview hero | `doctor-overview-en-1046.png`, `doctor-overview-ar-1278.png` |
| B2 and B3 | `booking-en-1046.png`, `booking-summary-en-1046.png` |
| B1 (after only) | `b1-recent-activity-ar.png` |

## Noticed, not changed

- **Profile hero, years twice:** the doctor profile hero still shows years of experience twice, in the meta line and as a stat (noted in Round 3).
- **Mock booking state:** the mock store resets on a full page reload, so a booking made in the demo disappears if the page is reloaded. This is demo-only.
