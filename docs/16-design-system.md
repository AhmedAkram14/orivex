# 16. ORIVEX Design System

Source of truth for ORIVEX's visual language. This documents what is actually
implemented in `apps/frontend/src/design-system/` and `shared/ui/`, not an
aspirational spec — every value below is real and in production use as of
Phase 6A (Design System & UI/UX Transformation).

## Philosophy

Apple-level clarity, Stripe-level information hierarchy, and a calm
clinical trustworthiness — expressed through one consistent system shared
across Public, Patient, Doctor, and Admin, with persona-appropriate
*density* rather than persona-specific visual languages:

- **Patient**: clear, friendly, calm, action-oriented.
- **Doctor**: professional, data-rich, efficient — a clinical workspace.
- **Admin**: dense, structured, operational — a command center.

All three share the same tokens, the same primitives, and the same
typeface. Only spacing/density and information volume shift per persona.

## Colors

Tailwind v4, CSS-first (`@theme`), defined in
`src/design-system/tokens/colors.css`. Two layers: numbered primitives
(`--gray-0…950`, `--brand-50…900`, `--success/warning/danger/info-50/600/900`)
that components never consume directly, and semantic tokens that they do:

| Token | Purpose |
|---|---|
| `color-canvas` / `color-surface` / `color-surface-raised` | Page background, card surfaces, elevated surfaces |
| `color-overlay` | Dialog/drawer backdrop |
| `color-text-primary/secondary/tertiary/disabled/inverse` | Text hierarchy |
| `color-border-default/strong/focus` | Borders and focus rings |
| `color-primary(-hover/-active/-subtle/-foreground)` | Brand action color |
| `color-secondary(-hover/-subtle/-foreground)` | Secondary actions |
| `color-success/warning/danger/info/neutral(-subtle/-foreground)` | Semantic status — used consistently for Badge/Alert/Toast everywhere |

Every semantic token has a dark-mode override in `theme-dark.css`, gated by
both `@media (prefers-color-scheme: dark)` and an explicit
`:root[data-theme='dark']` attribute (the latter always wins — see Dark
Mode below). Components must only ever reference semantic tokens.

## Typography

Typeface: **IBM Plex Sans** (Latin) + **IBM Plex Sans Arabic**, self-hosted
via `next/font/google` (`src/design-system/fonts.ts`), applied through
`--font-sans-latin`/`--font-sans-arabic` in `typography.css` — a single
type system designed by one foundry for multi-script consistency, chosen
over Inter/system-UI defaults for a distinctive, professional identity.
Script switching is automatic via `:lang(ar)`. The system-font stack
remains as a fallback chain if the webfont variable is ever unset.

Type scale (`typography.css`): `text-xs`(0.75rem) through `text-5xl`(3rem),
8 steps, each with a paired line-height. Weights: regular(400),
medium(500), semibold(600), bold(700).

Primitives (`src/design-system/typography.tsx`) — **always use these for
headings/body copy, never a raw `<h1>`–`<h4>` with inline size classes**:

- `Display` — hero-scale text (marketing/landing only).
- `Heading` levels 1–4 — maps to `text-3xl/2xl/xl/lg` + `font-semibold`. Pass `as="h2"` etc. to control the actual DOM tag independent of visual level.
- `Text` — body copy, sizes `sm/base/lg` × tone `primary/secondary/tertiary`.
- `Caption` — small print, labels, metadata.

## Spacing

Standard Tailwind spacing scale (4px base unit) throughout — no arbitrary
`p-[13px]`-style values in production code (verified: zero occurrences of
`p-[`/`m-[`/`gap-[` app-wide). Common rhythm: `gap-4` (16px) for tight
groups, `gap-6` (24px) for section-level spacing.

## Radius

`src/design-system/tokens/scales.css`: `none`(0), `sm`(0.25rem),
`md`(0.5rem), `lg`(0.75rem), `xl`(1rem), `2xl`(1.5rem), `full`(9999px).

Convention: `rounded-full` for pills/avatars/circular elements,
`rounded-lg`/`rounded-md` for standard containers (cards, inputs, buttons),
`rounded-2xl` for prominent cards (landing page, feature panels). Avoid
`rounded-3xl` and arbitrary pixel radii — both resolve to values already
covered by `2xl`; use the token instead of Tailwind's un-redeclared
default.

## Elevation (shadow)

`scales.css`: `sm`, `md`, `lg`, `xl` — four-step elevation.
`shadow-sm` is the default `Card` elevation; `md`/`lg` for hover states and
elevated marketing surfaces; `xl` sparingly (dialogs, popovers). Never use
arbitrary `shadow-[...]` box-shadow values — use the nearest token.

## Motion

