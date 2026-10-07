# ORIVEX — Role selection (`/[locale]/journey`)

**Scope:**
- The "How will you use ORIVEX?" page shown after sign-up. UI only.
- Both actions are unchanged. As a patient: `GET /patients/me` (creates the bare PatientProfile), then `/patient/intake`. As a doctor: straight to `/doctor/onboarding`, which creates the DoctorProfile itself.
- No API or OpenAPI change.

## Before → after (1278×748, EN, light)

| | Before | After |
|---|---|---|
| Fit | 1018px tall: both buttons below the fold | 748px: both cards, Continue and the trust line on one screen (also 1440×900, 800×900 and 390×844) |
| Illustrations | A flat blue vector (a woman with a phone) and a 3D doctor render | Two duotone scenes from the shared set. Ink lines, one flat disc (peach for patient, lime for doctor), no faces |
| Colour | Blue calendar chip, blue and green checks, green chip | Ink checks and the existing tokens only. The corner chips are gone |
| Weight | Patient a solid button, doctor an outline button | Two identical radio cards, one Continue button that follows the choice |
| Reading | 6 features × 2 in two columns | One sentence and exactly 3 benefits a card. On a phone, one line ("Book · Video · Records") |
| Clickable | Only the buttons | The whole card is the control |
| Trust row | 3 items, including "Built for patients and doctors · Join ORIVEX today" | One line under Continue |

## The role-switch check (item 7)

"You can switch roles anytime from your account settings" was **not true**:

- **Every account starts as a patient.** Becoming a doctor is a one-way application, not a switch.
- **Where to apply:** a patient account can apply later from **"Become a Doctor" in the account menu** (`features/shell/components/user-menu.tsx`) or from the patient dashboard banner (`BecomeADoctorCta`). Both open the Doctor Onboarding wizard.
- **The wizard has 4 steps** (`features/doctor/components/onboarding/onboarding-flow.tsx`): Personal info, Professional info, Documents (including the medical license), Review & submit. Then an admin reviews the application before the doctor can practise.
- **Nothing in Settings** switches roles, and there's no way back from doctor to patient.
- **No duration** is defined anywhere, so the card states the steps instead of "about 10 minutes".

## Final copy

| Element | EN | AR |
|---|---|---|
| Eyebrow | Welcome, {first name} ("Welcome" with no name) | مرحبًا، {الاسم} |
| Title | How will you use ORIVEX? | كيف ستستخدم أوريفكس؟ |
| Subtitle | Pick the experience that fits you. You can apply as a doctor later from your account menu. | اختر التجربة التي تناسبك. يمكنك التقديم كطبيب لاحقًا من قائمة حسابك. |
| Patient | I'm a patient · Find a doctor, book a visit and keep your health in one place. | أنا مريض · ابحث عن طبيب واحجز زيارتك واجمع صحتك في مكان واحد. |
| Patient benefits | Book verified doctors · Video visits from home · Your records in one place | احجز مع أطباء موثّقين · زيارات فيديو من منزلك · سجلاتك في مكان واحد |
| Doctor | I'm a doctor · Set up your practice and consult with patients online. | أنا طبيب · جهّز عيادتك واستشر مرضاك عبر الإنترنت. |
| Doctor benefits | Set your hours and fees · Consult over secure video · **Fees processed securely through Stripe** | حدّد مواعيدك وأسعارك · استشارات عبر فيديو آمن · رسوم تُعالَج بأمان عبر Stripe |
| Doctor info line | Requires license verification: 4 steps, then a review by our team. | يتطلب التحقق من الترخيص: 4 خطوات، ثم مراجعة من فريقنا. |
| Button | Continue (disabled) → Continue as a patient / Continue as a doctor | متابعة → المتابعة كمريض / المتابعة كطبيب |
| Trust line | **Your data is encrypted, and only authorized staff can see it.** | بياناتك مشفّرة، والموظفون المخوّلون فقط يمكنهم رؤيتها. |

Two lines differ from the brief so they stay true:

1. **"Get paid through Stripe" became "Fees processed securely through Stripe".**
   - Stripe is the payment gateway bound in `PaymentModule`.
   - Doctors have no payout feature: the Earnings page states "Recorded earnings, not payouts".
   - So the platform collects fees through Stripe, but nothing pays doctors through it yet.
2. **"Only seen by your care team" became "only authorized staff can see it".**
   - Access is role-based, and admins and support can see records too.
   - The new wording matches the old page's own claim ("Only authorized staff can view records").

## Structure

- **Header:**
  - Logo, "Need help? Contact support" and the account menu, all kept.
  - The help icon chip moved from the legacy primary (blue) colour to the neutral secondary.
- **Centre column (max 880px):**
  - eyebrow chip;
  - `h1` in the display face, 40/48 (28/36 on a phone);
  - subtitle;
  - the radio group;
  - Continue (lg, 48px, 320px wide; full width on a phone);
  - the shield trust line.
- **Card (`role="radio"`, `aria-checked`):**
  1. An illustration band, 120px tall (96px from 640 to 1023px).
  2. The title.
  3. One sentence.
  4. Three benefits with 16px ink checks, at most 2 lines each.
  5. Doctor only: the info line.
