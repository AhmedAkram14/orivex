# ORIVEX — Patient intake (`/[locale]/patient/intake`)

**Scope:** the "a few details" step a new patient completes before booking. UI only.

**Unchanged:**
- the same three fields;
- the same endpoint and hook (`PATCH /accounts/me`, `useUpdatePersonalProfile`);
- the same body shape and formats;
- the same redirect after saving (`/patient`, after invalidating `journey-status`);
- the same URL.

No API or OpenAPI change.

## Before → after

| | Before | After |
|---|---|---|
| Chrome | The full app shell: a sidebar with every section ("Overview" highlighted), search and notifications | The focused layout role selection already uses: logo, "Need help? Contact support", the account menu, **no sidebar** |
| Context | A heading and a form floating on the canvas | A 2-step progress ("1 Role · 2 Your details"), "A few details before your first visit", a subtitle, one 520px card with an ID-card illustration, a trust line |
| Full name | Label plus plain grey text | A read-only field (same height and border as the inputs, `surface-2`, a lock at the inline end) with helper text |
| Date of birth | Native `<input type="date">`, shown as `mm/dd/yyyy` | Day / Month / Year selects (months by name, years newest first) |
| Gender | A dropdown with 3 options | A segmented control: a radiogroup with arrow keys, same options, order, values and labels |
| Phone | One free-text field with a placeholder | A fixed `🇪🇬 +20` prefix and the local number masked `1XX XXX XXXX`, `inputmode="tel"`, with a line saying who sees it |
| Errors | Text only | Under the field with an icon, linked with `aria-describedby`, shown only after the field is left or on submit; focus moves to the first invalid field |
| Phone layout (390×844) | Sidebar collapsed into the app's mobile chrome | "Step 2 of 2", the illustration hidden, a full-bleed card, the button and trust line pinned to the bottom. The whole form and the button fit with no scrolling |

## What I checked, and the copy it led to

### Name: not editable, anywhere

