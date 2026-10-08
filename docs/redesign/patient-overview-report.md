# ORIVEX — Patient Overview: the lower card area (`/[locale]/patient`)

**Scope:** from Health snapshot down to Recent medical records. UI only: the same hooks, endpoints and data. No API or OpenAPI change.

## Before → after (measured)

All values are from the browser. The data account is shown at 1150×674 unless a row says otherwise.

| | Before | After |
|---|---|---|
| Gaps between cards | 32px under Health snapshot, then 20px | **20px** everywhere in the area, across and down. `--group-gap` (32px) is only above the area |
| Column ends, data account | Left column ends **204px** below Recent activity at 1150, and **246px** below at 1440 | **0px**: 2207/2207 at 1150, 2050/2050 at 1440, 2237/2237 at 1046 |
| Column ends, new account | Left column ends 35px below Recent activity | **0px**: 1638/1638 |
| Corner radius | 28px (hard-coded `rounded-3xl`), and 20px on Quick actions | **20px** (`--r-card`) on every card |
| Header | Title 18/28 (`text-lg`); a 36px "View all" button (44px on touch screens) | Title `h3` 17/24/600, a "View all" text link at the inline end, header **32px** |
| Header → first content | 24–26px | **16px** on every card, Health snapshot included |
| Card padding | 24px | 24px; **20px under 640px** |
| Inner alignment | | Content starts at the same x in every card (25px from the outer edge with the 1px border; 21px on phones) |
| Rows | Prescriptions: bordered boxes with green icons. Activity: the first row had no top padding, with blue and green icons and the dot before the title. Records: coloured type badges | One row style: 12px top and bottom on every row, hairlines between rows, a 20px glyph in a 32px `surface-2` circle in ink, title 14/600, body 13 muted (2 lines max), meta 12 muted on its own line, unread dot (6px) at the inline end |
| Quick actions | A separate card with three pills on two rows | Removed (see below) |
| Prescriptions, empty | "No active prescriptions right now." as a bare sentence | `EmptyState size="sm"`: the 72px prescription illustration, "No active prescriptions", "Prescriptions from your doctors will appear here.", and a quiet "View past prescriptions" link that opens the Prescriptions page on its **Previous** tab |
| Arabic with English data | "mg, once daily 5"; a clamped English note was cut at the wrong end | Each title and body takes its own direction (`dir="auto"`) but stays right-aligned: "5 mg, once daily", with the ellipsis at the end |

Screenshots: `patient-overview/before/` and `patient-overview/after/`, same names, as `{data|new}-{locale}-{theme}-{width}.png`.

## Layout

From 1024px, the area is one grid:

```
"snapshot  snapshot"
"rx        activity"
"records   activity"
```

- Rows are `auto auto 1fr` with the default `align-items: stretch`. Prescriptions keep their own height, and Recent medical records takes what the left column has left, so both columns end on one line.
- Health snapshot renders nothing for an account with nothing to show (no vitals, conditions or allergies). In that case the grid drops its row (via `:has()`), so no empty row adds a gap.
- Below 1024px, it's one column in DOM order: snapshot, prescriptions, activity, records. That is also the reading and tab order at every width.
- Caps: activity 4 rows, records 3, prescriptions 3, each with "View all".

**The 1024px breakpoint is the viewport, not the container.** That matches the brief, and it's where the sidebar appears. At 1046 with the sidebar open, the half cards are 353px wide.

**Upcoming appointments** isn't part of the brief's grid. It moved up to the end of the group above (after the stat strip and profile nudge). It still shows only when something is upcoming.

## Where Quick actions went

The card is gone and no button row replaced it. All three actions already exist on this page and in the navigation:

| Action | Where it is now |
|---|---|
| Book appointment | The hero's call to action when nothing is upcoming; the sidebar's **Browse Doctors**; the bottom bar's **Doctors** on phones |
| View records | **View all** on Recent medical records; the sidebar's **Medical Records**; the bottom bar's **Records** on phones |
| View prescriptions | **View all** on Active prescriptions (and "View past prescriptions" when there are none); the sidebar's **Prescriptions** |

If product wants them back on Overview, the brief's version fits under the greeting: one row of three equal secondary buttons, 40px tall, `--r-control`. It is not built.

## Implementation

- `features/patient/components/overview-list.tsx` (new):
  - `OverviewList` and `OverviewRow`: the row spec above. A row can be a link, a button (mark as read) or static.
  - `UnreadDot`.
  - `CardHeaderLink`: the 32px "View all" link with a screen-reader-only context ("View all Active prescriptions").
- Recent activity:
  - renders its own rows with the same notification helpers the bell uses: localisation, ISO-time localising, the target link, mark as read, the type glyph and the "Personal" tag;
  - the doctor dashboard's activity still uses the shared `NotificationRow`, unchanged.
- `WidgetContainer`:
  - the header's bottom padding reads `--card-head-gap`, falling back to `--card-pad`. Only this area sets it (16px), so every other widget in the app is unchanged;
  - `data-slot="widget-header"` and `data-slot="widget-content"` for the layout check.
- Prescriptions page: `?tab=previous` opens the Previous tab.
- Strings (EN/AR):
  - added `viewPastPrescriptions`;
  - reworded `activePrescriptionsEmptyDescription`;
  - removed the unused `activePrescriptionsEmptyInline`, `quickActionsTitle` and `quickActions.*`, along with `patient-quick-actions.tsx`.

## Verification

- Typecheck, lint, the full unit suite and the production build pass.
- The page test now checks:
  - the new empty state and its link;
  - that the Quick actions heading is gone.
- A new Prescriptions test checks `?tab=previous`.
- New `tests/e2e/patient-overview-layout.spec.ts` (EN/AR × 1440, 1150 and 390), all passing:
  - every gap between neighbouring cards is 20±1;
  - both columns end within 1px of each other and of the area's bottom;
  - one radius (`--r-card`) on every card;
  - header 32±1, header→content 16±1;
  - one column on a phone.
- `shell-layout-integrity.spec.ts`: 8/8 pass.
- Browser matrix, with every API call answered in the browser (no database), for two accounts: one with prescriptions, activity, records, vitals and appointments, and a new one with nothing.
  - Sizes: 1440×900, 1150×674, 1046×612 and 390×844, in EN and AR, light and dark.
  - Results: the measurements above, no sideways scroll, and axe (WCAG 2.1 AA + best practice) clean on `main` at 1440 and 390.
