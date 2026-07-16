import type { TimeOfDay, TimeRange } from '@/features/scheduling/types';

/** "09:30" → 570. The single place `TimeOfDay` parsing happens — every other util in this module works in minutes-since-midnight, not string time math. */
export function toMinutes(time: TimeOfDay): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** 570 → "09:30". Inverse of `toMinutes`; always zero-pads to two digits. */
export function fromMinutes(totalMinutes: number): TimeOfDay {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function addMinutesToTime(time: TimeOfDay, minutesToAdd: number): TimeOfDay {
  return fromMinutes(toMinutes(time) + minutesToAdd);
}

export function isTimeBefore(a: TimeOfDay, b: TimeOfDay): boolean {
  return toMinutes(a) < toMinutes(b);
}

/** Half-open: `time === range.start` is inside, `time === range.end` is not — matches how a slot's own `[start, end)` is treated elsewhere in this module. */
export function isTimeWithinRange(time: TimeOfDay, range: TimeRange): boolean {
  const value = toMinutes(time);
  return value >= toMinutes(range.start) && value < toMinutes(range.end);
}

/** True when `[aStart, aEnd)` and `[bStart, bEnd)` share any minute. */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

/** Combines a calendar date (year/month/day only) with a `TimeOfDay` into a concrete local `Date` — the one place this module turns a recurring time-of-day into a real instant. */
export function combineDateAndTime(date: Date, time: TimeOfDay): Date {
  const result = new Date(date);
  const minutes = toMinutes(time);
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}
