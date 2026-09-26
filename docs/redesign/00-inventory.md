# Visual redesign — codebase inventory (Phase 1)

Written before any redesign edit. Where the redesign brief and the code disagree, the code
wins on mechanics and the brief's intent is kept.

## Stack (verified)

- Next.js 15 App Router, React 19, `next-intl` 4, TanStack Query 5, Recharts 3, FullCalendar 6.
- **Tailwind v4, CSS-first** (`@theme` in `src/design-system/tokens/*.css`). There is **no
  `tailwind.config`** and **no shadcn variable names** (`--background`, `--primary`, …).
  The token layer is semantic `--color-*` (`canvas`, `surface`, `surface-raised`,
  `text-primary/secondary/tertiary`, `border-default/strong`, `primary*`, `success/warning/danger/info(-subtle/-emphasis)`,
  `focus-ring`). The redesign re-points these; it does not introduce a second vocabulary.
- Radix primitives + `class-variance-authority`. Icons: `lucide-react`. Fonts: IBM Plex Sans /
  Plex Sans Arabic via `next/font/google` (`src/design-system/fonts.ts`).
- **No `framer-motion` / `motion`, no `tailwindcss-animate`** → CSS transitions/keyframes only.
- Charts: Recharts wrappers in `shared/ui/charts`.
- Tests: Vitest (+RTL, MSW), Playwright e2e (mock mode, `NEXT_PUBLIC_ENABLE_API_MOCKS=true`), Storybook.

## Routes (`src/app/[locale]`)

| Group | Routes |
|---|---|
| public | `/` (landing), `/journey`, `/verify-prescription/[code]`, `/patients/[id]` |
| `(guest)` | login, register, forgot/reset-password, verify-email, check-email |
| `(status)` | unauthorized ("Sign in required"), session-expired, forbidden, access-denied, account-locked |
| `(protected)` shared | dashboard, notifications, security |
| patient | overview, appointments (+`book`), doctors (+`[id]`), specialties, health, records, prescriptions, messages, knowledge, waitlist, disputes, profile, intake, verify-identity |
| doctor | overview, queue, appointments, patients (+`[id]`), schedule, earnings, reports, profile, settings, messages, knowledge, disputes, consultation, onboarding |
| admin | overview, analytics, audit-log, disputes, feature-flags, hospitals, knowledge, reviews, users, verification-queue (+`[id]`) |

## Shell, guards, i18n, theme

- `(protected)/layout.tsx` → `RequireAuth` → `AppShell` (topbar, sidebar, `<main id="main-content">`).
  Role pages wrap themselves in `RequireRole`.
- Auth: in-memory access token + httpOnly refresh cookie; `SessionProvider` derives
  `loading | authenticated | unauthenticated` from `useSessionQuery` → `bootstrapSession`.
- i18n: `messages/en.json`, `messages/ar.json`; `[locale]` segment; `dir`/`lang` set in `app/[locale]/layout.tsx`;
  Arabic font switch by `:lang(ar)`.
- Theme: `ThemeProvider` + `data-theme` attribute + `prefers-color-scheme`; dark values in `theme-dark.css`.
- Splash: `AppLoadingScreen`, used by `[locale]/loading.tsx`, guest layout, and (before Phase 1) `RequireAuth`.

## Existing primitives (`src/shared/ui`)

Button (5 variants, sizes sm 32/md 40/lg 48/icon), Badge, Card, Avatar, Skeleton, Spinner, EmptyState (icon only),
Alert, Dialog, Toast/Toaster, Tabs, Select, Switch, Checkbox, Table, Stepper, Tooltip, Command, Breadcrumb,
FilterTabs, Pagination, Popover, DropdownMenu, Accordion, Carousel, RevealOnScroll, BackToTopButton.

Duplicates the brief asks to consolidate:

- **KPI/stat tiles:** `layout/linkable-stat-card`, `layout/metric-card`, plus feature-local stat tiles
  (`patient-summary-strip`, reports tiles, earnings tiles).
- **Status badges:** `schedule/status-badge` (scheduling tones), `appointments/appointment-card`'s own
  status→variant map, feature-local payment/dispute/prescription badge maps.
- **Empty states:** `EmptyState`, `layout/empty-dashboard`, `layout/empty-workspace`, `schedule/empty-calendar`.
- **Vitals:** `health/vital-trend-card` + `health/trend-chart`.
- **Loading:** `Skeleton`, `charts/chart-skeleton`, `layout/route-loading-skeleton`, `schedule/loading-calendar`.

## Findings that differ from the brief

1. Tokens are not shadcn-named; see Stack.
2. `docs/16-design-system.md` documents the current system and will need updating alongside the token phase.
3. The reported reports-page blank chart is real and reproduced: `ChartContainer` centres its child in a flex row and
   `ReportsTrendChart` had no width, so Recharts measured 0px.
4. The doctor-directory search box maps to the backend's `specialty` filter, which only matches the **specialty name**
   (`prisma-doctor-directory-query.service.ts`). The current placeholder ("Search by specialty…") is accurate; the brief's
   "Search doctors or specialties" would be untrue without a backend change, so it was not applied.
5. The "Sign in required" flash on hard reload was **not reproducible in mock mode** (all reloads render). The change made
   targets the one code path that can produce it in production: any transient failure (network, 5xx while Render cold-starts,
   429) during session recovery was treated as "no session".
