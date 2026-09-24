const OPERATING_TIME_ZONE = 'Africa/Cairo';

/**
 * ORIVEX Egypt V1 has one operating timezone (mirrors
 * `shared/i18n/request.ts`'s server-side `timeZone: 'Africa/Cairo'`). Every
 * "what time is it right now" decision that isn't purely a display-string
 * concern (handled by `useFormatter()`, which already resolves to Cairo via
 * that server config) — e.g. "has this working day's hours already ended
 * today", "is this the same calendar day as today", a time-of-day greeting —
 * must read Cairo's wall-clock time, not the viewer's browser/device
 * timezone. A doctor or patient viewing ORIVEX from a browser set to a
 * different timezone must still see slots/greetings/"today" boundaries
 * exactly as a Cairo-based clinic would.
 *
 * Returns a `Date` whose UTC instant is shifted so that this environment's
 * *local* getters (`getHours()`, `getMinutes()`, `getDay()`, `getDate()`,
 * ...) read as Cairo wall-clock time, regardless of the actual local
 * timezone. This is the standard, pragmatic technique for this: not a real
 * "Cairo Date object" (JS has no timezone-aware Date), but reading its
 * local getters after this shift always agrees with Cairo's clock.
 */
export function getCairoNow(referenceDate: Date = new Date()): Date {
  return new Date(referenceDate.toLocaleString('en-US', { timeZone: OPERATING_TIME_ZONE }));
}

/**
 * True when `a` and `b` fall on the same Cairo calendar day -- e.g. for a
 * message thread's date-separator rows (Phase 6 UX remediation), so a day
 * boundary is computed against the same operating timezone every other
 * "today"/"this month" comparison in this app already uses (see this file's
 * own doc comment), not the viewer's browser timezone.
 */
export function isSameCairoDay(a: Date, b: Date): boolean {
  const cairoA = getCairoNow(a);
  const cairoB = getCairoNow(b);
  return (
    cairoA.getFullYear() === cairoB.getFullYear() &&
    cairoA.getMonth() === cairoB.getMonth() &&
    cairoA.getDate() === cairoB.getDate()
  );
}
