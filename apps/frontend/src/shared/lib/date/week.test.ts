import { describe, expect, it } from 'vitest';
import { addDays, addWeeks, getWeekDays, isSameDay, startOfWeek } from '@/shared/lib/date/week';

describe('startOfWeek', () => {
  it("returns midnight on the Sunday of the given date's week", () => {
    const wednesday = new Date(2026, 6, 15, 14, 30);
    const result = startOfWeek(wednesday);
    expect(result.getDay()).toBe(0);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it('leaves a Sunday unchanged aside from zeroing the time', () => {
    const sunday = new Date(2026, 6, 12, 9, 0);
    const result = startOfWeek(sunday);
    expect(result.getDate()).toBe(12);
  });
});

describe('getWeekDays', () => {
  it('returns 7 consecutive days starting at weekStart', () => {
    const weekStart = startOfWeek(new Date(2026, 6, 15));
    const days = getWeekDays(weekStart);
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.getDate())).toEqual([12, 13, 14, 15, 16, 17, 18]);
  });
});

describe('addWeeks', () => {
  it('advances by whole weeks', () => {
    const start = new Date(2026, 6, 12);
    expect(addWeeks(start, 1).getDate()).toBe(19);
    expect(addWeeks(start, -1).getDate()).toBe(5);
  });
});

describe('addDays', () => {
  it('advances by individual days, including across month boundaries', () => {
    const result = addDays(new Date(2026, 6, 30), 3);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(2);
  });
});

describe('isSameDay', () => {
  it('is true for the same calendar day regardless of time', () => {
    expect(isSameDay(new Date(2026, 6, 15, 1, 0), new Date(2026, 6, 15, 23, 0))).toBe(true);
  });

  it('is false for different days', () => {
    expect(isSameDay(new Date(2026, 6, 15), new Date(2026, 6, 16))).toBe(false);
  });
});
