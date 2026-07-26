import type { Holiday } from '../../domain/entities/holiday.entity.js';
import type { ScheduleException } from '../../domain/entities/schedule-exception.entity.js';
import type { TimeRangeProps } from '../../domain/entities/working-hours-day.entity.js';
import type { WorkingHoursDay } from '../../domain/entities/working-hours-day.entity.js';
import { ScheduleExceptionType } from '../../domain/enums/schedule-exception-type.enum.js';
import { ALL_WEEK_DAYS, type WeekDay } from '../../domain/enums/week-day.enum.js';
import type { SchedulingRules } from '../use-cases/get-scheduling-rules/get-scheduling-rules.use-case.js';

/**
 * Onboarding Redesign integration-gap closure (2026-07-25): the server-side,
 * authoritative port of the frontend's own `resolveDayForDate` +
 * `generateDaySlots` + the notice/window half of `detectConflict`
 * (apps/frontend/src/features/scheduling/utils/{resolve-day,slots,conflicts}.ts)
 * -- same algorithm, now the one place it's allowed to run, per "patients
 * must never calculate authoritative availability on the frontend." All
 * date/time math is UTC-based (a doctor's "HH:mm" working hours have no
 * timezone of their own in this domain, matching the pre-existing frontend
 * design) rather than depending on the server process's local timezone.
 */

const WEEKDAY_BY_INDEX: readonly WeekDay[] = ALL_WEEK_DAYS;

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function rangesOverlap(a: TimeRangeProps, b: TimeRangeProps): boolean {
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

function combineDateAndTime(date: Date, time: string): Date {
  const minutes = toMinutes(time);
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  result.setUTCHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}

/** "2026-07-24" -- matches `ScheduleException.date`/`Holiday.date`'s own storage format. */
function toDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export interface EffectiveDay {
  isWorkingDay: boolean;
  hours: TimeRangeProps;
  breaks: TimeRangeProps[];
}

/**
 * The recurring weekly template, overridden (priority order) by: an
 * `extra-hours` exception (wins even over a holiday), a holiday, then a
 * `vacation`/`unavailable` exception -- identical precedence to the
 * frontend's own `resolveDayForDate`.
 */
export function resolveEffectiveDay(
  date: Date,
  workingDays: readonly WorkingHoursDay[],
  exceptions: readonly ScheduleException[],
  holidays: readonly Holiday[],
): EffectiveDay {
  const weekday = WEEKDAY_BY_INDEX[date.getUTCDay()];
  const recurring = workingDays.find((day) => day.getDayOfWeek() === weekday);
  const fallback: EffectiveDay = { isWorkingDay: false, hours: { start: '00:00', end: '00:00' }, breaks: [] };
  const base: EffectiveDay = recurring
    ? { isWorkingDay: recurring.getIsWorkingDay(), hours: recurring.getHours(), breaks: recurring.getBreaks() }
    : fallback;

  const dateKey = toDateKey(date);
  const exception = exceptions.find((entry) => entry.getDate() === dateKey);

  if (exception?.getType() === ScheduleExceptionType.ExtraHours) {
    return { ...base, isWorkingDay: true, hours: exception.getHours() ?? base.hours };
  }

  const holiday = holidays.find((entry) => entry.getDate() === dateKey);
  if (holiday) {
    return { ...base, isWorkingDay: false };
  }

  if (exception) {
    return { ...base, isWorkingDay: false };
  }

  return base;
}

export interface CandidateSlot {
  start: Date;
  end: Date;
}

/**
 * Every bookable [start, end) candidate for one calendar date: steps through
 * the effective day's working hours by `slotDurationMinutes + bufferMinutes`,
 * skips any slot overlapping a break, then drops slots that fail the
 * minimum-notice or maximum-booking-window rules -- identical semantics to
 * the frontend's `generateDaySlots` + the notice/window half of
 * `detectConflict`, just without needing to report *why* a slot was
 * excluded (this is a "what's bookable" answer, not an interactive
 * calendar's conflict-explanation UI).
 */
export function generateCandidateSlotsForDate(
  date: Date,
  effectiveDay: EffectiveDay,
  rules: SchedulingRules,
  now: Date,
): CandidateSlot[] {
  if (!effectiveDay.isWorkingDay) return [];

  const step = rules.slotDurationMinutes + rules.bufferMinutes;
  const minNoticeDeadline = new Date(now.getTime() + rules.minNoticeMinutes * 60_000);
  const maxBookingDeadline = new Date(now.getTime() + rules.maxBookingWindowDays * 24 * 60 * 60_000);

  const slots: CandidateSlot[] = [];
  for (
    let cursor = toMinutes(effectiveDay.hours.start);
    cursor + rules.slotDurationMinutes <= toMinutes(effectiveDay.hours.end);
    cursor += step
  ) {
    const candidateRange: TimeRangeProps = {
      start: fromMinutes(cursor),
      end: fromMinutes(cursor + rules.slotDurationMinutes),
    };

    if (effectiveDay.breaks.some((brk) => rangesOverlap(candidateRange, brk))) continue;

    const start = combineDateAndTime(date, candidateRange.start);
    const end = combineDateAndTime(date, candidateRange.end);

    if (start < minNoticeDeadline || start > maxBookingDeadline) continue;

    slots.push({ start, end });
  }

  return slots;
}
