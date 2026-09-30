import type { RecurringWeeklySchedule, ScheduleException, TimeRange } from '@/features/scheduling/types';
import { toMinutes } from '@/features/scheduling/utils/time';
import { getWeekDayName } from '@/features/doctor/lib/week';

/**
 * Why the doctor's day strip has nothing left to draw:
 *   ended     -- today is a working day and its hours are over (e.g. 10 PM after 9 AM - 7 PM)
 *   noneLeft  -- today's hours are still running but no open slot or visit is left in them
 *   off       -- today has no hours (not a working day, or a vacation/unavailable exception)
 *   unset     -- no working day at all: the doctor hasn't set hours yet
 */
export type TodayHoursState = 'ended' | 'noneLeft' | 'off' | 'unset';

/**
 * Today's hours from the doctor's real schedule: a date exception wins (vacation/unavailable block the day,
 * extra-hours supply them); otherwise the weekly template's day. `cairoNow` is Cairo wall-clock time
 * (`getCairoNow()`), so its local date/hours are Cairo's.
 */
export function todayHours(
  schedule: RecurringWeeklySchedule | undefined,
  exceptions: ScheduleException[] | undefined,
  cairoNow: Date,
): TimeRange | null {
  const dateKey = `${cairoNow.getFullYear()}-${String(cairoNow.getMonth() + 1).padStart(2, '0')}-${String(cairoNow.getDate()).padStart(2, '0')}`;
  const exception = (exceptions ?? []).find((entry) => entry.date.slice(0, 10) === dateKey);
  if (exception) return exception.type === 'extra-hours' && exception.hours ? exception.hours : null;
  const day = (schedule ?? []).find((entry) => entry.dayOfWeek === getWeekDayName(cairoNow));
  return day?.isWorkingDay ? day.hours : null;
}

export function todayHoursState(
  schedule: RecurringWeeklySchedule | undefined,
  exceptions: ScheduleException[] | undefined,
  cairoNow: Date,
): TodayHoursState {
  const hours = todayHours(schedule, exceptions, cairoNow);
  if (hours) {
    const nowMinutes = cairoNow.getHours() * 60 + cairoNow.getMinutes();
    return nowMinutes >= toMinutes(hours.end) ? 'ended' : 'noneLeft';
  }
  return (schedule ?? []).some((entry) => entry.isWorkingDay) ? 'off' : 'unset';
}
