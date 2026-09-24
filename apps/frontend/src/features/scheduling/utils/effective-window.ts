import { fromMinutes, toMinutes } from '@/features/scheduling/utils/time';
import type { TimeOfDay, TimeRange } from '@/features/scheduling/types';

export interface EffectiveWindow {
  start: TimeOfDay;
  end: TimeOfDay;
}

export interface EffectiveWindows {
  /**
   * The real bookable sub-windows left after subtracting every break from
   * the working-hours window, in chronological order. Empty when one or
   * more breaks fully cover the working hours (a legitimate "no bookable
   * time today" day, not an error).
   */
  bookableWindows: EffectiveWindow[];
  /**
   * Every break that actually falls (even partially) inside the working
   * hours, clipped to the working-hours boundary and merged where two
   * breaks overlap/touch — in chronological order. A break entirely outside
   * the working hours never appears here (see doc comment below).
   */
  breaks: EffectiveWindow[];
}

/**
 * Splits one day's working-hours window into its real bookable sub-windows
 * around its breaks — the single shared computation behind every "effective
 * availability" summary on the Schedule page (week chips, the Weekly
 * Availability dialog's per-day summary, and the week/day grid's background
 * blocks), so none of them can independently drift on what "bookable" means
 * for a day with breaks.
 *
 * Handles, by construction rather than special-casing: a break at the very
 * start of the day (the first bookable window simply starts later), a break
 * at the very end (the last bookable window simply ends earlier), a break
 * spanning the rest of the day (no trailing bookable window), multiple
 * breaks (multiple bookable sub-windows), zero breaks (one bookable window
 * equal to the full working hours), and a break declared outside the
 * working hours -- clipped away entirely rather than allowed to extend or
 * shrink a bookable window it doesn't actually overlap.
 *
 * Pure and timezone-agnostic: operates on `TimeOfDay` ("HH:mm") strings only
 * (a recurring time-of-day, not an instant), matching every other util in
 * `features/scheduling/utils`.
 */
export function computeEffectiveWindows(hours: TimeRange, breaks: TimeRange[]): EffectiveWindows {
  const dayStart = toMinutes(hours.start);
  const dayEnd = toMinutes(hours.end);

  if (dayEnd <= dayStart) {
    return { bookableWindows: [], breaks: [] };
  }

  // Clip every break to the working-hours boundary, then drop anything that
  // no longer has positive duration -- this is what removes a break
  // declared entirely outside the working hours (and clips one that only
  // partially overlaps), without ever letting it touch the bookable window
  // it doesn't really apply to.
  const clipped = breaks
    .map((brk) => ({ start: Math.max(toMinutes(brk.start), dayStart), end: Math.min(toMinutes(brk.end), dayEnd) }))
    .filter((brk) => brk.end > brk.start)
    .sort((a, b) => a.start - b.start);

  // Merge overlapping/touching breaks so two breaks that abut each other
  // (or were double-booked) collapse into one real gap instead of producing
  // a zero-length "bookable window" between them.
  const merged: { start: number; end: number }[] = [];
  for (const brk of clipped) {
    const last = merged[merged.length - 1];
    if (last && brk.start <= last.end) {
      last.end = Math.max(last.end, brk.end);
    } else {
      merged.push({ ...brk });
    }
  }

  const bookableWindows: EffectiveWindow[] = [];
  let cursor = dayStart;
  for (const brk of merged) {
    if (brk.start > cursor) {
      bookableWindows.push({ start: fromMinutes(cursor), end: fromMinutes(brk.start) });
    }
    cursor = Math.max(cursor, brk.end);
  }
  if (cursor < dayEnd) {
    bookableWindows.push({ start: fromMinutes(cursor), end: fromMinutes(dayEnd) });
  }

  return {
    bookableWindows,
    breaks: merged.map((brk) => ({ start: fromMinutes(brk.start), end: fromMinutes(brk.end) })),
  };
}
