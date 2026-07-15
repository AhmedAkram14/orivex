import type { AvailabilityBlockData, WeekDay } from '@/features/doctor/api/types';
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
