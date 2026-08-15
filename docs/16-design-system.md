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
