# ORIVEX — Vertical spacing rhythm (landing + dashboards)

**Scope:** spacing only, on the public landing page and the dashboard pages named in the brief. The visuals stay as they were, apart from the list caps described below. No API, schema or OpenAPI change.

## Tokens

All tokens live in `apps/frontend/src/design-system/tokens/scales.css`, next to the existing density tokens.

| Token | Value | Use |
|---|---|---|
| `--section-y` | **96px** from 1024px; `--section-y-md` **72px** from 640px to 1023px; `--section-y-sm` **56px** below 640px | One landing step. `--section-y` is the live value; the media queries switch it |
| `--section-head-gap` | **40px** | Landing: from a section's heading block to its content |
| `--group-gap` | **32px** comfortable, **24px** compact (doctor) | Dashboards: between a page's groups. **Replaces `--section-gap`** (40 / 28), which is removed |
| `--card-gap` | 20px comfortable, 16px compact (unchanged) | Dashboards: between the cards in one group, **on both axes** |

`docs/16-design-system.md` lists the new tokens.

## Landing

### The `LandingSection` wrapper

`features/landing/components/landing-section.tsx` is a new wrapper. The existing shared `Section` is a titled sub-region for dashboards, so I made a separate wrapper instead of stretching that one.

- **Canvas** (the default): `padding-block: calc(var(--section-y) / 2)`. Two neighbouring sections add up to one full step.
- **`fullTop` / `fullBottom`:** the full `--section-y` on one edge, where no neighbour supplies the other half.
- **`variant="band"`:** a full-bleed band, padded inside by the full `--section-y` on both edges.
- **Horizontal layout:** stays with the `Container` inside each section.
- **Content:** a section's content has no outer margin or padding of its own.

| Section | Rhythm |
|---|---|
| Hero | Keeps its top offset. Its bottom adds nothing, except 24px between 640 and 1023px, so the step is measured from the "Your health, our priority" card that hangs below the photo |
| Specialties | `fullTop`: the first section after the hero |
| Top Rated Doctors, How ORIVEX Works, Everything You Need | Canvas |
| For patients | `fullBottom`: it faces the ink band |
| For doctors | `variant="band"`: 96 inside, top and bottom |
| Security & Trust | `fullTop`: right after the band |
| FAQ | Canvas. The dot decorations stay absolutely positioned, raised into the section's top padding |
| Closing CTA | `fullBottom`: the last section before the footer. Its panel is padded inside by the full step (see the first choice to confirm) |

Heading block → content is `--section-head-gap` (40) in every section. In Everything You Need it is the gap between the heading column and the cards, both stacked and side by side.

### Measured gaps (visible content to visible content, or to a band edge)

**Before** is the previous build at 1278px. My first probe reproduced the brief's 64–217px range. **After** is the final build, measured by the new spec.

| Gap | Before (1278) | After (1440 / 1278) | After (768) | After (390) |
|---|---|---|---|---|
| Hero → Specialties | 183 | 98 | 72 | 56 |
| Specialties → Top Rated | 180 | 96 | 72 | 56 (was 88: see below) |
| Top Rated → How it works | 160 | 96 | 72 | 56 |
| How it works → Everything You Need | 155 | 96 | 72 | 56 |
| Everything You Need → For patients | 219 | 96 | 72 | 56 |
| For patients → ink band | 142 | 96 | 72 | 56 |
| Ink band, inside top / bottom | 87 / 100 | 96 / 96 | 72 / 72 | 56 / 56 |
| Ink band → Security & Trust | 65 | 97 (Arabic 94) | 73 (Arabic 70) | 57 (Arabic 54) |
| Security & Trust → FAQ | 135 | 98 | 74 | 58 |
| FAQ → CTA panel | 204 | 96 | 72 | 56 |
| CTA panel, inside top / bottom | 48 / 48 | 97 / 97 | 73 / 73 | 57 / 57 |
| CTA → footer | 127 | 96 | 72 | 56 |

