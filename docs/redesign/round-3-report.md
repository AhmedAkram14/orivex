# ORIVEX Redesign — Polish Pass (Round 3) Report

**Scope:** 12 items. No new primitives, no redesigns, and no API, schema or OpenAPI change.

- **Done:** 9 items.
- **Blocked on API data:** 3 (B5 name search, C9 names, C10 photo). Each needs a decision, listed under "Blocked" below.
- **Also fixed:** Arabic bugs found during the doctor-side check, in their own commit.

## Commits

| Group | Commit | Items |
|---|---|---|
| A Landing | `a3a38cc` | 1 |
| B Patient | `f310742`, `ede43de` (Emergency contacts header follow-up) | 2, 3, 4, 6, 7 |
| C Doctor | `0433e6f` | 8, 9 (grouping), 11, 12 |
| Arabic findings | `c9cb909` | found in the doctor-side Arabic check (below) |

## Items

| # | Status | What changed | Files |
|---|---|---|---|
| 1 | Done | The card hangs off the photo's bottom-right corner (24px below the frame; from 1024px, 24px past its right edge), sized as a share of the photo's width. It stays right of the call controls and below the picture-in-picture at every size. Below 640px it follows the photo, as before. The live "Video consultation · Live" label is pinned left over the blurred pad; in Arabic it used to cover the photo's ⋯ and fullscreen buttons. | `features/landing/components/hero-section.tsx` |
| 2 | Done | Overview card actions read "View all" / "عرض الكل", and each link keeps the card title for screen readers ("View all Active prescriptions"). The patient profile's Emergency contacts header follows the same rule: ghost sm action, title `min-w-0 text-balance`, action `shrink-0 whitespace-nowrap`. Its visible label is "Add" / "إضافة", with the full "Add contact" kept as its accessible name. Its Arabic title now uses the shorter term the tab label already used ("جهات اتصال الطوارئ"). Every card header with an action was checked in both roles, EN/AR, at 1046/1440/390: none wraps. | `features/patient/components/{active-prescriptions-widget,recent-medical-records-widget,upcoming-appointments-widget}.tsx`, `features/patient/components/profile/patient-profile-view.tsx`, `messages/*.json` |
| 3 | Done | The Upcoming appointments card is hidden when nothing is upcoming. The hero uses the same definition, and already says so and offers Book. | `upcoming-appointments-widget.tsx`, `app/[locale]/(protected)/patient/page.test.tsx` |
| 4 | Done | One icon per notification: the entity-type icon (appointment, consultation, dispute, prescription), tinted by severity. Account notices with no entity keep their severity icon. The unread dot shows only on unread rows. The rule lives in the shared row, so the bell, the Notifications page and both roles' Recent Activity match. | `features/shell/components/notification-panel.tsx` (+ test), `features/doctor/components/recent-activity.tsx` |
| 5 | **Blocked** | Placeholder left as "Search by specialty…". See "Blocked" below. | — |
| 6 | Done | The slot grid is `repeat(auto-fill, minmax(7rem, 1fr))` (7rem = 112px), with equal-width columns: 6 across at 1046, 9 at 1440, 3 at 390. A price that differs from the day's moves under the time rather than overflowing a 112px slot. Rescheduling uses the same grid. | `shared/ui/schedule/time-grid.tsx`, `shared/ui/schedule/time-slot.tsx`, `features/scheduling/components/booking-flow.tsx` |
| 7 | Done | The doctor's name is sized to the hero card (22–32px, `clamp` on the card's width) and stays on one line at 1046, 1440 and 390 in EN/AR. It also keeps the h2 weight: a size class had been silently replacing the h2 token, rendering it at 400. Years of experience, fee and languages are removed from Professional Information; the hero shows all three. | `features/doctor/components/profile/doctor-profile-view.tsx` |
| 8 | Done | The hero is **net for the selected range** ("Net earnings this period"), with "Lifetime: EGP …" as its caption. The lifetime tiles now read "All time — not affected by the date range"; the old "below" was wrong because the range picker sits above them. The range net is the sum of the backend's own range cycles, exactly the earned transactions from dateFrom to dateTo, added up the way the backend adds up lifetime. Lifetime is still the backend's figure. | `features/payment/components/doctor-earnings-summary.tsx` (+ test), `messages/*.json` |
| 9 | Grouping done; **names blocked** | Consecutive notifications of one type within 24 hours fold into one row ("3 consultations interrupted" / "انقطاع 3 استشارات", with Arabic plural forms). The row is timed by its newest member and shows the unread dot if any member is unread. Order is kept, and only consecutive repeats fold. | `features/doctor/lib/activity-groups.ts` (+ test), `features/doctor/components/recent-activity.tsx` (+ test), `messages/*.json` |
| 10 | **Blocked** | See "Blocked" below. | — |
| 11 | Done | The stat label is "Patients" / "المرضى" instead of "6 Patients" above "6". | `doctor-profile-view.tsx`, `messages/*.json` |
| 12 | Done | Start consultation and View Patient Queue stay buttons. Update Schedule and Write Prescription move to a ⋯ "More actions" menu. The unavailable Write Prescription stays focusable (`aria-disabled`) with its reason in a tooltip (opening below it) and as screen-reader text. The row is one line at 1046 and 1440 in EN and AR. At 390 it can't fit on one line, so View Patient Queue and ⋯ go to a second line. | `features/doctor/components/dashboard-hero.tsx`, `app/[locale]/(protected)/doctor/page.test.tsx`, `messages/*.json` |

## Blocked: decisions needed

Each of these needs an API contract change, so nothing was changed without your approval.

