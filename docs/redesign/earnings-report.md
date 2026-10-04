# ORIVEX — Doctor › Earnings

**Scope:** `/[locale]/doctor/earnings` only.
- Same endpoints, same query (`?dateFrom=&dateTo=`), same response fields.
- No OpenAPI or backend change. The fields the page reads, and the few it lacks, are listed under [Data](#data-no-api-change).

## Before → after (1440, EN, light, 30 days)

| | Before | After |
|---|---|---|
| Header | Title only. "See your reports for this period" floated above the toolbar, and Export CSV sat at the toolbar's far end | `Export CSV` (secondary) and `View reports →` (ghost) in the header |
| Summary | A hero card with one figure and about 250px of empty space, plus two **lifetime** tiles ("All time — not affected by the date range") next to range figures | **One card, all in the range:**<ul><li>Net (metric-xl, with a delta vs the previous equal-length period);</li><li>Gross;</li><li>Platform commission with "15% of gross";</li><li>Paid consultations.</li></ul>Lifetime net is one quiet line in the caption |
| Where the money went | The commission rate only in a note under the chart | One bar: net in ink, commission muted and hatched, with labels at each end |
| Chart | "Monthly breakdown", always the last 6 months. At 30 days it showed 2 bars (Sep, Oct), with axis labels such as `10000` | "Earnings over time". It follows the range (daily, weekly, monthly), has 3 gridlines with compact labels (`1.5K`), the range in words as the subtitle, a tooltip, and arrow keys |
| Transactions | Behind a "Details" toggle. Columns: Patient, Date, Fee, Status. Raw statuses ("Succeeded", "Settled"). A "View appointment" link on every row | A full card. **Columns:** Patient (avatar and name), Date, Gross, Commission, Net, Status. **Behaviour:**<ul><li>doctor-facing statuses;</li><li>the whole row opens the appointment;</li><li>rows grouped by month under sticky headers;</li><li>20 rows, then "Show N more";</li><li>cards below 640px</li></ul> |

## Structure

1. **Header:** breadcrumbs, title and description. Actions: `Export CSV` (the existing `ExportEarningsButton`, now given the page's range) and `View reports` (ghost, links to `/doctor/reports`, arrow mirrored in RTL).
2. **Range toolbar:** the existing presets (7 days, 30 days, 90 days, This month, All time) and Custom range, unchanged. The range is now kept in the URL (`?dateFrom&dateTo`), so a reload or a shared link keeps it.
3. **Summary card** (`earnings-summary-card.tsx`):
   - **Four segments** separated by hairlines: `1.5fr` for net plus three equal columns. Below the card's `@2xl` width, net spans the top and the others sit two by two.
   - **Delta:** `+10%` (success), `−8%` (danger), or a neutral `—` when the previous period has no earnings.
     - Helper text: "vs prev. 30 days".
     - All time has no previous period, so it shows no chip and the helper reads "All time".
   - **Where-it-went bar:**
     - net is `text-primary`;
     - commission is `text-primary` at 50% with a 135° hatch in the surface colour;
     - one `role="img"` label reads the whole split.
   - **Caption:** "Recorded earnings, not payouts · Net is after commission and before tax · ⓘ Learn more".
     - Learn more is a popover with the three existing disclaimers.
     - "Lifetime net: EGP 52,275.00" sits on the end side.
4. **Earnings over time** (`earnings-chart.tsx`):
   - **Granularity:**

     | Range length | Bars |
     |---|---|
     | ≤ 31 days (7 days, 30 days, This month) | Daily |
     | ≤ 120 days (90 days) | Weekly, counted back from the end of the range, so the last bar always ends on the range's last day |
     | Longer, or All time | Monthly. All time starts at the first month with a payment, not at 2020 |

   - **Bars:**
     - each bar is `text-primary` at 60%;
     - the latest bar is solid ink with a 3px lime (`pulse`) cap;
     - empty buckets are a 2px tick at the baseline;
     - the highest bar carries its value ("850").
   - **Axis:** 3 dashed gridlines on round steps, with compact labels. X labels are thinned to one per about 90px, so a phone shows 3 or 4.
   - **Tooltip:** date (or week range, or month), Gross, Commission, Net and the consultation count. It is anchored inside the card at both ends.
   - **Keyboard:**
     - one tab stop on the latest bar;
     - ←/→ in reading direction (mirrored in Arabic);
     - Home and End;
     - Escape hides the tooltip.

     Each bar is a button labelled "Sep 12: EGP 850.00".
   - **No earnings:** baseline ticks with one quiet line, "No earnings in this period". There's no second illustration; the transactions card has the empty state.
5. **Transactions** (`earnings-transactions.tsx`):
   - **Table:** `table-fixed`. Money is end-aligned and tabular. Commission and Net show `—` on rows that earned nothing (refunded, failed, processing).
   - **Month groups:** one `<tbody>` per month. Its header row ("September 2026 · EGP 8,925.00 net") sticks under the app bar while that month scrolls.
   - **Rows:** a click anywhere opens `/doctor/appointments?highlight=<appointmentId>`, the same target the old "View appointment" link used. The patient name is also a real link, so keyboard and screen-reader users get one focusable target per row.
   - **Below 640px of card width:** one card per payment, under the same month headings: name and date on the start side; net and status on the end side; gross and commission on a quiet line beneath.
   - **Paging:** 20 rows, then "Show 20 more" (or the remainder).
   - **Empty:** the shared `EmptyState` (records illustration), "No paid consultations in this period", with an "Open your schedule" link.

**Removed:**
- the hero card;
- the two lifetime tiles;
- the "Details" toggle;
- the floating "See your reports for this period" link;
- the fixed 6-month chart;
- the "View appointment" column;
- the old page's strings, replaced by the new set (38 removed and 24 added in each locale).

## Data (no API change)

### Fields used

| On the page | Source |
|---|---|
| Net, Gross, Commission, Paid consultations | `GET /payments/doctor/earnings-summary?dateFrom&dateTo`, summed over `cycles[]` (`netAmount`, `grossAmount`, `commissionAmount`, `transactionCount`) |
| "15% of gross" | `commissionRate` from the same response. Never hard-coded |
| Delta | **The same endpoint, called a second time with the previous equal-length range.** For example, 30 days of Sep 3 – Oct 2 is compared with Aug 4 – Sep 2. Change = (net − previous net) ÷ previous net. When previous net is 0 the chip is `—`. Not requested for All time |
| Lifetime net | `lifetimeNetAmount` from the current call |
| Chart bars, tooltips, month headers, table rows | `GET /payments/doctor/earnings-transactions?dateFrom&dateTo`: `grossAmount`, `currency`, `status`, `createdAt`, `patientName`, `appointmentId` |
| Per-row Commission and Net | **Derived on the client with the backend's own rule** (below), using the response's `commissionRate` |
| Money | `Intl.NumberFormat` currency formatting through the existing `formatCurrency`, in the response's currency |

### The commission rule, and where it lives

`apps/backend/src/modules/payment/application/use-cases/get-doctor-earnings-summary/get-doctor-earnings-summary.use-case.ts`:
- `PLATFORM_COMMISSION_RATE = 0.15`.
- Only `Succeeded` and `Settled` payments earn.
- Per row: `commission = round2(gross × rate)` and `net = round2(gross − commission)`.
- Monthly cycles are `YYYY-MM` in UTC.

`features/payment/lib/earnings.ts` ports this rule (`isEarned`, `rowAmounts`, `round2`). The new data-consistency test checks that the rows add up to the endpoint's own totals for every preset.

The risk is that the rule now exists in two places. If the backend rule changes, this file must change with it. The alternative is an API change: add `commissionAmount` and `netAmount` to each transaction. **Not done; your call.**

### Status mapping

| Payment status | Shown as |
|---|---|
| `succeeded`, `settled` | Paid |
| `initiated` | Processing (a new shared `ds.status.processing`, info tone) |
| `refunded` | Refunded |
| `failed` | Failed |
| `disputed` | Disputed (not in the brief; kept with its shared label) |

## Findings (not changed; need a decision)

1. **Today is never included.**
   - The presets send `dateTo` as today's date (`2026-10-03`), and the backend reads it as an exclusive midnight-UTC bound (`createdAt < dateTo`). So "30 days" is Sep 3 – Oct 2, and a consultation paid this morning doesn't count until tomorrow.
   - The picker is shared with Reports and the CSV export, so they behave the same way.
   - **Fix:** send tomorrow as the exclusive bound. This is frontend-only, with no API change, but it changes the window all three use. **Do you want it?**
2. **No patient photo in the transactions response,** so avatars use initials (the shared `PersonAvatar`, 24px). A real photo needs a `patientAvatarUrl` field (API change).
3. **No pagination on `earnings-transactions`.** The whole range loads at once, as it did before, and "Show more" pages on the client. Server paging needs `limit` and a cursor (API change). It only matters for very long All-time histories.
4. **Days are UTC days,** matching the backend's cycles. A payment between 00:00 and 03:00 Cairo time falls on the previous day's bar. That was true before as well.

## Shared changes made along the way

- **`MetricStat`:**
  - New `size` prop (`'regular' | 'xl'`), so an `inline` segment can carry the hero figure.
  - The value is now wrapped in `<bdi>` instead of `dir="auto"` on its paragraph. With `dir="auto"`, a digits-only value ("23") resolved to left-to-right, so in Arabic it sat on the **left** of its tile. It now sits on the start side like the label above it, on every page that uses `MetricStat`. In English nothing moves. The overview and dashboard e2e specs pass.
- **`StatusBadge`:** a `processing` status (info tone), with `ds.status.processing` in EN and AR.
- **`useElementWidth`** (`shared/hooks/`): the ResizeObserver width hook moved out of the weekly availability editor so the chart and transactions can use it too.
- **`useDoctorEarningsSummary`:** takes `{ enabled }`, so the comparison call can be skipped for All time.
- **Mocks only:**
  - `mocks/earnings-store.ts` is a seeded, deterministic ledger for the two demo doctors, computed like the backend (the same window, earned statuses and rounding).
  - `doctor01` has none, which gives the empty state.
  - The old mock always returned an empty summary, so the page could never be seen with data.

## Choices to confirm

1. **Commission tint at 50%** rather than the brief's lighter tint. At 45% the hatched segment measured 2.90:1 on the card in light mode. 50% clears 3:1 in both modes; the e2e spec samples it.
2. **Weeks are counted back from the range end,** so the first week of "90 days" can be partial (13 bars), never the last.
3. **All time starts at the first month with a payment,** rather than drawing years of empty months back to 2020.
4. **The table switches to cards by card width (640px), not viewport width,** so it also adapts when the shell is narrow.
5. **The delta compares net,** which is what the doctor keeps.

## Verification

| Check | Result |
|---|---|
| Typecheck | Clean |
| Lint | 0 errors (7 existing warnings, none in these files) |
| Unit tests | 936/936 (224 files) |
| New `earnings.test.ts` (logic and data consistency) | 11/11 |
| Rewritten `doctor-earnings-summary.test.tsx` (UI) | 8/8 |
| Production build | OK |
| `shell-layout-integrity.spec.ts` | Pass |
| New `doctor-earnings.spec.ts` | 8/8 |
| `overview-rhythm`, `doctor-overview-cards`, `doctor-dashboard`, `patient-dashboard` | Pass (27 in that run, with the two above) |

- **Changed unit test:** `doctor/earnings/page.test.tsx` now finds "View reports" in the header and the new empty states, including "Open your schedule".
- **Data consistency (`earnings.test.ts`):** for each preset (7 days, 30 days, 90 days, This month, All time), with the clock pinned:
  - gross, commission and net from the summary equal the sum of the rows;
  - net = gross − commission;
  - the bars' net and counts add up to the summary;
  - exactly one bar is the latest;
  - the month headers' nets equal the backend's cycles;
  - refunds never count.

  It also covers bucket counts (7, 30, 13 weekly), granularity, the previous range and the change percentage.
- **`doctor-earnings-summary.test.tsx`:**
  - figures and a +50% delta;
  - the neutral `—` and All time;
  - granularity;
  - keyboard and tooltip;
  - the table's columns, month headers and statuses;
  - a row click opening the appointment;
  - Show more;
  - the empty state;
  - the range kept in the URL.
- **`doctor-earnings.spec.ts`:**
  - the chart following the presets (30 daily, 7 daily, 13 weekly, monthly for All time, with no comparison);
  - one tab stop and arrows with the tooltip;
  - a row opening its appointment, with no raw statuses and no "View appointment";
  - the empty doctor;
  - **contrast by pixel sampling in light and dark:** net, commission and chart bars are each ≥ 3:1 on the card;
  - axe in EN light (1440) and AR dark (390), with no serious or critical violations.
- **Browser matrix:** 1440, 1046 and 390 × EN and AR × light and dark × three data states (earnings, none, All time), 36 combinations. Each one checked:
  - no sideways scroll;
  - no clipped figure;
  - the right granularity;
  - the table at desktop widths and cards on a phone;
  - **the hero net equal to the sum of the chart's bars.**

  No problems.

## Screenshots

In `docs/redesign/earnings/`. The "before" shots were taken on the previous page, rebuilt with the same seeded ledger; the old mock only ever showed an empty page.

| | Before | After |
|---|---|---|
| Desktop EN light 1440 | `before/desktop-en-light-1440.png` | `after/desktop-en-light-1440.png` |
| Desktop EN light 1046 | `before/desktop-en-light-1046.png` | `after/desktop-en-light-1046.png` |
| Mobile AR dark 390 | `before/mobile-ar-dark-390.png` | `after/mobile-ar-dark-390.png` |

After only:
- `after/desktop-ar-dark-1440.png`: RTL and dark at desktop width.
- `after/empty-en-light-1440.png`: a doctor with no earnings.
