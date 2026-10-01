# ORIVEX — Doctor Overview: availability contrast, card heights, redundancy

**Scope:** the Doctor Overview (`/[locale]/doctor`) and the shared pieces it uses. The new availability tokens also reach Schedule, the booking slot picker and the landing vignettes. There is no API, schema or OpenAPI change, and no new request: "Next opening" reuses the upcoming-slots query that the day strip already loads.

## 1. Availability colours

### Tokens

| Token | Light | Dark | Contrast |
|---|---|---|---|
| `--color-avail-fill` | `#d8f36a` (pulse, solid) | `rgb(200 232 90 / 0.28)` | Fill alone on white is 1.24:1, so it never carries the shape by itself |
| `--color-avail-stroke` | `#4d6b0f` | `#c8e85a` | Light: 6.13:1 on white, 4.95:1 on its own fill. Dark: 12.73:1 on the surface, 4.66–5.99:1 on its fill |
| `--pattern-unavailable` | 1.5px `--color-border-default` hatch, 135°, every 6px | The same, using the dark border colour | A texture, not data (about 1.3:1): "nothing open" still reads differently from free |
| Booked | `text-primary` `#0f1c1b` | `#eef2ef` | 17.47:1 / 15.61:1 |

**Naming:** the brief's `--avail-fill`, `--avail-stroke` and their `-dark` pairs follow the repo's convention. They are `--color-avail-*` tokens in `colors.css`, with dark values overridden in both dark blocks of `theme-dark.css`. Tailwind uses them as `bg-avail-fill` and `border-avail-stroke`.

### The hero and the day strip

- **Hero:** the doctor variant of `HeroSurface` is now plain `bg-surface`.
  - The lime survives only as an 8% blurred glow in the inline-end top corner, behind the content and clear of the timeline.
  - This also applies to the doctor HeroSurface on the patient chart and the queue's current-patient card.
- **Window:**
  - The strip spans today's whole working hours (9 AM – 7 PM), not "from now". It also stretches to cover any visit outside those hours.
  - Every hour is labelled. Below 40rem of strip width, every other label is hidden so none collide.
- **Free time:**
  - Drawn as solid `avail-fill`, 12px high, 6px radius, with a 1.5px `avail-stroke` border.
  - Adjacent open slots merge into one band.
  - Booked time is cut out of the band, so lime never runs under an ink capsule.
- **Booked:** ink capsules, with a tooltip naming the patient (as before).
- **Unavailable or past:** the track itself is hatched with `--pattern-unavailable`.
- **Now:**
  - A 2px ink line through the track, edged with the surface colour so it stays visible across a capsule.
  - The lime "Now" pill sits above it, with ink text.
- **Legend:** three 12×12 swatches drawn with the same tokens (Available, Booked, Unavailable). The legend text is `text-tertiary` (5.96:1). "Unavailable" is a new string in EN and AR.
- **When nothing open is left today:** one line above the strip says so, for example "Today's hours have ended · Next: Thu, Oct 1, 9 AM". The line shows only when no visit is still ahead.

### Where else the tokens are used

