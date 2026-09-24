import type { useFormatter } from 'next-intl';

type Formatter = ReturnType<typeof useFormatter>;

// Phase 8 (Design System Consistency): the one shared currency formatter.
// Mirrors `shared/lib/date/format-datetime.ts`'s pattern -- takes the
// caller's own `format` (from `useFormatter()` client-side or
// `getFormatter()` server-side) instead of constructing a standalone
// `Intl.NumberFormat`, so the active locale is always the app's real
// negotiated locale (`shared/i18n/request.ts`), never the browser's
// default (`new Intl.NumberFormat(undefined, ...)`, the bug this
// replaces in `pay-now-form.tsx` -- passing `undefined` as the locale
// silently used the browser's own locale instead of the app's, which
// diverges under Arabic).
//
// No `currencyDisplay` override -- Intl's default 'symbol' behavior
// already renders "ج.م.‏" for EGP under Arabic and falls back to the ISO
// code "EGP" under English (EGP has no simple Latin symbol), giving both
// locales the locale-appropriate string for free.
export function formatCurrency(format: Formatter, amount: number, currency: string): string {
  return format.number(amount, { style: 'currency', currency });
}
