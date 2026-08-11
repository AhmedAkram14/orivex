import { describe, expect, it } from 'vitest';
import { detectConflict } from './conflicts';
import type { SchedulingRules, WorkingHoursDay } from '../types';

const rules: SchedulingRules = {
  slotDurationMinutes: 30,
  bufferMinutes: 0,
  minNoticeMinutes: 60,
  maxBookingWindowDays: 30,
};

const workingDay: WorkingHoursDay = {
  dayOfWeek: 'monday',
  isWorkingDay: true,
  hours: { start: '09:00', end: '17:00' },
  breaks: [{ start: '13:00', end: '14:00' }],
  pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null },
};

const targetDate = new Date(2026, 6, 20, 0, 0, 0, 0);
const now = new Date(2026, 6, 19, 8, 0, 0, 0);

describe('detectConflict', () => {
  it('returns null for a bookable candidate', () => {
    expect(detectConflict({ start: '10:00', end: '10:30' }, workingDay, rules, now, targetDate)).toBeNull();
  });

  it('flags a candidate outside working hours', () => {
    expect(detectConflict({ start: '18:00', end: '18:30' }, workingDay, rules, now, targetDate)).toBe(
      'outside-working-hours',
    );
  });

  it('flags a candidate on a non-working day', () => {
    expect(
      detectConflict({ start: '10:00', end: '10:30' }, { ...workingDay, isWorkingDay: false }, rules, now, targetDate),
    ).toBe('outside-working-hours');
  });

  it('flags a candidate inside a break', () => {
    expect(detectConflict({ start: '13:15', end: '13:45' }, workingDay, rules, now, targetDate)).toBe('inside-break');
  });

  it('flags a candidate overlapping an existing booking', () => {
    expect(
      detectConflict({ start: '10:00', end: '10:30' }, workingDay, rules, now, targetDate, [
        { start: '10:00', end: '10:30' },
      ]),
    ).toBe('already-booked');
  });

  it('flags a candidate inside the minimum-notice window', () => {
    const soon = new Date(targetDate);
    soon.setHours(9, 30, 0, 0);
    expect(detectConflict({ start: '09:30', end: '10:00' }, workingDay, rules, soon, targetDate)).toBe(
      'insufficient-notice',
    );
  });

  it('flags a candidate beyond the maximum booking window', () => {
    const farDate = new Date(2027, 0, 1);
    expect(detectConflict({ start: '10:00', end: '10:30' }, workingDay, rules, now, farDate)).toBe(
      'beyond-booking-window',
    );
  });
});