| Place | Before | After |
|---|---|---|
| Schedule, week and day views | Open hours washed with 20% lime, with appointments on top; today 28% lime; off hours had their own hatch | Open hours are plain surface (the appointments sit there). Each day header chip uses the fill and stroke with ink text. Off hours use `--pattern-unavailable` over `surface-2`. Today is marked by a header rule in `avail-stroke` |
| Schedule, "Next available slot" card | A lime circle | Fill and stroke |
| Booking slot picker, selected slot | Pulse fill, pulse border | Fill, 1.5px stroke (a 1px border plus a 0.5px inset, so the slot doesn't change size), ink text |
| Landing, doctor vignette timeline | — | Uses `DayStrip`, so it follows automatically |
| Landing, patient slot strip | — | Uses `TimeSlot` selected, so it follows automatically |

## 2. Card heights

- **Rows:** from two columns up, cards in a row stretch to the row's tallest card (`@pane:items-stretch`). Each row sizes itself; I didn't use `grid-auto-rows: 1fr`, because at 1046 that would also force the full-width Recent Activity row to the height of the row above. On a phone, cards stack at their own height.
- **Cards** (`WidgetContainer`):
  - The header reserves an action-height slot, so every header is one height.
  - The body is `flex-1`.
  - Actions ("View all (12)", "View Full Queue", "View schedule", "View all") are now a footer pinned to the bottom, so the links line up across a row.
  - An empty card's single line sits vertically centred.
- **Balance:**
  - Patient Queue, Upcoming work and Recent Activity each show 3 rows.
  - Upcoming Availability shows 4 days.
  - Recent Activity's description is one line (the full text stays in the DOM and in a hover title).
  - Availability and activity rows are one step tighter.
- **Upper row below 60rem of content** (1046 with the sidebar open): Upcoming work and Patient Queue stack. Side by side at about 363px, a visit row (avatar, time, name, badge, "Go to queue") wraps, and the pair can't share a height without the queue going half empty.

### Today's Progress

- **The card:** always shows a ring, completed out of booked, and below it "Next opening: Thu, Oct 1 · 11:40 AM".
- **On an empty day:** the ring reads 0 of 0.
- **Where "Next opening" comes from:** the upcoming slots already loaded on the page. With no open slot ahead, the line is left out.

### Measured (final build, px)

| State | Width | Upper row | Bottom row | Most unused below content |
|---|---|---|---|---|
| Booked day (`doctor@`, 11 AM) | 1440 | 345 / 345 | 364 / 364 / 364 | 33 |
| Booked day (`doctor@`, 11 AM) | 1278 | 370 / 370 | 364 / 364 / 364 | 46 |
| Booked day (`doctor@`, 11 AM) | 1046 | stacked: 345, 324 | 337 / 337, then Activity 364 | 19 |
| Empty day (`doctor01`, 5 PM) | 1440, 1278, 1046 | 235 / 235 | 364 / 364 | 27 (queue empty state excepted) |
| After hours (`doctor01`, 9:30 PM) | 1440, 1278, 1046 | 235 / 235 | 364 / 364 | 27 |

- **Row heights:** cards in the same row differ by 0px.
- **Height target:** the bottom row is 364px (it was 389 in this round's first pass), above the brief's "about 280–300". It comes from four availability days and three activity rows, plus the pinned footer link. Going lower would mean three days or two activity items. I didn't make that call.

## 3. Other fixes

| # | Issue | Fix |
|---|---|---|
| 3.1 | "Nothing today" said four times | Kept in the greeting. On a day with nothing booked, one **Today** card (the ring at 0 of 0, "Nothing booked", the next opening) replaces Upcoming work and Today's Progress, and the bottom row becomes two columns. Patient Queue keeps its own line. "Nothing booked" means no non-cancelled visit today in Upcoming work's own data (`useHasBookingsToday`) |
| 3.2 | "Today 9 AM – 7 PM" after hours had started or ended | Before the hours: "9 AM – 7 PM". During: "until 7 PM". After: "Ended" (muted), and today stays listed instead of disappearing |
| 3.3 | Unread dot misaligned the titles | The dot is now a 6px mark on the icon's inline-end corner, ringed in the surface colour. Every title starts at the same x. "Unread" stays as screen-reader text |
| 3.4 | Window started at the current hour | The whole working day, with the past hatched and the Now line in place |
| 3.5 | Start Consultation looked enabled | With no one `waiting` in the queue (checked against the queue data), it uses the disabled opacity (0.45, no hover lift) with the tooltip "No patient waiting" (EN and AR). It stays focusable through `aria-disabled` |
| 3.6 | Only the rating tile had a caption | Every tile has one: "Need your approval", "Still ahead today" (the count is pending-only), "Waiting now", and the rating line |

## Choices to confirm

1. **Footer actions.** I followed §2.2 and moved the "View all"-type links into a pinned footer. In the three-column row, "Upcoming Availability" plus "View schedule" doesn't fit in one header line at 1278 or 1440, so headers wouldn't match. This adds about 45px per card, which is the main reason the bottom row is 364 rather than 300.
2. **The upper row stacks below 60rem of content** (see Card heights).
3. **Recent Activity descriptions are clamped to one line.**
4. **Queue capped at 3** (it was 4), matching the other lists.
5. **The hatch is quiet (`--border`, about 1.3:1) by design.** The 3:1 rule is carried by the free band's stroke, the ink and the Now line, as the brief's own token choice implies: a lime fill can't reach 3:1 on white.
6. **On the Schedule, open hours are plain surface rather than lime.** Appointments sit on them. The day header chips carry the availability colour instead.

## Verification

| Check | Result |
|---|---|
| Typecheck, lint | Clean (0 errors) |
| Unit tests | 905/905 |
| Production build | OK |
| `shell-layout-integrity.spec.ts` | 8/8 |
| New `doctor-overview-cards.spec.ts` | 7/7 |
| Rewritten `doctor-overview-hours.spec.ts` | 3/3 |
| `doctor-dashboard`, `overview-rhythm`, `landing-audience`, `landing-rhythm`, `doctor-schedule-layout`, `doctor-responsive-a11y`, `avatar-sizing` | Pass |

- **Unit test changes:**
  - New `upcoming-availability.test.tsx`: today before, during and after its hours.
  - `doctor/page.test.tsx`: the empty day shows one "Today" card.
- **`doctor-overview-cards.spec.ts` covers:**
  - Contrast, light and dark, on a booked and an empty day. It reads real pixels from a 2× screenshot (decoded in a blank page) and compares each free band's stroke (with the ground and with its own fill), each booked capsule, the Now line and both legend swatches against the ground beside them. It also asserts that the ground is exactly the surface colour.
  - Equal heights per row and at most 48px unused, at 1440, 1278 and 1046, for the booked day, the empty day and after hours.
- **`doctor-overview-hours.spec.ts` covers:** the whole day on the strip at 5 PM, "until 7 PM", the single Today card, Start Consultation unavailable, the after-hours line and "Ended", and the day off.
- **Browser matrix:** 1440×900, 1278×748, 1046×612 and 390×844, in EN and AR, light and dark, for the booked day, the empty day and after hours (48 combinations). In all of them: no sideways scroll, no overlapping or clipped hour labels, three legend swatches, equal row heights.

**Existing e2e failures, not caused by this change:**

| Spec | Why it fails |
|---|---|
| `doctor-schedule-calendar` "week view scrolls…" | Fails at night. The mock seeds the doctor's visits around the current time, so after about 8 PM the calendar stretches to the whole day and "8 AM" is no longer at the top. The calendar's time-window logic is untouched |
| `real-booking-flow` | Stale since the booking redesign (2026-09-26). Its "first slot" finder now clicks a day button. A real slot click still reaches "Confirm booking" (checked by hand) |
| `patient-journey` "Browse Doctors is reachable…" | Looks for a "Browse doctors" link that the patient Overview no longer has (since Round 3) |

## Screenshots

In `docs/redesign/doctor-overview/{before,after}/`:

| What | Files |
|---|---|
| Hero timeline, light and dark | `hero-{booked,empty,after-hours}-{light,dark}.png` |
| The card rows (light) | `cards-{booked,empty,after-hours}-light.png` |
| The KPI strip | `kpi-*.png` |

Notes:
- **Booked "before":** taken at the real time of capture (about 5:50 PM, after `doctor@`'s 9–5 hours). **Booked "after":** taken at 11 AM, so free time and visits show together. The empty-day (5 PM) and after-hours (9:30 PM) states use the same clock in both.
- **After only:**
  - `hero-booked-ar-dark.png`, `hero-booked-390.png`;
  - `schedule-{light,dark}.png`;
  - `vignette-{doctor,patient}-{light,dark}.png`.
