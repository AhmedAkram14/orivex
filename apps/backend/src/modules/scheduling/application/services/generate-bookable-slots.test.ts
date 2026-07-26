import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Holiday } from '../../domain/entities/holiday.entity.js';
import { ScheduleException } from '../../domain/entities/schedule-exception.entity.js';
import { WorkingHoursDay } from '../../domain/entities/working-hours-day.entity.js';
import { WeekDay } from '../../domain/enums/week-day.enum.js';
import type { SchedulingRules } from '../use-cases/get-scheduling-rules/get-scheduling-rules.use-case.js';

import { generateCandidateSlotsForDate, resolveEffectiveDay } from './generate-bookable-slots.js';

const DOCTOR_ID = '11111111-1111-4111-8111-111111111111';

const rules: SchedulingRules = {
  slotDurationMinutes: 30,
  bufferMinutes: 0,
  minNoticeMinutes: 0,
  maxBookingWindowDays: 30,
};

// A Monday.
const monday = new Date(Date.UTC(2026, 6, 20));
// "Now" for tests unrelated to the max-booking-window rule itself -- must
// stay within `rules.maxBookingWindowDays` of the target date (unlike the
// frontend's own `slots.test.ts`, which has no such rule to satisfy: this
// port folds the notice/window checks directly in, see the header comment).
const earlyMorningSameDay = new Date(Date.UTC(2026, 6, 20, 0, 0));

function workingDay(overrides: Partial<Parameters<typeof WorkingHoursDay.create>[1]> = {}): WorkingHoursDay {
  return WorkingHoursDay.create('day-1', {
    doctorId: DOCTOR_ID,
    dayOfWeek: WeekDay.Monday,
    isWorkingDay: true,
    hours: { start: '09:00', end: '11:00' },
    breaks: [],
    ...overrides,
  });
}

describe('resolveEffectiveDay', () => {
  it('falls back to the recurring template when nothing overrides it', () => {
    const effective = resolveEffectiveDay(monday, [workingDay()], [], []);
    assert.equal(effective.isWorkingDay, true);
    assert.deepEqual(effective.hours, { start: '09:00', end: '11:00' });
  });

  it('an extra-hours exception wins even over a holiday on the same date', () => {
    const exception = ScheduleException.create({
      doctorId: DOCTOR_ID,
      date: '2026-07-20',
      type: 'extra-hours',
      hours: { start: '14:00', end: '16:00' },
    });
    const holiday = Holiday.reconstitute({ id: 'h1', date: '2026-07-20', name: 'Some Holiday' });

    const effective = resolveEffectiveDay(monday, [workingDay({ isWorkingDay: false })], [exception], [holiday]);
    assert.equal(effective.isWorkingDay, true);
    assert.deepEqual(effective.hours, { start: '14:00', end: '16:00' });
  });

  it('a holiday blocks the day even when the recurring template says working', () => {
    const holiday = Holiday.reconstitute({ id: 'h1', date: '2026-07-20', name: 'Some Holiday' });
    const effective = resolveEffectiveDay(monday, [workingDay()], [], [holiday]);
    assert.equal(effective.isWorkingDay, false);
  });

  it('a vacation/unavailable exception blocks the day', () => {
    const exception = ScheduleException.create({ doctorId: DOCTOR_ID, date: '2026-07-20', type: 'vacation' });
    const effective = resolveEffectiveDay(monday, [workingDay()], [exception], []);
    assert.equal(effective.isWorkingDay, false);
  });
});

describe('generateCandidateSlotsForDate', () => {
  it('generates back-to-back 30-minute slots spanning the working hours', () => {
    const effective = resolveEffectiveDay(monday, [workingDay()], [], []);
    const slots = generateCandidateSlotsForDate(monday, effective, rules, earlyMorningSameDay);
    assert.equal(slots.length, 4);
    assert.equal(slots[0].start.toISOString(), new Date(Date.UTC(2026, 6, 20, 9, 0)).toISOString());
    assert.equal(slots[3].start.toISOString(), new Date(Date.UTC(2026, 6, 20, 10, 30)).toISOString());
  });

  it('returns nothing for a non-working day', () => {
    const effective = resolveEffectiveDay(monday, [workingDay({ isWorkingDay: false })], [], []);
    const slots = generateCandidateSlotsForDate(monday, effective, rules, earlyMorningSameDay);
    assert.equal(slots.length, 0);
  });

  it('omits slots that fall inside a break', () => {
    const effective = resolveEffectiveDay(
      monday,
      [workingDay({ breaks: [{ start: '10:00', end: '10:30' }] })],
      [],
      [],
    );
    const slots = generateCandidateSlotsForDate(monday, effective, rules, earlyMorningSameDay);
    assert.equal(slots.length, 3);
    assert.equal(
      slots.some((slot) => slot.start.toISOString() === new Date(Date.UTC(2026, 6, 20, 10, 0)).toISOString()),
      false,
    );
  });

  it('spaces slots apart by the buffer', () => {
    const effective = resolveEffectiveDay(monday, [workingDay()], [], []);
    const slots = generateCandidateSlotsForDate(monday, effective, { ...rules, bufferMinutes: 30 }, earlyMorningSameDay);
    assert.equal(slots.length, 2);
  });

  it('excludes a slot that violates minimum notice', () => {
    const effective = resolveEffectiveDay(monday, [workingDay()], [], []);
    // "now" is 09:15 the same day -- the 09:00 slot has already started, and
    // 60 minutes' notice pushes out everything before 10:15.
    const now = new Date(Date.UTC(2026, 6, 20, 9, 15));
    const slots = generateCandidateSlotsForDate(monday, effective, { ...rules, minNoticeMinutes: 60 }, now);
    assert.equal(slots.length, 1);
    assert.equal(slots[0].start.toISOString(), new Date(Date.UTC(2026, 6, 20, 10, 30)).toISOString());
  });

  it('excludes a slot beyond the maximum booking window', () => {
    const effective = resolveEffectiveDay(monday, [workingDay()], [], []);
    const now = new Date(Date.UTC(2026, 6, 20, 8, 0));
    const slots = generateCandidateSlotsForDate(monday, effective, { ...rules, maxBookingWindowDays: 0 }, now);
    assert.equal(slots.length, 0);
  });
});
