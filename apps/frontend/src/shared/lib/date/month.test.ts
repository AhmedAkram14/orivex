import { describe, expect, it } from 'vitest';
import { addMonths, getMonthGridDays, isSameMonth, startOfMonth } from './month';

describe('startOfMonth', () => {
  it('returns midnight on the 1st', () => {
    const result = startOfMonth(new Date(2026, 6, 15, 14, 30));
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(6);
  });
});

describe('getMonthGridDays', () => {
  it('always returns 42 days', () => {
    expect(getMonthGridDays(new Date(2026, 6, 15))).toHaveLength(42);
  });

  it('starts on the Sunday on/before the 1st', () => {
    const days = getMonthGridDays(new Date(2026, 6, 15)); // July 2026: 1st is a Wednesday
    expect(days[0].getDay()).toBe(0);
    expect(days[0].getDate()).toBe(28); // June 28, 2026 is the preceding Sunday
    expect(days[0].getMonth()).toBe(5);
  });

  it('includes every day of the target month', () => {
    const days = getMonthGridDays(new Date(2026, 6, 15));
    const julyDays = days.filter((day) => isSameMonth(day, new Date(2026, 6, 1)));
    expect(julyDays).toHaveLength(31);
  });
});

describe('isSameMonth', () => {
  it('is true within the same month regardless of day', () => {
    expect(isSameMonth(new Date(2026, 6, 1), new Date(2026, 6, 31))).toBe(true);
  });

  it('is false across a month boundary', () => {
    expect(isSameMonth(new Date(2026, 6, 30), new Date(2026, 7, 1))).toBe(false);
  });
});

describe('addMonths', () => {
  it('advances by whole months, clamped to the 1st to avoid day-overflow', () => {
    const result = addMonths(new Date(2026, 0, 31), 1);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(1);
  });
});
