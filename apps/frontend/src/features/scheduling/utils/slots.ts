import { addMinutesToTime, combineDateAndTime, fromMinutes, rangesOverlap, toMinutes } from '@/features/scheduling/utils/time';
import type { SchedulingRules, TimeRange, TimeSlotData, WorkingHoursDay } from '@/features/scheduling/types';

/**
 * Generates the bookable slots for one working day — Milestone 6's slot-
 * generation architecture. Slots inside a break are never emitted (a break
 * is an absence, not a "blocked" bookable slot). Consecutive slots are
 * spaced `slotDurationMinutes + bufferMinutes` apart, so the buffer is
 * real dead time between bookings, not just a label. A slot already in the
 * past (relative to `now`) or overlapping an existing booking is emitted
 * with `status: 'past'` / `'booked'` rather than omitted, so a calendar UI
 * can still render (and explain) why it isn't selectable.
 */
export function generateDaySlots(
  day: WorkingHoursDay,
  rules: SchedulingRules,
  date: Date,
  now: Date,
  bookedRanges: TimeRange[] = [],
): TimeSlotData[] {
  if (!day.isWorkingDay) return [];

  const step = rules.slotDurationMinutes + rules.bufferMinutes;
  const slots: TimeSlotData[] = [];

  for (
    let cursor = toMinutes(day.hours.start);
    cursor + rules.slotDurationMinutes <= toMinutes(day.hours.end);
    cursor += step
  ) {
    const candidate: TimeRange = { start: fromMinutes(cursor), end: addMinutesToTime(fromMinutes(cursor), rules.slotDurationMinutes) };

    if (day.breaks.some((brk) => rangesOverlap(candidate, brk))) continue;

    const start = combineDateAndTime(date, candidate.start);
    const end = combineDateAndTime(date, candidate.end);

    const status = bookedRanges.some((booked) => rangesOverlap(candidate, booked))
      ? 'booked'
      : start <= now
        ? 'past'
        : 'available';

    slots.push({ id: `${date.toISOString().slice(0, 10)}-${candidate.start}`, start: start.toISOString(), end: end.toISOString(), status });
  }

  return slots;
}