- **States:**

  | State | Look |
  |---|---|
  | Default | `surface`, 1px `border-default` |
  | Hover | Border at ink 30% and a 1px lift |
  | Selected | 2px ink border (1px border plus a 1px ring, so nothing shifts). The radio indicator at the top-end corner fills with ink and shows an inverse check. The band is tinted: peach (`warm-1` at 60%) for patient, lime (`pulse` at 16%) for doctor |
  | Focus-visible | 2px `focus-ring` outline with an offset |

  - Hover and selection transitions are off under reduced motion.
  - Measured in dark mode, the selected border is 15.6:1 against the card.
- **Keyboard:**
  - Tab reaches the group: one tab stop, on the selected card or else the first.
  - ←/→ (mirrored in RTL) and ↑/↓ move focus without selecting.
  - Space or Enter selects.
  - Tab reaches Continue, and Enter submits.
- **Screen readers:** the group is named by the `h1`, each radio by its card title, and described by its sentence. Each card reads as "I'm a patient, radio, not checked", and the reader adds "1 of 2" from the group.
- **Pre-selection:**
  - The existing `?intent=patient|doctor` parameter pre-selects a card, highlighted only and never submitted. No new parameter was added.
  - **Nothing links to it yet.** The landing page's "Apply as a doctor" goes to `/register` (signed out) or `/doctor/onboarding` (signed-in patient). Making it pass the intent through registration would be a change to registration and landing, which another session is editing now, so I left it alone.
- **Below 640px:**
  - Each card is a compact row: a 56px thumbnail at the inline start, then title, sentence, a one-line benefit summary and (doctor only) the info line.
  - Continue and the trust line are pinned to the bottom of the screen in a bar with a top border.
- **RTL:** the patient card sits at the inline start (right), the indicator at the top-end corner (left), and the illustrations don't mirror.

## Shared changes

- **Illustration set:** two new scenes, `role-patient` (a phone and a booked calendar on a peach disc) and `role-doctor` (a clipboard and a stethoscope on a lime disc), in the house style (`shared/ui/illustrations/scenes.tsx`).
- **`UserMenu`:** the trigger now always has an accessible name. Below 640px, or without `showName`, only the avatar was visible and the button had no name (axe: `button-name`, critical). That happened in every top bar on a phone, not just here. The name is now kept for screen readers wherever it's visually hidden.
- **Removed:**
  - both PNG illustrations from this page (`/patient-onboarding.png`, `/doctor-onboarding.png`). Nothing references them now, but the files are still in `public/` and can be deleted;
  - the corner icon chips;
  - the 6-item lists;
  - the per-card buttons;
  - the 3-item trust row;
  - their strings.

## Verification

| Check | Result |
|---|---|
| Typecheck | Clean |
| Lint (changed files) | Clean |
| `journey-screen.test.tsx` (rewritten) | 5/5 |
| `user-menu.test.tsx` | 5/5 |
| Browser fit: 1278×748, 1440×900, 800×900, 390×844 × EN/AR × light/dark (8 combinations) | Cards and Continue fully on screen in all; no sideways scroll |
| axe (WCAG 2.1 AA and best practice): EN light 1278, AR dark 390, EN dark 1440 pre-selected | No violations, after the two fixes below |
| Keyboard path in the browser | Pass |
| Patient Continue | `GET /patients/me`, then `/en/patient/intake` |
| Doctor Continue | `/en/doctor/onboarding`, with no call to the patient endpoint |
| Full unit suite, production build, `shell-layout-integrity.spec.ts` | **Not run yet** (see below) |

- **`journey-screen.test.tsx` covers:**
  - two radios and one disabled Continue;
  - the honest copy;
  - 3 benefits a card;
  - the patient path, with the same call and the same `push` as the old "Continue as a Patient";
  - the doctor path, the same as the old "Apply as a Doctor";
  - the keyboard;
  - `?intent=doctor`.
- **Fixed during the axe pass:**
  - The card titles are `h2` rather than the brief's `h3`, because an `h3` straight under the `h1` failed `heading-order`.
  - The `UserMenu` name, described above.
- **How the browser checks ran:** against the running dev server (real-backend mode). Each test answered the page's API calls in the browser with a fresh patient account, so nothing was written to the local database.

**Not run yet:** the full unit suite, the production build and `shell-layout-integrity.spec.ts`. While I worked, the machine had 0.4–1 GB of free RAM, drive C: briefly hit 0 bytes free, and another session was running its own tests and typecheck. A production build would also overwrite the `.next` folder that the running dev server uses.

## Screenshots

In `docs/redesign/journey/`:

| | Before | After |
|---|---|---|
| Desktop EN light (1278×748) | `before/en-light-1278.png` | `after/en-light-1278.png` |
| Mobile AR dark (390×844) | `before/ar-dark-390.png` | `after/ar-dark-390.png` |

Both sets also have `en-light-1440`, `ar-dark-1278` and `en-light-390`. The "after" set also has the selected states:
- `selected-patient-en-light-1278`;
- `selected-doctor-ar-dark-1278` (pre-selected by `?intent=doctor`);
- `selected-patient-ar-dark-390`.
