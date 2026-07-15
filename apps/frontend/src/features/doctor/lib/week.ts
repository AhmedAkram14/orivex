import type { WeekDay } from '@/features/doctor/api/types';

const WEEKDAYS: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** JS `Date.getDay()` (0=Sunday..6=Saturday) mapped to `WeekDay` — the single place that mapping lives. */
export function getWeekDayName(date: Date): WeekDay {
  return WEEKDAYS[date.getDay()];
}

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