Every value is within the brief's tolerance (88–104, 64–80, 48–64), in English and Arabic. The remaining 1–2px come from where text sits inside its line box.

### Two causes the brief's measurement surfaced

- **The "stray 24px on Top Rated" is not a margin.** It is the scroll reveal's starting state (`RevealOnScroll`: 24px lower, transparent) on a section that hasn't scrolled into view yet.
  - Measured on a fresh load, the first below-the-fold section reads 24px too far down.
  - Once a section has revealed, the offset is 0, and with reduced motion it never applies.
  - I kept the animation. The spec measures with reduced motion.
- **A real stray gap on phones:** Specialties → Top Rated measured 88 instead of 56 at 390px.
  - The hidden desktop carousel hid only its inner scroller. Its empty outer box stayed in the flex column and took a 32px gap.
  - The mobile and desktop carousels (and their loading skeletons) are now shown and hidden by wrapper elements.

## Dashboards

### The two-level rhythm

- **`Page`** (`PageContainer`): its children are the page's groups, one `--group-gap` apart (was a fixed `gap-6`).
- **`DashboardGroup`** (new, `shared/ui/layout/page.tsx`): cards that belong together, stacked one `--card-gap` apart. It also serves as a column of cards inside a grid cell.
- **`DashboardGrid`:** one `--card-gap` on both axes (was `gap-4`). It already used `items-start`, so cards are never stretched to match a neighbour.

### Patient Overview

Three groups:
1. The greeting and next appointment.
2. Where things stand: needs attention, the metric strip, the profile nudge and the health snapshot.
3. The widgets.

In the widgets group, Recent activity (the tallest list) stands beside a column holding Active prescriptions and Quick actions. Recent medical records takes the full width below. This is the "span the taller card" option, built as a column inside a grid cell rather than with `grid-template-areas`: a card in a column stays one gap below the card above it, whatever the height of the card beside it.

### Doctor Overview

The greeting, the metric strip, then one widget group of two grids, 16px apart on both axes. The lists stop at three rows:

- **Upcoming work:**
  - Shows the visit in progress (or the next one) and what follows. Once the day is done, it shows the last three.
  - A "View all (12)" link opens Appointments. New string: `doctor.dashboard.upcomingWorkViewAll`, in English and Arabic.
  - Before, it listed every visit of the day: 962px tall next to a 361px Patient Queue.
- **Recent Activity:** 3 rows (was 5). It already had "View all".

### Paired card heights (left / right column, px)

