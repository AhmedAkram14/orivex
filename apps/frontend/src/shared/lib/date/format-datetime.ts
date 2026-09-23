import type { useFormatter } from 'next-intl';

type Formatter = ReturnType<typeof useFormatter>;

// Every call site takes the caller's own `format` (from `useFormatter()`
// client-side or `getFormatter()` server-side) rather than constructing its
// own `Intl.DateTimeFormat` -- next-intl's formatter already resolves the
// active locale AND `timeZone: 'Africa/Cairo'` (shared/i18n/request.ts), so
// this never needs to pass a timezone explicitly the way the Security
// Center's components previously did with ad hoc `toLocaleString(...,
// { timeZone: 'Africa/Cairo' })` calls.

/** No seconds -- "Sep 22, 2026, 3:45 PM" / the Arabic locale's equivalent. */
export function formatDateTime(format: Formatter, date: Date): string {
  return format.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Full precision (includes seconds) -- for a tooltip/title showing the exact instant behind a relative-time label. */
export function formatExactDateTime(format: Formatter, date: Date): string {
  return format.dateTime(date, { dateStyle: 'medium', timeStyle: 'medium' });
}