`scales.css`: eases `--ease-standard/decelerate/accelerate`; durations
`--duration-fast`(120ms)/`base`(200ms)/`slow`(320ms), all zeroed under
`prefers-reduced-motion`. Standard hover/transition pattern:

```
transition-colors duration-(--duration-fast) ease-standard
```

Two named keyframe animations (`glow-pulse`, `loading-bar`) exist solely
for the app loading screen. No animation library is installed — motion is
CSS-token-driven only. No meaningless animation, no bounce, no gimmicks.

## Dark Mode

Fully implemented: `useTheme()` (`src/shared/providers/theme-provider.tsx`)
exposes `{ theme: 'light'|'dark'|'system', setTheme }`, persisted to
`localStorage` under `orivex-theme`. A blocking inline `ThemeScript` in
`<head>` reads that key before hydration and sets `data-theme` on `<html>`
to prevent flash-of-wrong-theme. Toggle UI: the authenticated topbar's user
menu, the landing navbar's signed-in menu, the ⌘K command palette, and
doctor settings — all as a 3-state Light/Dark/System control.

## Component System

Single source of truth per primitive — improve at the source, never
duplicate. Located in `src/shared/ui/`:

**With variants (via `class-variance-authority`)**: `Button` (5 variants ×
4 sizes), `Badge` (6 variants: neutral/primary/success/warning/danger/info
— the one consistent status-color language used for appointment status,
payment status, verification status, and account status everywhere),
`Alert` (4 variants), `Toast` (3 variants).

**Single fixed style**: `Card`/`CardHeader`/`CardTitle`/`CardDescription`/
`CardContent`/`CardFooter`, `Dialog`, `Input`, `Select`, `Table`, `Tabs`,
`Tooltip`, `DropdownMenu`, `Skeleton`, `EmptyState`, `Switch`, `Checkbox`,
`Textarea`, `RadioGroup`, `Popover`, `Accordion`, `Command` (⌘K palette),
`Avatar`, `Spinner`, `Breadcrumb`, `Pagination`.

**Domain subfolders**: `layout/` (page-header, sidebar, topbar, stat-card,
metric-card, nav-item), `schedule/` (calendar, time-slot, time-grid,
booking-summary-card, availability, status-badge), `queue/`, `health/`,
`medications/`, `timeline/`, `charts/` (area/bar/line/pie wrappers).

Every table in the app (Users, Payments, Verification Queue, Patients,
Doctor Leaderboard) uses the shared `Table` primitives — never a hand-rolled
`<table>`. Numeric columns (amounts, counts) are right-aligned with
`tabular-nums`.

**Known gap**: no dedicated icon+title+description `SectionHeader`
primitive exists yet. `Section` (title/description/actions) and
`WidgetContainer` (card-based header for inner widgets) are the closest
things. Flagged for a future centralized addition if the pattern recurs
enough to justify one — do not invent one-off variants in the meantime.

## Icons

`lucide-react`, sized via `src/shared/icons/icon.tsx`'s `size` prop
(`xs`/`sm`/`md`/`lg`), with an explicit `flipRtl` policy for directional
icons (mirrors under `dir="rtl"` via `rtl:-scale-x-100`).

## Responsive Rules

Standard Tailwind breakpoints. Tables that would overflow on mobile use a
deliberate representation (not raw overflow-scroll of a desktop table) —
verify this per-screen when adding new dense tables. Dialogs/drawers use
the shared `Dialog`/`Popover` primitives, which already handle
viewport-constrained sizing.

## RTL Rules

