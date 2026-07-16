import { describe, expect, it } from 'vitest';
import { generateDaySlots } from './slots';
import type { SchedulingRules, WorkingHoursDay } from '../types';

const rules: SchedulingRules = {
  slotDurationMinutes: 30,
  bufferMinutes: 0,
  minNoticeMinutes: 0,
  maxBookingWindowDays: 30,
};

const workingDay: WorkingHoursDay = {
  dayOfWeek: 'monday',
  isWorkingDay: true,
  hours: { start: '09:00', end: '11:00' },
  breaks: [],
};

const date = new Date(2026, 6, 20); // a Monday
const farPast = new Date(2020, 0, 1);

describe('generateDaySlots', () => {
  it('generates back-to-back slots spanning the working hours', () => {
    const slots = generateDaySlots(workingDay, rules, date, farPast);
    expect(slots).toHaveLength(4);
    expect(slots[0].status).toBe('available');
  });

  it('returns nothing for a non-working day', () => {
    const slots = generateDaySlots({ ...workingDay, isWorkingDay: false }, rules, date, farPast);
    expect(slots).toHaveLength(0);
  });

  it('omits slots that fall inside a break', () => {
    const withBreak: WorkingHoursDay = { ...workingDay, breaks: [{ start: '10:00', end: '10:30' }] };
    const slots = generateDaySlots(withBreak, rules, date, farPast);
    expect(slots).toHaveLength(3);
    expect(slots.some((slot) => slot.id.endsWith('10:00'))).toBe(false);
  });

  it('spaces slots apart by the buffer', () => {
    const slots = generateDaySlots(workingDay, { ...rules, bufferMinutes: 30 }, date, farPast);
    expect(slots).toHaveLength(2);
  });

  it('marks a slot already past as status "past"', () => {
    const farFuture = new Date(2030, 0, 1);
    const slots = generateDaySlots(workingDay, rules, date, farFuture);
    expect(slots.every((slot) => slot.status === 'past')).toBe(true);
  });

  it('marks a slot overlapping an existing booking as status "booked"', () => {
    const slots = generateDaySlots(workingDay, rules, date, farPast, [{ start: '09:30', end: '10:00' }]);
    expect(slots.find((slot) => slot.id.endsWith('09:30'))?.status).toBe('booked');
    expect(slots.find((slot) => slot.id.endsWith('09:00'))?.status).toBe('available');
  });
});
