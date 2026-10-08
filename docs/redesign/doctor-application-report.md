# ORIVEX — Doctor application (`/[locale]/doctor/onboarding`) and identity verification

**Scope:**
- The 4-step doctor application and its status screen, plus patient identity verification, which shares the upload step and the status screen.
- UI only. **Unchanged:**
  - every field and validation rule;
  - every endpoint: `PATCH /accounts/me`, `POST /doctors`, `PATCH /doctors/me`, the media upload-intent / PUT / confirm, `POST /doctors/:id/verifications`, `POST /patients/:id/verifications`;
  - the status transitions and redirects;
  - both URLs.
- No API or OpenAPI change.
- `ORIVEX_onboarding_flow_redesign.md` isn't in the repo, so the shared pieces were built on the focused layout, `StepProgress` and field patterns of the role-selection and intake rounds.

## Cross-step fixes

| Problem | Now |
|---|---|
| All 4 steps inside the patient app (sidebar, bell, search) | Both routes moved out of `(protected)` (same URLs) onto the focused onboarding layout: `FocusedHeader` and one 640px column. An **Exit** link goes back to the patient home (or to `returnTo` for verification) |
| "Ahmed Akram · **Psychiatry**" in the header before verification | **Root cause:** `AppShell` asked for the doctor profile only for doctor accounts, but a disabled query still returns cached data, and the application caches the applicant's draft profile. Fixed in `AppShell`: specialty only for doctors. In the focused header the subtitle is the application's state, read from the latest verification case: "Doctor application · In progress / Under review / Needs changes / Approved" |
| Three different action bars | One sticky `ActionBar` on every step: Back (secondary, not on step 1) at the inline start, the primary action at the inline end. Labels: Continue, Continue, Continue, Submit for verification. "Create profile and continue" is gone; step 2 still creates the profile the first time and updates it after that |
| Fields 820px wide, one long column | A 640px column, with two-column rows for short fields |
| Native `mm/dd/yyyy` dates | The shared `DateField`: Day / Month / Year selects, day first, mirrored in AR, months by name, years newest first. Month / Year for work experience. Same `YYYY-MM-DD` value |
| A stepper that couldn't be clicked | `StepProgress` (the booking flow's own): completed steps are buttons; below 640px it reads "Step 3 of 4 · Documents" over a thin track |
| Back loses data | Every step stays mounted while hidden, so unsaved edits survive moving back and forth (tested). Uploads were already kept |
| A dropdown opened upward over the title | Specialty, hospital and department use a searchable `Combobox` whose list always opens **below** the field (a low field is scrolled to the middle first) and shrinks to the space left. Checked at every size |

## Step by step

### 1 · Personal Info ("About you")

- **Name:** a locked field (`LockedField`, with a lock and "From your account. To change it, contact support"). No endpoint edits the name.
- **Date of birth and gender** (side by side): `DateField`, and a gender radio group with the same values.
  - "Pre-filled from your profile" appears when the account already had them (a patient who did the intake).
  - These come from the account the step always used, `GET /accounts/me`.
- **Nationality:** a read-only field ("The only nationality available at the moment.") **only when the reference list has one country**; it's then filled in. Otherwise a native select. The mock data has 3 countries; the live site showed one.
- **Address:** one line. The API stores one string, max 500.
- **Phone:** not part of this step's form (`PATCH /accounts/me` here sends `dateOfBirth`, `gender`, `nationalityId` and `address`), so it isn't added.
- **Purpose line (verified):** "Used to verify your identity. Your date of birth, gender, nationality and address aren't shown on your doctor profile." `DoctorProfileResponseDto` returns none of those four.

### 2 · Professional Info ("Your practice")

- **License:** License number and License expiry (`DateField`, this year −10 to +30) side by side, then **Professional rank as a radiogroup**: 5 options in one row, two columns on a phone because some Arabic labels are long. On resubmit the license number is a `LockedField` and is still never sent on the PATCH.
- **Practice:**
  - **Specialty:** a searchable combobox with each specialty's own glyph and hue (`getSpecialtyStyle`).
  - **Years:** a stepper (− / +) with a "years" suffix.
  - **Fee:** an `EGP` prefix in `<bdi dir="ltr">`, a decimal keypad and no spinner. The helper is verified: "Shown on your profile, and you can change it later in Profile. What each visit costs is set per day in Schedule." The fee is editable on the doctor Profile page; the price a patient is charged comes from the day's availability pricing in Schedule.
  - **Hospital / clinic:** a combobox, deduplicated, with "Independent practice" once at the top; department appears when a hospital is chosen.
