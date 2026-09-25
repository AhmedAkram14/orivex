import { computeEffectiveWindows } from '@/features/scheduling/utils/effective-window';
import { toMinutes } from '@/features/scheduling/utils/time';

interface DayInput {
  isWorkingDay: boolean;
  hours: { start: string; end: string };
  breaks: Array<{ start: string; end: string }>;
}

export interface DayDescription {
  /** False for a day off, and for a working day whose breaks leave no bookable time. */
  isWorking: boolean;
  bookable: Array<{ start: string; end: string }>;
  breaks: Array<{ start: string; end: string }>;
  /** Breaks strictly inside the working span -- the only ones worth calling "a break". */
  internalBreaks: Array<{ start: string; end: string }>;
  /** First bookable start to last bookable end, e.g. { start: '10:00', end: '13:00' }. */
  span?: { start: string; end: string };
}

/**
 * One day's real availability, worked out once for every surface (calendar
 * header chip, off-hours shading, Weekly Availability table).
 *
 * A break that runs to the end of the day (or starts at the very beginning)
 * is not really a break: it just ends (or delays) working hours. So with
 * hours 10:00-18:00 and a break 13:00-18:00 the day reads 10:00-13:00 with
 * no break, instead of "10:00-18:00, 1 break".
 */
export function describeDay(day: DayInput): DayDescription {
  if (!day.isWorkingDay) return { isWorking: false, bookable: [], breaks: [], internalBreaks: [] };

  const { bookableWindows, breaks } = computeEffectiveWindows(day.hours, day.breaks);
  if (bookableWindows.length === 0) return { isWorking: false, bookable: [], breaks, internalBreaks: [] };

  const start = bookableWindows[0].start;
  const end = bookableWindows[bookableWindows.length - 1].end;
  const internalBreaks = breaks.filter((brk) => toMinutes(brk.start) > toMinutes(start) && toMinutes(brk.end) < toMinutes(end));

  return { isWorking: true, bookable: bookableWindows, breaks, internalBreaks, span: { start, end } };
}
