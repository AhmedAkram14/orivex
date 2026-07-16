/**
 * Orivex Egypt V1's single operating timezone — the same value already
 * configured once, globally, in `shared/i18n/request.ts` for every
 * `useFormatter().dateTime()` call. Re-declared here (not imported — that
 * file is server-only, `getRequestConfig`) as this module's own reference
 * point for anything scheduling-specific that needs the raw IANA name
 * rather than a formatter, e.g. labeling a slot's timezone in the booking
 * summary (Milestone 4).
 */
export const DEFAULT_TIME_ZONE = 'Africa/Cairo';

/** A short, localized timezone label (e.g. "GMT+2", "GMT+3") for the given IANA zone — used wherever a booking/slot needs to show *which* timezone its times are in, since Orivex operates across DST-observing and non-DST-observing dates within the same zone. */
export function getTimezoneOffsetLabel(timeZone: string, locale: string, date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'shortOffset' }).formatToParts(date);
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone;
}