- **About you as a doctor:**
  - **Biography:** a counter (n/500) and an example in the helper.
  - **Languages:** **checkbox chips**, Arabic first. Real checkboxes with a check mark when ticked; the array keeps the order they were ticked in.
  - **Insurance providers:** the shared `TagInput` (Enter or comma adds, ✕ removes), with suggestions from the real `GET /reference/insurance-providers` list.
- **Work experience:** a compact list ("Consultant · Cairo University Hospitals · 2021–present") with Edit and Remove (Remove asks to confirm).
  - "Add experience" opens a **dialog** (a bottom sheet on a phone) with Organization, Position, Rank, Start (month/year), "I currently work here" (**unchecked by default**; the old card pre-checked it), End (hidden while current) and Description.
  - The dialog asks for an end date unless "current" is ticked. The old form could send an empty `endDate`.

### 3 · Documents

- **Header:** "Upload 7 documents · 3 of 7 uploaded" with a thin bar.
- **Groups:** **Identity** (National ID front, back, Selfie with ID) and **Qualifications** (Medical license, Graduation, Board, Membership card), in a 2-column grid from 640px.
- **Each tile:**
  - the name and a one-line description (see "What exists in code" below);
  - the accepted types ("PDF, JPG or PNG");
  - drag and drop or **Choose file**, plus **Take a photo** on touch screens (`capture`);
  - labelled **Replace** and **Remove**, a thumbnail for an image or a chip for a PDF, and name and size;
  - while uploading, live progress with **Cancel**;
  - errors say why (wrong type, or the upload failed) and offer **Retry**.

  Progress and errors are announced politely.
- **Progress and Cancel:** the PUT to the signed URL now goes through `XMLHttpRequest`, with the same URL, `Content-Type` header and body. `fetch` can't report upload progress or be cancelled.
- **Duplicate check (UI only):** a file with the same name and size as one already used for another slot gives "This looks like the same file you used for National ID (front). Upload the correct document." with **Choose another file** or **Upload anyway**. The backend doesn't check this. Enforcing it there would be a backend change (e.g. a content hash on the media asset); say if you want it.
- **Privacy line (verified):** "Documents are used only for verification and are reviewed by authorized ORIVEX staff." `GET /media-assets/:id` serves only the owner or a SuperAdmin.

### 4 · Review & submit

- One card per section: About you · License · Practice · About you as a doctor · Work experience · Documents. Each has **Edit**, which jumps to that step and returns to Review after saving.
- Every value is shown; missing optional values read "Not provided".
- Documents appear as chips with thumbnails; a chip opens a preview (image, or the PDF in a frame) from the local file.
- **No attestation checkbox:** the API and the flow have no consent field, and no legal text was invented (your decision).
- **Submit for verification:** a loading state, a double-submit guard (a ref plus disabled while pending and after success; a double click sends one request, tested), and the same body `{ licenseNumber, specialtyCode, documentAssetIds }`.

### After submit: the status screen

- **Contents:** the verified-seal scene, "Application received", the status badge, and three next steps (all verified):
  1. "Our team reviews your license and documents."
  2. "You'll get a notification here when there's a decision." `NotifyApplicantOfVerificationDecisionHandler` sends an in-app notification for approved, rejected and more-info.
  3. "Once approved, your account opens the Doctor Portal automatically." `PromoteDoctorRoleOnVerificationHandler` does this.
- **Action:** "Go to dashboard".
- **No review time** is shown; none is defined anywhere.
- **Later visits:** the status screen replaces the form, as before.
- **Other states:**
  - Rejected and More info: the reason, with Edit and resubmit.
  - Approved: Go to Doctor Portal.

## Patient identity verification (same shared pieces)

- The focused page with **Exit** (back to `returnTo` or the patient home), a 2-step `StepProgress`, the 3 identity tiles, a review listing the 3 files, and the same status screen ("Documents received").
- Next steps: "Our team checks your documents", a notification on decision (the same handler covers patients), and "Once verified, you can book, join consultations and pay" (the identity gates).
- **Removed:** the unverifiable "This usually only takes a short while."

## What exists in code (the brief asked to report)

