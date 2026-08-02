import type { WeekDay } from '@/features/doctor/api/types';
import type { RecurringWeeklySchedule, WorkingHoursDay } from '@/features/scheduling/types';
import { toMinutes } from '@/features/scheduling/utils/time';
import { addDays } from '@/shared/lib/date/week';

// Generic week/date arithmetic (startOfWeek, getWeekDays, addWeeks,
// isSameDay, addDays) lives in shared/lib/date/week.ts — it had no
// doctor-specific logic, so the Patient Portal's Appointments calendar
// reuses it directly instead of a duplicate copy. Re-exported here so this
// module's existing callers (doctor/schedule/page.tsx, next-availability-
// card.tsx) don't need an import-path change.
export { addDays, addWeeks, getWeekDays, isSameDay, startOfWeek } from '@/shared/lib/date/week';

const WEEKDAYS: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** JS `Date.getDay()` (0=Sunday..6=Saturday) mapped to `WeekDay` — the single place that mapping lives. */
export function getWeekDayName(date: Date): WeekDay {
  return WEEKDAYS[date.getDay()];
}

export interface NextAvailability {
  date: Date;
  day: WorkingHoursDay;
}

/**
 * The next upcoming working day from `now`, scanning at most 7 days
 * forward (today included) — today only counts if it's a working day and
 * its hours haven't already ended. Returns `null` when nothing is found in
 * that window (an honest "nothing upcoming" rather than searching
 * indefinitely). Operates on Phase 9's `RecurringWeeklySchedule`
 * (`features/scheduling/types.ts`) — the real replacement for Phase 7's
 * `AvailabilityBlockData` this function used to consume.
 */
export function getNextAvailability(schedule: RecurringWeeklySchedule, now: Date): NextAvailability | null {
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(now, offset);
    const weekday = getWeekDayName(date);
    const day = schedule.find((entry) => entry.dayOfWeek === weekday);
    if (!day || !day.isWorkingDay) continue;
    if (offset === 0 && now.getHours() * 60 + now.getMinutes() >= toMinutes(day.hours.end)) continue;
    return { date, day };
  }
  return null;
}

/**
 * The next `count` upcoming working days from `now` (today included, same
 * "today only counts if its hours haven't already ended" rule as
 * `getNextAvailability`) — scans forward day by day, skipping any date with
 * no recurring availability, so returned dates are real working days but
 * not necessarily consecutive calendar days. Scans at most 60 days forward
 * before giving up (an all-`isWorkingDay: false` schedule would otherwise
 * loop forever); returns fewer than `count` entries in that honest case
 * rather than fabricating placeholder dates.
 */
export function getUpcomingAvailabilityDays(
  schedule: RecurringWeeklySchedule,
  now: Date,
  count = 4,
): NextAvailability[] {
  const results: NextAvailability[] = [];
  const maxScanDays = 60;

  for (let offset = 0; offset < maxScanDays && results.length < count; offset += 1) {
    const date = addDays(now, offset);
    const weekday = getWeekDayName(date);
    const day = schedule.find((entry) => entry.dayOfWeek === weekday);
    if (!day || !day.isWorkingDay) continue;
    if (offset === 0 && now.getHours() * 60 + now.getMinutes() >= toMinutes(day.hours.end)) continue;
    results.push({ date, day });
  }

  return results;
}
