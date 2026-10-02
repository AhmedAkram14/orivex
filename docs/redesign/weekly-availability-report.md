# ORIVEX — Weekly Availability dialog (Doctor › Schedule)

**Scope:** the Weekly Availability dialog's UI only.
- The data model, the endpoint (`PATCH /scheduling/doctor-availability`) and its payload are unchanged.
- Per-day on/off, hours, pricing (Free/Paid and fee) and breaks are all still edited and saved exactly as before.
- No OpenAPI or backend change.

## Before → after (1278×748, EN, light)

| | Before | After |
|---|---|---|
| Height | 2331px of content scrolling in a 671px dialog, about 3.5 screens | Dialog 668px with **no scrolling**. All 7 days, the header and the footer are on one screen |
| Inputs | 47 text inputs (each day: a time pair, Free/Paid radios, fee, currency, "Add break") | 13 text inputs on desktop: 2 default hours, the default fee, and 2 hours per working day. A phone shows 3 until a day is opened |
| Save | At the bottom of the scroll, with the title and close button scrolling away | Sticky footer: summary, `Cancel`, `Save changes`. Save is disabled until something changes and while any row is invalid, and shows a loading state while saving |
| Differences | Found by scrolling all seven cards | One defaults bar. A day that differs gets a 3px accent bar and its own price chip |
| Currency | A second read-only "EGP" field | An inline `EGP` suffix inside the fee field |

(The brief measured 2591px with other data; the 47 inputs match.)

## Structure

- **Header** (fixed): "Weekly availability", the subtitle ("Set the hours patients can book. Times in Cairo time (GMT+3).") and the close button.
- **Defaults** (on `surface-2`):
  - **Session price:** `Free | Paid` (the shared `SegmentedControl`), with a fee field and an inline `EGP` suffix.
  - **Default hours:** a time pair, plus a quiet "Apply to all working days".
- **Week:** 7 rows of about 49px, separated by hairlines rather than cards.

  | Column | Content |
  |---|---|
  | Day | Switch + name |
  | Hours | Time pair |
  | Breaks | Chips such as "1 – 2 PM ✕", and "+ Break", which opens a popover with a time pair |
  | Price | "Default" (muted), or the day's own price as a chip ("Free", "EGP 450"). Either opens a popover with Free/Paid, the fee, "Use default" and "Done" |
  | ⋯ | "Copy to…" (a day list with checkboxes, then "Copy to N days") and "Reset to default" |

  A day that's off reads "Unavailable", and its other cells are hidden.
- **Footer** (fixed):
  - On the start side, a summary: "5 working days · 35 h/week · no custom prices". Hours exclude breaks.
  - On the end side, Cancel and Save changes.
- **Below 640px:**
  - The dialog is a full-height bottom sheet with the same fixed header and footer.
  - Each day is a collapsible row ("Sun · 9 AM – 5 PM · Default"), with one row open at a time. An open row shows the time pair, breaks, price and ⋯.
  - Below 680px of dialog width, the editor uses these rows instead of the table, so it never scrolls sideways.

### Behaviour

- **Validation:** the same rules as before, from the same schema:
  - the end must be after the start;
  - breaks must sit inside the hours and must not overlap;
  - at most 5 breaks;
  - a Paid price needs a fee.

  Each message appears under its row in danger text, with the row's fields marked invalid. A Paid default with no fee is reported once, on the defaults bar.
- **Discard:** closing with unsaved edits (×, Escape, the overlay or Cancel) asks "Discard changes?" through the shared `ConfirmDialog`. This replaces the old `window.confirm`. The browser-level guard for tab close and navigation stays.
- **Keyboard:**
  - Tab moves row by row: switch, time fields, break chips, "+ Break", price, ⋯.
  - Escape closes an open popover or menu before the dialog.
  - "Copy to…" works by keyboard: arrows, Space to tick, Enter to copy.
- **RTL:**
  - Columns mirror, as does the submenu chevron.
  - Time ranges sit in `<bdi dir="ltr">`. An Arabic day-period marker ("ص"/"م") would still pull "– 5:00 م" into a right-to-left run inside that isolate, so an invisible left-to-right mark after each Arabic run keeps "9 ص – 5 م" in start-to-end order. Screen readers ignore it.
- **Dark mode:** the dialog is on `surface` and the defaults bar on `surface-2`. The override bar and custom-price chips use the availability tokens from the previous round (`avail-stroke`: 6.1:1 light, 12.7:1 dark).

## Mapping to the data (no API change)

- **Defaults are computed in the editor and never stored.** On open, the default price and hours are the most common values across the working days; a tie goes to the earliest day.
  - A day whose price matches the default exactly (type, amount and currency) follows it, so it saves byte-for-byte what it loaded.
  - Days that differ keep their own value as an override.
- **Price follows the default; hours don't.** Changing the default price updates every day that follows it. Changing the default hours moves nothing until "Apply to all working days" (working days only).
- **On save,** every day is expanded back to its explicit hours, breaks and price. It then runs through the old form's own submit steps, unchanged (`toSavePayload`):
  1. The existing zod schema parse.
  2. The same pricing normalisation: Free sends no fee; Paid with no currency defaults to EGP.

### Fields that needed special handling

| Field | How it's handled |
|---|---|
| Off days' `hours`, `breaks`, `pricing` | Hidden in the UI but **kept as loaded** and sent unchanged, as before |
| `pricing.feeCurrency` | **No longer editable.** The old form had a free-text currency field. The loaded value is kept, shown as the suffix and sent unchanged. Paid with no currency still defaults to EGP on save. If you want the currency editable (Egypt V1 is single-currency), this is the one field the layout doesn't expose |
| A Free day's leftover fee | As before, a fee typed and then switched to Free is sent as `null` |
| "Default" | Not a field. It exists only in the editor |