| Question | Finding |
|---|---|
| Duplicate "Independent Practice" | The frontend always adds an "Independent Practice" option (a sentinel meaning no hospital), and no seed or mock creates a hospital of that name. So the second entry on the live site was either the old Radix `Select` showing the selected default as an item, or a hospital **row created by an admin** on the live database (I didn't query production). The new list handles both: dedupe by id, the option once at the top, and any row with that name dropped |
| Upload limits | **None exist.** The backend validates only `contentType` (any non-empty string), `purpose` and a non-negative `sizeEstimate`. The only filter is the file picker's `accept` (PDF, JPG, PNG), now also checked for dropped files. As you chose, the tiles state the types and make no size claim. A backend size and type rule is a gap worth closing |
| Verification requirements per document | **None written** in code or docs, so the descriptions are neutral ("A clear photo or scan of …") |
| Consent or attestation field | **None** in the API or the flow. None added; Submit isn't gated |
| Step 2 saved twice | Not a duplicate: the second and later saves use `PATCH /doctors/me` (tested); only the first uses `POST /doctors` |
| Typical review time | Not defined anywhere, so none is shown |

### A privacy finding to decide on (API change, not made)

`GET /doctors/:id` is **public and unauthenticated** (`doctor-profile.controller.ts`, "Intentionally public"). It returns the doctor's **`email`, `phoneNumber` and `licenseNumber`**, so anyone with a doctor's profile id can read their email and phone. The brief's "Patients only see your name" would be false, which is why the step's line names only what's actually hidden. Narrowing that response (or adding a public DTO without contact details) is an API/OpenAPI change. **Should I propose it?**

## Payload parity (tested)

| Call | Body for the same input (new UI) |
|---|---|
| `PATCH /accounts/me` | `{ dateOfBirth: "1985-06-15", gender: "female", nationalityId: "country-eg", address: "12 Tahrir Street, Cairo" }` |
| `POST /doctors` | `{ licenseNumber: "LIC-9001", specialtyId: "specialty-dermatology", languages: ["en"], insuranceProviders: [], professionalRank: "registrar", licenseExpiryDate: "2031-01-01", workExperience: [] }`. Independent practice still means no `hospitalId` |
| `PATCH /doctors/me` (resubmit) | No `licenseNumber` (tested) |
| Uploads | The same three calls per slot, with the same `purpose` keys (`national_id_front` … `professional_membership_card`) |
| Submit | `{ licenseNumber, specialtyCode, documentAssetIds }` |

Years and fee go through the same `z.coerce.number()` as before. Work-experience dates are now picked as month and year and stored as the 1st of the month: the same `YYYY-MM-DD` shape, without a day the old picker forced you to choose.

## Shared components added or changed

- **New:**
  - `DateField` and `NativeSelect`;
  - `Combobox`;
  - `CheckboxChips`;
  - `ActionBar`;
  - `LockedField`;
  - `UploadTile`;
  - `shared/lib/date/iso-date.ts` (`isRealIsoDate`, `cairoToday`, `cairoYear`);
  - `FocusedPage`;
  - the work-experience dialog.
- **Extended:**
  - `StepProgress` (clickable completed steps, the compact phone line);
  - `SegmentedControl` (`itemClassName`);
  - `useUploadMediaAsset` (optional `onProgress` and `signal`);
  - `UploadedDocument` (size, type, local preview URL);
  - `VerificationStatus` (the scene, a title, next steps, a pending action);
  - `FocusedHeader` (subtitle, Exit);
  - `PersonalInfoStep` (the action bar, intro).
- **Fixed:**
  - `PulseLine`'s progress glyph hung 32px past a full track, scrolling phones sideways on a last step (booking's "Confirmed" too);
  - `AppShell`'s cached specialty;
  - the patient intake now uses the shared `DateField`, `LockedField` and `FocusedPage`.

## Verification

| Check | Result |
|---|---|
| Typecheck | Clean |
| Lint (changed areas) | 0 errors |
| `onboarding-flow.test.tsx` (rewritten) | 8/8 |
| `identity-verification-flow.test.tsx` | 4/4 |
| Profile pages, intake and role-selection tests | Pass |
| Full unit suite | 960/960 (229 files) |
| Production build (mock mode) | OK |
| Browser walk: all 4 steps, 7 real uploads, submit and the status screen, plus patient verification. EN light 1440 and 1150, AR dark 390, AR light 1440, EN dark 390 | No sideways scroll, the action bar on screen on every step, the specialty list below its field everywhere |
| axe (WCAG 2.1 AA and best practice) on every step and status screen, EN light 1440 and AR dark 390 | **No violations** |
| Dashed tile border vs surface | 3.32:1 light, 3.12:1 dark |

- **`onboarding-flow.test.tsx` covers:**
  - payload parity for steps 1 and 2;
  - Back keeping unsaved edits, and the stepper's completed-step buttons;
  - the hospital list deduplicated;
  - resume at Documents;
  - the duplicate-file warning;
  - a double-click submit guard;
  - the status screen and header state;
  - more-info and rejected, with resubmit locked and without `licenseNumber`;
  - approved.
- **`identity-verification-flow.test.tsx`:** the new status copy, with no review-time claim.

## Screenshots

In `docs/redesign/doctor-application/`.

- **before/:** each step at 1150×674 EN light and 390×844 AR dark (personal, professional, documents, documents uploaded, review, patient verification).
- **after/:** the same steps plus the open specialty list and the submitted status, at 1440 EN light, 1150 EN light and 390 AR dark.
