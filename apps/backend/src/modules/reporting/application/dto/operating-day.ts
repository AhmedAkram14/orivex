import { cairoToday } from '../../../../shared/date/calendar-date.js';
import { zonedTimeToUtc } from '../../../../shared/date/timezone.js';

import type { DateWindow } from './previous-period.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight in Cairo (the one operating time zone), `offsetDays` calendar days from today, as a UTC instant. */
function cairoMidnight(now: Date, offsetDays: number): Date {
  const [year, month, day] = cairoToday(now).split('-').map(Number) as [number, number, number];
  return zonedTimeToUtc(year, month - 1, day + offsetDays, 0, 0);
}

/**
 * The calendar windows the admin Overview reports on, in Cairo days (not
 * UTC, not the server's own zone). Upper bounds are inclusive, matching the
 * analytics queries' `lte` on dateTo.
 */
export function overviewWindows(now: Date = new Date()): {
  /** Today, the whole day: every appointment on today's schedule. */
  today: DateWindow;
  /** Today and the 6 days before it. */
  last7Days: DateWindow;
  /** Today from midnight up to now. */
  todaySoFar: DateWindow;
  /** The same stretch of the same weekday a week ago: the honest baseline for "today so far". */
  sameTimeLastWeek: DateWindow;
} {
  const startOfToday = cairoMidnight(now, 0);
  const endOfToday = new Date(cairoMidnight(now, 1).getTime() - 1);
  return {
    today: { from: startOfToday, to: endOfToday },
    last7Days: { from: cairoMidnight(now, -6), to: endOfToday },
    todaySoFar: { from: startOfToday, to: now },
    sameTimeLastWeek: { from: cairoMidnight(now, -7), to: new Date(now.getTime() - 7 * DAY_MS) },
  };
}
