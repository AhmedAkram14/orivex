import type { RecurringWeeklySchedule, ScheduleException, WeekDay, WorkingHoursDay } from '@/features/scheduling/types';

/** "YYYY-MM-DD" in local time — matches the `<input type="date">` value `ScheduleExceptionsManager` collects, and the format `ScheduleException.date` is stored in. */
function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Resolves the effective working-hours day for a specific date — the
 * recurring weekly template, with any matching `ScheduleException`
 * overriding it. A `vacation`/`unavailable` exception blocks the whole
 * date regardless of what the recurring template says; `extra-hours`
 * replaces the recurring hours (falling back to them if the exception
 * itself carries none). Shared by every calendar view (Week/Month/Day) so
 * "what does this date actually look like" is computed in exactly one
 * place, not re-derived per view.
 */
export function resolveDayForDate(
  date: Date,
  weekday: WeekDay,
  schedule: RecurringWeeklySchedule,
  exceptions: ScheduleException[],
): WorkingHoursDay {
  const recurring: WorkingHoursDay = schedule.find((day) => day.dayOfWeek === weekday) ?? {
    dayOfWeek: weekday,
    isWorkingDay: false,
    hours: { start: '00:00', end: '00:00' },
    breaks: [],
  };

  const dateKey = toDateKey(date);
  const exception = exceptions.find((entry) => entry.date === dateKey);
  if (!exception) return recurring;

  if (exception.type === 'extra-hours') {
    return { ...recurring, isWorkingDay: true, hours: exception.hours ?? recurring.hours };
  }

  return { ...recurring, isWorkingDay: false };
}
