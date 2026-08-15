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
