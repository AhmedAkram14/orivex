// Calendar dates (YYYY-MM-DD) as the platform's users see them: in Cairo,
// the one operating time zone (see timezone.ts). A stored date-only value
// (date of birth, license expiry) is written as UTC midnight of its day, so
// its calendar day is its UTC date.

const OPERATING_TIME_ZONE = 'Africa/Cairo';

/** Today's date in Cairo, `YYYY-MM-DD`. */
export function cairoToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: OPERATING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** The calendar day of a stored date-only value, `YYYY-MM-DD`. */
export function calendarDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Whole years from `birthDay` to `onDay` (both `YYYY-MM-DD`): a birthday counts once its day is reached. */
export function ageInYears(birthDay: string, onDay: string): number {
  const [by, bm, bd] = birthDay.split('-').map(Number);
  const [ty, tm, td] = onDay.split('-').map(Number);
  const hadBirthdayThisYear = tm! > bm! || (tm === bm && td! >= bd!);
  return ty! - by! - (hadBirthdayThisYear ? 0 : 1);
}