| Account (demo data) | Width | Before | After |
|---|---|---|---|
| Patient `patient@` | 1440 | 131 / 385 and 282 / 178 | 329 / 385 |
| Patient `patient@` | 1046 | 131 / 406 and 302 / 222 | 373 / 406 |
| Patient `patient02@` (the brief's 200 vs 385 case) | 1440 | — | 398 / 364 |
| Doctor `doctor@`: Upcoming work / Patient Queue | 1440 | 962 / 361 | 313 / 361 |
| Doctor `doctor@`: Upcoming work / Patient Queue | 1046 | 1081 / 371 | 386 / 371 |
| Doctor `doctor@`: Progress / Availability / Activity | 1440 | 337 / 337 / 602 | 337 / 337 / 382 |

### Other pages

Hardcoded top-level gaps were replaced with the tokens:

| Page | Before | After |
|---|---|---|
| Records | Titled sections `gap-6`; the wide column used `lg:col-span-2` inside a container-query grid | `--group-gap` on both axes; `@wide:col-span-2` |
| Prescriptions | `mt-6 gap-6`; the same `lg:col-span-2` mismatch | `--group-gap`; `@wide:col-span-2` |
| Profile (patient, edit mode) | `gap-6` between the two form cards | `--card-gap` |
| Earnings, Reports | `gap-6` | `--group-gap` |
| Schedule | `gap-6` / `gap-4` | Columns `--group-gap`; card stacks and the bottom row `--card-gap` |
| Patient chart (doctor) | Top stack `gap-6`; stat tiles `gap-3`; tab cards `gap-6` | `--group-gap`; `--card-gap`; `--card-gap` |

The `lg:col-span-2` mismatch matters at 1046px with the sidebar open. The grid has one column there, but the viewport is wider than `lg`, so the spanning cell added a stray implicit column. The sidebar column also stacked one row too low.

The doctor's own Profile page needed no change: its blocks are the `Page`'s direct children.

## Exceptions, with reasons

- **Paired heights depend on the data.**
  - On a quiet day, "Today's Progress" is a one-line card (111px) beside Availability (337px). The brief says not to stretch empty cards, so it stays short.
  - With `patient02` at 1046px, Quick actions wraps its buttons onto three lines, and the pair differs by 75px.
- **Inside a card nothing changed.** The Schedule agenda's `gap-8` is not between top-level blocks.
- **Inside a dashboard `Section`, heading → content stays 16px.** That is the existing `Section` heading gap.
- **Within a landing section, between content blocks:** for example Specialties' stats → carousel and FAQ's questions → contact strip stay at 32px, as before. Security & Trust keeps 40 between its list and its summary line, as before.

## Choices to confirm

- **The closing CTA as a band.** The brief treats it as a band. I kept it a contained panel, the same shape as the "For patients" panel, and gave it band spacing:
  - the full step from the FAQ to its edge;
  - the full step inside, top and bottom (it was 48);
  - the full step from its edge to the footer.
  
  Making it full-bleed would be a visual change beyond spacing.
- **Where the patient Overview's widgets sit.** Recent medical records moved from the left of Quick actions to a full-width row at the bottom, and Quick actions moved under Active prescriptions. This is the arrangement that keeps the two columns level for the brief's own numbers (200 vs 385).
- **"View all (12)" on Upcoming work** goes to Appointments, the doctor's full list.

## Verification

| Check | Result |
|---|---|
| Typecheck | Clean |
| Lint | 0 errors (8 existing warnings) |
| Production build | OK |
| Unit tests | 902/902 across two runs. One test was updated for the three-row cap: `doctor/page.test.tsx` no longer expects a completed morning visit on the Overview. The Reports deep-link test failed once under full-suite load and passes on its own (11/11) and in the other full run |
| New `landing-rhythm.spec.ts` | 11/11 |
| New `overview-rhythm.spec.ts` | 2/2 |
| `shell-layout-integrity`, `landing-audience`, `avatar-sizing`, `doctor-overview-hours`, `doctor-dashboard`, `patient-overview`, `doctor-responsive-a11y`, `doctor-schedule-layout` | Pass |
| `patient-dashboard.spec.ts` | Pass, after resyncing one stale assertion |

What the new specs cover:

- **`landing-rhythm.spec.ts`:**
  - Signed out: every gap in the table above, at 1440, 1278, 768 and 390, in English and Arabic.
  - Signed in at 1046: a patient (AR, dark) and a doctor (EN light, AR dark).
- **`overview-rhythm.spec.ts`:** on both Overviews, at 1440, 1046 and 390, in English and Arabic:
  - groups are `--group-gap` apart;
  - cards in a group are `--card-gap` apart;
  - grid columns and rows use the same gap.

The stale `patient-dashboard.spec.ts` assertion dated from Round 3, which removed the duplicate empty "Upcoming appointments" card. The spec now checks the greeting's "No upcoming appointments".

## Screenshots

Full-page before and after shots are in `docs/redesign/spacing-rhythm/{before,after}/`:

- the landing (signed out);
- the patient Overview (`patient@`);
- the doctor Overview (`doctor@`, a busy day).

Each comes at three settings: 1440 EN light, 1046 AR dark and 390 EN light.
