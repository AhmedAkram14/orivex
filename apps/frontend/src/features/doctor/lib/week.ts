import type { AvailabilityBlockData, WeekDay } from '@/features/doctor/api/types';

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

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export interface NextAvailability {
  date: Date;
  block: AvailabilityBlockData;
}

/**
 * The next upcoming availability block from `now`, scanning at most 7
 * days forward (today included) — today's block only counts if it hasn't
 * already ended. Returns `null` when no block is found in that window
 * (an honest "nothing upcoming" rather than searching indefinitely).
 */
export function getNextAvailability(blocks: AvailabilityBlockData[], now: Date): NextAvailability | null {
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(now, offset);
    const weekday = getWeekDayName(date);
    const block = blocks.find((entry) => entry.dayOfWeek === weekday);
    if (!block) continue;
    if (offset === 0 && now.getHours() >= block.endHour) continue;
    return { date, block };
  }
  return null;
}