1. **B5: search by doctor name.** `GET /doctors` matches the search text only against the specialty's English name (`medicalSpecialty.name contains`). Typing a doctor's name returns nothing, and so does an Arabic specialty name. Changing the placeholder to "Search doctors or specialties" would promise something the search doesn't do.
   - **Option:** the backend also matches the doctor's display name (and the Arabic specialty name), either behind the existing `specialty` parameter or as a new `q` parameter. The directory query already joins the doctor's account for the name, so no extra query is needed.
   - After that, the placeholder change is one string per language.
2. **C9: patient name and photo on Recent Activity rows.** A notification carries only a title, a generic description ("A patient cancelled their appointment with you.") and the appointment id. Resolving a name would mean one fetch per row, which the brief rules out.
   - The Overview's already-loaded data (upcoming work, today's queue, pending approvals) covers only some of those appointments, so names would appear on some rows and not others.
   - **Option:** the backend adds the patient's display name and avatar to doctor-facing notifications. They are known when the notification is created.
3. **C10: photo in the Patients table.** `GET /appointments/doctor/patients` has no avatar field, even though the frontend type declares one as optional, so the table always shows initials.
   - **Option:** a one-field addition. The controller already loads each patient's account to get the name, so returning `avatarUrl` costs no extra query. The table already renders it when present.

## Also fixed: the doctor side in Arabic (`c9cb909`)

The doctor-side check (8 pages × EN/AR × light/dark) found these. All predate this round.

- **Radix primitives were laid out left-to-right in Arabic.**
  - Without a `dir`, Radix stamps `dir="ltr"` on its own root. So in Arabic every tab panel was mirrored the wrong way: patient chart, appointments, schedule, queue, prescriptions, profile.
  - The same happened to every select, dropdown menu and radio group.
  - It also scrambled dates inside them: vital dates read "092026/09/".
  - **Fix:** the shared Tabs, Select, DropdownMenu and RadioGroup wrappers now take the locale's direction. This is one small hook, `shared/i18n/use-direction.ts`, with no new dependency.
  - Re-checked: no Radix element renders `dir="ltr"` in Arabic in either role.
- **Overview timeline.** The hour labels forced `dir="ltr"`, so in Arabic they ran left-to-right under right-to-left bars. The "Now" marker read an hour or more off (at 12:52 it sat between 1 and 2 PM). Fixed and re-measured.
- **Patient ID label.** "رقم المريض: PATIENT4" was reversed because the whole sentence was forced left-to-right. It now uses an isolated run with automatic direction.
- **Range chips.** The date-range chips were the only numbers in Arabic using Arabic-Indic digits (٧ / ٣٠ / ٩٠). They now match every other number.

## Verification

| Check | Result |
|---|---|
| Typecheck | Clean |
| Lint | 0 errors. The 6 warnings in touched files are unused imports from before this round. |
| Unit tests | 887/887 (217 files; new: activity grouping, the grouped widget in EN/AR, the direction wrappers) |
| Production build | OK |
| `shell-layout-integrity.spec.ts` | 8/8 on the final build |

**Landing hero (A1), measured on the photo:** at 390/1046/1440 in EN and AR, every control (mic, end, camera), the picture-in-picture and the top-right buttons are fully visible, with no horizontal scroll.
- At those sizes, the closest gaps are 13px to the camera button and 14px to the picture-in-picture (EN 1046).
- A sweep across 640–1440 (every breakpoint edge) found no overlap. The tightest point is 1024px, with a 10px gap to the picture-in-picture.

**Touched pages** were checked at 1046×612, 1440×900 and 390×844 in EN/AR.

**Doctor side:** Overview, Appointments, Patients, Patient chart, Schedule, Earnings, Reports and Profile, each in EN/AR and light/dark. Automatic scan plus screenshot review:
- No sideways scroll.
- No "EGP" in Arabic (amounts read "… ج.م.").
- No tinted chip or badge under WCAG contrast in either theme.
- Latin text on Arabic pages is user data only: patient names, visit reasons, portfolio entries, reviews, emails, licence and patient IDs. Plus "CSV" and "mmHg".
- The one exception: 3 notification titles ("New device signed in", "Appointment confirmed", "Verification under review") that exist only in the frontend's demo seed data. The backend never sends them, so they don't occur in production.

## Screenshots

In `docs/redesign/round-3/`:
- **Item 1:** `before/` and `after/1-hero-{en,ar}-{1046,1440,390}.png`.
- **Item 2:**
  - before: `before/2-overview-en-1046.png`;
  - after: `after/2-overview-en-1046.png` (no empty Upcoming card) and `after/2-overview-cards-en-1046.png` (one-line titles).
- **Item 8:**
  - before: `before/8-earnings-en-1046.png`;
  - after: `after/8-earnings-{en,ar}-1046.png`.
- **Item 12:**
  - before: `before/12-doctor-overview-en-1046.png`;
  - after: `after/12-doctor-overview-en-1046.png` and `after/12-menu-open-ar.png` (the menu in Arabic, with the unavailable item's reason).

The demo doctor has no earnings, so item 8 shows EGP 0.00 before and after. The change there is the label, the caption and the range scope.

## Noticed, not changed (outside this round's items)

- **Doctor hero, years twice.** The hero shows years of experience twice: in the meta line ("12 Years Experience") and as a stat.
- **Profile stat strip, sideways scroll.** Narrower than 40rem, the strip becomes a sideways scroller. On the patient-facing profile at 1046 and 390, the fee stat sits off to the side. The fee is still visible in the booking card and the mobile booking bar.
- **Timeline labels at 390.** On the Overview at 390, the hour labels under the timeline sit edge to edge.