### Round trip (the brief's test)

**Fixture:** six days Paid 320 EGP, Friday Free, a break on Sunday. The baseline was **captured from the pre-redesign form** before it was removed: its exact PATCH bodies are stored in `__fixtures__/weekly-availability-baseline.json`.

| Case | Result |
|---|---|
| No changes | The payload equals the old form's body **byte-for-byte**, and nothing reads as changed. Save stays disabled with no changes, as the brief asks, so this is checked on the payload the editor would send rather than by clicking Save |
| Friday Paid 450 and a Monday break, through the real UI | The PATCH body equals the old form's body for the same edit, **byte-for-byte**. Only `monday.breaks` and `friday.pricing` differ from the unchanged payload |
| In the browser (e2e, the mock backend) | Saving Monday at 450 changes only `monday.pricing` among the 7 days sent |

## Components reused

- **Shared UI:** `Dialog` / `DialogContent` / `DialogTitle` / `DialogDescription`, `ConfirmDialog`, `Switch`, `Input` (time and number), `SegmentedControl`, `Popover`, `DropdownMenu` (with `Sub` and `CheckboxItem`), `Accordion`, `Button`, `Alert`.
- **Hooks:** `useUnsavedChangesGuard`, and the existing `useUpdateDoctorAvailability`.
- **Logic:** the existing `createWorkingHoursSchema`.

**New:**
- `features/scheduling/lib/weekly-availability.ts`: the defaults, expansion, summary and validation logic, pure and unit-tested.
- `components/weekly-availability-editor.tsx`.
- `components/weekly-availability-dialog.tsx`.

**Removed:** `WorkingHoursForm` and its test, the page's separate Sheet branch and its `window.confirm`, and 10 strings only the old form used. There are 33 new `scheduling.availability.editor.*` strings in EN and AR.

### A shared fix found on the way

Every `DropdownMenu` rendered at `--z-dropdown` (1000), below drawers (1300) and dialogs (1400). A menu opened inside a dialog drew behind it and couldn't be clicked; the ⋯ menu here is the first one inside a dialog. Menu and submenu content now use the popover layer (1500), like `Popover`. `--z-dropdown` stays for the back-to-top button.

## Choices to confirm

1. **Compact time fields drop the browser's clock icon** in the table and the defaults bar, so "09:00 AM" fits at 36px tall in a 760px dialog. The time is typed or stepped with the arrow keys, and phones open their native picker on tap. The popovers and the phone rows keep the icon.
2. **Break chips show the hour only when on the hour** ("1 – 2 PM"); otherwise minutes are shown ("1:30 – 2:15 PM").
3. **Rows are about 49px** (the brief said about 56px), so the whole week fits at 1278×748.
4. **The dialog may use the full height minus 2rem** (it was capped at 90% of the viewport). That's what fits the week at 748px tall.
5. **"Reset to default"** sets the default hours and price and keeps the day's breaks.
6. **"Copy to…"** copies the working state, hours, breaks and price.
7. **The currency is no longer editable** (see the table above).

## Verification

| Check | Result |
|---|---|
| Typecheck, lint | Clean (0 errors, 8 existing warnings) |
| Unit tests | 922/922 (223 files) |
| New `weekly-availability.test.ts` (logic) | 12/12 |
| New `weekly-availability-editor.test.tsx` (UI) | 8/8 |
| Production build | OK |
| `shell-layout-integrity.spec.ts` | Pass |
| New `weekly-availability.spec.ts` | 8/8 |
| `doctor-schedule-layout`, `doctor-schedule-calendar`, `doctor-responsive-a11y`, `avatar-sizing`, `doctor-overview-cards` | Pass (56 in that run) |

- **Changed unit test:** `doctor/schedule/page.test.tsx` now opens "Weekly availability" and saves with "Save changes".
- **`weekly-availability.test.ts`:** defaults, byte-identical payloads, the default price propagating, off days preserved, the summary, validation placement, Apply to all, Copy to, Reset.
- **`weekly-availability-editor.test.tsx`:**
  - the defaults view;
  - the UI round trip, byte-identical;
  - day off and on;
  - break removal;
  - "Use default";
  - Copy to by keyboard;
  - inline validation;
  - discard and no-discard closing.
- **`weekly-availability.spec.ts`:**
  - the week fits at 1278×748 with no scrolling and no sideways scroll;
  - toggling, adding and removing a break, overriding and resetting a price, Copy to by mouse;
  - validation;
  - Escape closing a popover before the dialog;
  - Discard and Keep editing;
  - a wire-level payload diff;
  - 390 AR dark: all 7 collapsed rows on one screen, one open at a time;
  - axe in EN light (1278) and AR dark (390), with no serious or critical violations.
- **Browser:** EN and AR, light and dark, at 1278×748, 1046×612 and 390×844 (12 combinations): no sideways overflow, nothing clipped, popovers on screen, the week without scrolling at 1278, all 7 rows on one phone screen.

## Screenshots

In `docs/redesign/weekly-availability/`:

| | Before | After |
|---|---|---|
| Desktop EN light | `before/desktop-en-light.png` | `after/desktop-en-light.png` |
| Mobile AR dark | `before/mobile-ar-dark.png` | `after/mobile-ar-dark.png` |

Also:
- **Both sets:** `desktop-ar-dark.png`, `mobile-en-light.png`.
- **After only:**
  - `desktop-en-light-overrides.png`: Friday on with its own price, Monday 10–4, and Wednesday invalid, showing the accent bars, chip and inline error.
  - `mobile-ar-dark-expanded.png`: one day open on a phone.