- `PATCH /accounts/me` (`UpdatePersonalProfileRequestDto`) takes only `dateOfBirth`, `gender`, `nationalityId`, `address` and `phoneNumber`.
- No other endpoint edits the name. The patient profile editor excludes it (`PatientProfileForm`'s own note), and the backend sets the display name only at registration.

So the field stays read-only, and the brief's "Edit in profile settings" would point to something that doesn't exist. The helper says: **"From your account. To change it, contact support."** The link is the support email the header already uses.

### Phone: who uses it

- There is **no SMS or push provider**: the notification module's channels say "SMS/push are deliberately excluded -- no provider exists for either". So "appointment reminders" would be untrue.
- The number **is shown to doctors**: `GET /appointments/doctor/patients` returns each patient's `phoneNumber` to a doctor, for patients who have appointments with that doctor.

The helper says: **"Shared with the doctors you book with, so they can reach you."**

### Trust line

The brief's "Only you and the doctors you book with can see these details" leaves out admins. A SuperAdmin can look up any account (`GET /accounts/:id`, used by verification review), and access is role-based.

The line says: **"Only you, the doctors you book with and authorized ORIVEX staff can see these details."** That matches the role-selection page's "only authorized staff" wording.

### Age bounds

Neither the frontend schema nor the API (`@IsISO8601()` only) has an age bound. I added only what the brief asks:
- **a real date:** 31 February is rejected;
- **not in the future:** compared with today in Cairo, the operating time zone.

The year list runs from this year back 120 years, as a list bound rather than a validation rule.

### "Back"

Left out:
- Choosing "I'm a patient" already created the patient profile (`GET /patients/me` on role selection), and going back to `/journey` can't undo that.
- A patient who meant "doctor" can still apply from "Become a Doctor" in the account menu, which is in this page's header.

### Button label

Kept as **"Save and continue"** (the existing string). The redirect after saving goes to the patient home (`/patient`), not straight into booking, so "Continue to booking" would promise something the flow doesn't do.

## The payload (same as before)

| Field | Before (same answers) | After |
|---|---|---|
| `dateOfBirth` | `"1990-03-15"` (the date input's value) | `"1990-03-15"` (Day/Month/Year composed) |
| `gender` | `"female"` | `"female"` |
| `phoneNumber` | as typed, e.g. `"+20 100 123 4567"` (the placeholder's format) | `"+20 " + the masked local number` → `"+20 100 123 4567"` |

- **Phone typing:** a leading `0` (`0100…`) is dropped.
- **Saved numbers:** `+20…`, `0020…`, `+20100…` and `0100…` all show as the local part.
- **Validation is unchanged:** the same `^\+?[0-9\s-]{7,20}$`, run on the full value. The input accepts up to 10 local digits.
- **Other countries:** the old free-text field technically accepted any country code. Egypt V1 is single-country, so the prefix is fixed at `+20`. If foreign numbers must be accepted, the prefix needs a country picker; say if you want one.
- **Proof:** a unit test and the browser check both captured the PATCH body for the same answers and found it equal to the object above.

## Structure

- **Route:** moved out of `(protected)` to `app/[locale]/patient/intake/`, with the same URL.
  - Its `layout.tsx` re-exports role selection's auth-only layout, so nothing new was created.
  - `RequireRole(['patient'])` is unchanged.
- **`FocusedHeader`:** role selection's header (logo, help, account menu) became one component that both pages use.
- **Progress:** the booking flow's step indicator (numbers plus the `PulseLine` track) became the shared `StepProgress`, used by booking and the intake. Booking renders exactly as before.
- **Card** (`sm`+): 520px, `--r-card`, `surface`, 1px border, 32px padding. A 72px `id-check` scene sits at the top: a new duotone scene in the shared set, an ID card with a plain silhouette (no face) on a peach disc, with a lime check.
- **Fields:**
  - labels 14px/600;
  - 8px from label to control;
  - 20px between fields;
  - helper text 13px muted.
- **Button:** lg, full width. It's disabled until the date is complete and gender and phone are filled, and shows a loading state while saving.
- **Short windows:** on desktop windows under 800px tall (the brief's 1150×674), the card is taller than the screen. The button bar is pinned to the bottom of the card's view so it stays reachable; the fields scroll under it.
- **RTL:**
  - the date order mirrors (Day at the inline start);
  - `+20` sits in `<bdi dir="ltr">` at the inline start, with the number aligned next to it;
  - the lock is at the inline end;
  - the illustration doesn't mirror.
- **Dark:** the card on `surface` and the read-only name on `surface-2`. The selected gender pill measures **15.6:1** against the card (17.5:1 in light).

## Shared changes

- **`SegmentedControl`:** an opt-in `mode="radio"`, giving:
  - a `radiogroup` with `role="radio"` and `aria-checked`;
  - one tab stop;
  - arrows (mirrored in RTL), plus Home and End, that move and select;
  - `onBlur` for "touched";
  - a focus ref for the form;
  - `invalid` and `describedBy`;
  - `fullWidth`.

  Every current user keeps the default `aria-pressed` toggle behaviour, and their tests pass.
- **`form.tsx`:** `useFormField` is exported, so a control made of several elements can wire its own `aria-*`. `FormMessage` takes an optional `icon`.
- **`StepProgress`**, **`FocusedHeader`** and the **`id-check`** scene, described above.
- **The essentials schema:** date of birth must also be a real date and not in the future, with two new strings. Only the intake uses this schema.

## Verification

| Check | Result |
|---|---|
| Typecheck | Clean |
| Lint (changed files) | Clean |
| New `essential-info-step.test.tsx` | 5/5 |
| Affected suites: journey, booking flow, book page, profile page, reschedule, form, and every `SegmentedControl` user (scheduling, payment, allergy prompt, notification panel) | Pass (31 and 127 tests in two runs) |
| Full unit suite | 953/960 in one full run. The 7 that failed had durations of hours (the machine stalled mid-run); all 7 (disputes, booking flow, schedule page) pass when re-run, 41/41 |
| Production build | OK (145 pages; `/[locale]/patient/intake` builds at its new location) |
| `shell-layout-integrity.spec.ts` | 8/8 |
| `patient-journey.spec.ts` | Role-selection test updated (it still expected the pre-redesign buttons) and passing. Its "Browse Doctors" test fails, but that is older and unrelated: the patient dashboard has no lowercase "Browse doctors" link any more |
| Browser (EN/AR, light/dark at 1440×900, 1150×674 and 390×844; 7 combinations) | No sidebar; no sideways scroll; the button on screen in all |
| axe (WCAG 2.1 AA and best practice): EN light 1440, AR dark 390, EN dark 1150, with an error showing | No violations |

- **`essential-info-step.test.tsx` covers:**
  - the exact PATCH body for the same answers;
  - no errors on first render;
  - an error only after leaving the empty date, not while moving between its selects;
  - the error linked to the field;
  - the read-only name;
  - a future date rejected, with focus on Day;
  - 31 February rejected;
  - prefill from a saved `+201…` number.
- **Browser behaviour, all passed:**
  - payload identical, then the redirect to `/en/patient`;
  - a future date rejected and focus moved to Day;
  - 31 February rejected;
  - arrows move and select in the gender group, which has one tab stop;
  - the date selects are labelled Day/Month/Year;
  - errors linked with `aria-describedby`.

  The checks ran against a dev server, with the page's API calls answered in the browser, so nothing was written to a database.

## Screenshots

In `docs/redesign/intake/`:

| | Before | After |
|---|---|---|
| Desktop EN light (1440×900) | `before/en-light-1440.png` | `after/en-light-1440.png` |
| Desktop EN light (1150×674) | `before/en-light-1150.png` | `after/en-light-1150.png` |
| Mobile AR dark (390×844) | `before/ar-dark-390.png` | `after/ar-dark-390.png` |

Both sets also have `en-dark-1440`, `ar-light-1440`, `ar-dark-1150` and `en-light-390`. "After" also has `states-*`: the gender selected and the date error showing, in EN light 1440, EN dark 1150 and AR dark 390.
