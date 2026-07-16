import { addDays, startOfWeek } from '@/shared/lib/date/week';

/** Midnight on the 1st of `date`'s month. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * The full 42-day (6-week) grid a month calendar renders — from the Sunday
 * on/before the 1st through the Saturday that completes the sixth week, so
 * every row is a real, complete week (never a partial one that would make
 * the grid ragged). Always 42 entries regardless of how many weeks the
 * month itself spans, for a stable calendar layout.
 */
export function getMonthGridDays(monthDate: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(monthDate));
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  return result;
}
