/**
 * Pure week/date arithmetic — extracted from `features/doctor/lib/week.ts`
 * (which had no doctor-specific logic in these particular functions) so the
 * Patient Portal's own Appointments calendar reuses the same math instead
 * of duplicating it. Doctor Portal's `getWeekDayName`/`getNextAvailability`
 * stay in `features/doctor/lib/week.ts` since they depend on Doctor's own
 * `WeekDay`/`AvailabilityBlockData` types — genuinely domain-specific.
 */

/** Midnight on the Sunday of `date`'s week. */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

/** The 7 dates of the week starting at `weekStart` (expected to already be a Sunday, e.g. from `startOfWeek`). */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + index);
    return day;
  });
}

export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