Single root `dir={isRtlLocale(locale) ? 'rtl' : 'ltr'}` attribute set once
in `app/[locale]/layout.tsx`, combined with logical Tailwind utilities
throughout (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`) — never per-component
`dir="rtl"` overrides. Physical `left-`/`right-`/`ml-`/`mr-` classes are
reserved for genuinely symmetric decorative elements only (e.g. a
background blur pair that mirrors itself); any directional or functional
UI element must use logical properties. Verified: 108 logical-property
occurrences vs. 6 legitimate symmetric-decoration exceptions app-wide.

## What NOT to do

No glassmorphism, no huge gradients, no excessive blur, no floating cards
everywhere, no giant typography for its own sake, no unnecessary
illustrations, no neon colors, no `rounded-full` on things that aren't
pills/avatars, no arbitrary Tailwind values when a token exists. Product
usability always wins over visual novelty.

## 2026 Redesign — "Calm clinic, living pulse"

Supersedes the color, type, radius and component notes above where they differ. Full record: [redesign/00-inventory.md](redesign/00-inventory.md), [redesign/99-report.md](redesign/99-report.md); screenshots in [redesign/after/](redesign/after/).

- **Color:** warm-neutral canvas; ink (`--color-primary`) for primary actions; vital-lime `pulse` accent for fills only (never text on light surfaces); care blue (`care`, `care-text`) for links, focus and info; warm peach→blush for patient surfaces, lime for doctor surfaces. Existing token names were re-pointed, not renamed. Added: `pulse*`, `care*`, `warm-1/2`, `surface-2`, `spec-1..9(-tint)`.
- **Type:** Outfit for English headings/metrics, IBM Plex elsewhere (Arabic unchanged). Scale utilities `text-h1…`, `text-body`, `text-small`, `text-caption`; `cn()` knows them.
- **Density variables:** `--page-gutter`, `--section-gap`, `--card-pad`, `--card-gap`, `--row-h`. Radius collapsed to five values (10/12/20/28/full); control heights: 3 button sizes.
- **Motion:** 200ms fades on popover/dropdown, bell tilt, toast slide-in, PulseLine (one per screen). All honor `prefers-reduced-motion`.
- **Primitives:** Button, StatusBadge (single status→tone map), Card/HeroSurface/InsetRow, MetricStat, VitalCard, EmptyState (+illustrations), ErrorState, ConfirmDialog, skeleton set, DateBlock, Avatar, PulseLine, Toast, SegmentedControl, TagInput, SpecialtyChip.

### Layout rules (round 2)

Full record: [redesign/round-2-report.md](redesign/round-2-report.md).

- **Columns follow the content width, not the viewport.** `<main>` is the size container. In-app grids use container variants: `@pane` (640px of content, two columns) and `@wide` (960px, three or four), plus Tailwind's own `@xl`/`@2xl`/`@3xl`/`@5xl`. Viewport breakpoints (`sm:`/`lg:`) stay for the public pages and for chrome only. With the sidebar open, a 1046px window leaves about 780px.
- **Figures never wrap.** `MetricStat` values are one line and shrink with their own width (`clamp()` over `cqi`). Units and qualifiers ("per consultation") go in `helperText`. The `hero` size needs a column of about 300px or more.
- **`sr-only` needs a positioned ancestor inside the scroll area.** `<main>` provides one. A new scroll container must be `relative` too, or visually hidden text adds page height.
- **One label per status.** `StatusBadge` always reads `ds.status.<status>`. Don't pass per-feature copy.
- **Filters are chips, tabs switch panels.** `FilterTabs` renders chips (`aria-pressed`). Use `Tabs` only to switch what is shown.
- **One date-range toolbar.** Use `DateRangePicker` (presets, then a custom-range popover), with Export as a `secondary` button.
- **Card headers.** The title may balance onto two lines. The action is a small ghost button that never wraps (`WidgetContainer` does this).
- **Illustrations on an ink band** use `context="inverse"`, so card fills follow the band instead of staying white.

### Avatars (round 4)

Full record: [redesign/round-4-report.md](redesign/round-4-report.md).

- **One primitive.** Every person photo is `PersonAvatar` (`shared/ui/avatar.tsx`): the photo, or initials on a tint from the name hash. It is decorative (`aria-hidden`), because the name is always beside it. Don't compose `Avatar` + `AvatarImage` + `AvatarFallback` by hand.
- **One size scale, paired to the text beside it.** The avatar is about as tall as the text block next to it.

  | Size | Pairs with | Used for |
  |---|---|---|
  | `xs` 24 | one 13–14px line | inline before a name (appointment rows), calendar chips |
  | `sm` 32 | one 15px line, or 13px + 12px | table rows (Patients), sticky patient header, reviews, header menu |
  | `md` 40 | two lines, 15px + 13px | booking doctor chip, needs-attention rows, conversations, Overview's Upcoming work |
  | `lg` 56 | a name plus one or two short meta lines | doctor cards, schedule popover, profile card |
  | `xl` 96 | a hero name at `h1`/display size | patient chart hero, doctor profile hero (both views) |

- **Alignment.** Beside one or two lines, centre it (`items-center`). Beside more than two, top-align it (`items-start`) and nudge it so its top meets the first line's cap height (`mt-1.5` beside a 16px name in a 24px line).
- **Framing.** Photos use `object-cover` with `object-position: 50% 22%`, a face-biased crop for portrait sources. A 1px hairline sits just inside every avatar (`--color-avatar-ring`: black 5% light, white 10% dark), drawn as an overlay above the photo. Initials are 40% of the diameter, weight 600.
- **Appointment rows.** The `DateBlock` is the row's one leading anchor. The person rides inline before their name at `xs`, in both roles (patient Upcoming/History, doctor Appointments, pending approvals, the visit summary).
- **No avatar in the doctor's Overview hero.** The header already shows it; the greeting and the timeline are the hero.
