import { combineDateAndTime, isTimeWithinRange, rangesOverlap } from '@/features/scheduling/utils/time';
import type { ConflictReason, SchedulingRules, TimeRange, WorkingHoursDay } from '@/features/scheduling/types';

/**
 * The double-book-prevention / booking-rule architecture Milestone 6 exists
 * to define — checks a candidate booking against working hours, breaks,
 * existing bookings, minimum notice, and the maximum booking window, in
 * that order, returning the first reason it fails (or `null` if it's
 * bookable). No backend enforcement exists yet — this is the UI-side
 * architecture that mirrors the check the real `SchedulingModule`'s slot-
 * reservation logic will eventually run server-side (docs/10, Section on
 * `SchedulingModule`), not a substitute for it.
 */
export function detectConflict(
  candidate: TimeRange,
  day: WorkingHoursDay,
  rules: SchedulingRules,
  now: Date,
  targetDate: Date,
  existingBookings: TimeRange[] = [],
): ConflictReason | null {
  if (!day.isWorkingDay || !isTimeWithinRange(candidate.start, day.hours) || !isTimeWithinRange(candidate.end, { start: day.hours.start, end: addOneMinute(day.hours.end) })) {
    return 'outside-working-hours';
  }

  if (day.breaks.some((brk) => rangesOverlap(candidate, brk))) {
    return 'inside-break';
  }

  if (existingBookings.some((booked) => rangesOverlap(candidate, booked))) {
    return 'already-booked';
  }

  const candidateStart = combineDateAndTime(targetDate, candidate.start);

  const minNoticeDeadline = new Date(now.getTime() + rules.minNoticeMinutes * 60_000);
  if (candidateStart < minNoticeDeadline) {
    return 'insufficient-notice';
  }

  const maxBookingDeadline = new Date(now.getTime() + rules.maxBookingWindowDays * 24 * 60 * 60_000);
  if (candidateStart > maxBookingDeadline) {
    return 'beyond-booking-window';
  }

  return null;
}

/** `isTimeWithinRange` is half-open (`end` itself is outside its own range) — this nudges the day's own closing minute to treat a slot ending exactly at closing time as still inside working hours. */
function addOneMinute(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const total = hours * 60 + minutes + 1;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
