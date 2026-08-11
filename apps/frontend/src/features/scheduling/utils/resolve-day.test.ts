import { describe, expect, it } from 'vitest';
import { resolveDayForDate } from './resolve-day';
import type { Holiday, RecurringWeeklySchedule, ScheduleException } from '../types';

const schedule: RecurringWeeklySchedule = [
  {
    dayOfWeek: 'monday',
    isWorkingDay: true,
    hours: { start: '09:00', end: '17:00' },
    breaks: [],
    pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null },
  },
];

const monday = new Date(2026, 6, 13); // a Monday

describe('resolveDayForDate', () => {
  it('returns the recurring day unchanged when no exception applies', () => {
    const result = resolveDayForDate(monday, 'monday', schedule, []);
    expect(result.isWorkingDay).toBe(true);
    expect(result.hours).toEqual({ start: '09:00', end: '17:00' });
  });

  it('falls back to a non-working day for a weekday with no recurring entry', () => {
    const result = resolveDayForDate(monday, 'tuesday', schedule, []);
    expect(result.isWorkingDay).toBe(false);
  });

  it('blocks the date for a vacation exception, overriding a working recurring day', () => {
    const exceptions: ScheduleException[] = [{ id: 'e1', date: '2026-07-13', type: 'vacation' }];
    const result = resolveDayForDate(monday, 'monday', schedule, exceptions);
    expect(result.isWorkingDay).toBe(false);
  });

  it('blocks the date for an unavailable exception', () => {
    const exceptions: ScheduleException[] = [{ id: 'e1', date: '2026-07-13', type: 'unavailable' }];
    const result = resolveDayForDate(monday, 'monday', schedule, exceptions);
    expect(result.isWorkingDay).toBe(false);
  });

  it('applies extra-hours, overriding the recurring hours', () => {
    const exceptions: ScheduleException[] = [
      { id: 'e1', date: '2026-07-13', type: 'extra-hours', hours: { start: '10:00', end: '12:00' } },
    ];
    const result = resolveDayForDate(monday, 'monday', schedule, exceptions);
    expect(result.isWorkingDay).toBe(true);
    expect(result.hours).toEqual({ start: '10:00', end: '12:00' });
  });

  it('falls back to the recurring hours for extra-hours with no hours of its own', () => {
    const exceptions: ScheduleException[] = [{ id: 'e1', date: '2026-07-13', type: 'extra-hours' }];
    const result = resolveDayForDate(monday, 'monday', schedule, exceptions);
    expect(result.hours).toEqual({ start: '09:00', end: '17:00' });
  });

  it('is not fooled by an exception on a different date', () => {
    const exceptions: ScheduleException[] = [{ id: 'e1', date: '2026-07-14', type: 'vacation' }];
    const result = resolveDayForDate(monday, 'monday', schedule, exceptions);
    expect(result.isWorkingDay).toBe(true);
  });

  it('blocks the date for a holiday, overriding a working recurring day', () => {
    const holidays: Holiday[] = [{ id: 'h1', date: '2026-07-13', name: 'Test Holiday' }];
    const result = resolveDayForDate(monday, 'monday', schedule, [], holidays);
    expect(result.isWorkingDay).toBe(false);
  });

  it('is not fooled by a holiday on a different date', () => {
    const holidays: Holiday[] = [{ id: 'h1', date: '2026-07-14', name: 'Test Holiday' }];
    const result = resolveDayForDate(monday, 'monday', schedule, [], holidays);
    expect(result.isWorkingDay).toBe(true);
  });

  it('lets an explicit extra-hours exception override a holiday on the same date', () => {
    const holidays: Holiday[] = [{ id: 'h1', date: '2026-07-13', name: 'Test Holiday' }];
    const exceptions: ScheduleException[] = [
      { id: 'e1', date: '2026-07-13', type: 'extra-hours', hours: { start: '11:00', end: '13:00' } },
    ];
    const result = resolveDayForDate(monday, 'monday', schedule, exceptions, holidays);
    expect(result.isWorkingDay).toBe(true);
    expect(result.hours).toEqual({ start: '11:00', end: '13:00' });
  });

  it('applies the holiday block even when a vacation exception also exists on the same date', () => {
    const holidays: Holiday[] = [{ id: 'h1', date: '2026-07-13', name: 'Test Holiday' }];
    const exceptions: ScheduleException[] = [{ id: 'e1', date: '2026-07-13', type: 'vacation' }];
    const result = resolveDayForDate(monday, 'monday', schedule, exceptions, holidays);
    expect(result.isWorkingDay).toBe(false);
  });
});
