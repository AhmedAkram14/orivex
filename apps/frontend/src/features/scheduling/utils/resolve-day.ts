import type { Holiday, RecurringWeeklySchedule, ScheduleException, WeekDay, WorkingHoursDay } from '@/features/scheduling/types';

/** "YYYY-MM-DD" in local time — matches the `<input type="date">` value `ScheduleExceptionsManager` collects, and the format `ScheduleException.date`/`Holiday.date` are stored in. */
function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Resolves the effective working-hours day for a specific date — the
 * recurring weekly template, overridden (in priority order) by: an
 * `extra-hours` exception (an explicit, deliberate override — wins even
 * over a holiday), a holiday (Milestone 6's global, doctor-agnostic
 * non-working date), then a `vacation`/`unavailable` exception. Shared by
 * every calendar view (Week/Month/Day/Agenda/Booking) so "what does this
 * date actually look like" is computed in exactly one place, not
 * re-derived per view.
 */
export function resolveDayForDate(
  date: Date,
  weekday: WeekDay,
  schedule: RecurringWeeklySchedule,
  exceptions: ScheduleException[],
  holidays: Holiday[] = [],
): WorkingHoursDay {
  const recurring: WorkingHoursDay = schedule.find((day) => day.dayOfWeek === weekday) ?? {
    dayOfWeek: weekday,
    isWorkingDay: false,
    hours: { start: '00:00', end: '00:00' },
    breaks: [],
    pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null },
  };

  const dateKey = toDateKey(date);
  const exception = exceptions.find((entry) => entry.date === dateKey);

  if (exception?.type === 'extra-hours') {
    return { ...recurring, isWorkingDay: true, hours: exception.hours ?? recurring.hours };
  }

  const holiday = holidays.find((entry) => entry.date === dateKey);
  if (holiday) {
    return { ...recurring, isWorkingDay: false };
  }

  if (exception) {
    return { ...recurring, isWorkingDay: false };
  }

  return recurring;
}
