import { describe, expect, it } from 'vitest';
import {
  addDays,
  addWeeks,
  getNextAvailability,
  getWeekDayName,
  getWeekDays,
  isSameDay,
  startOfWeek,
} from '@/features/doctor/lib/week';
import type { AvailabilityBlockData } from '@/features/doctor/api/types';

describe('getWeekDayName', () => {
  it('maps Date.getDay() to the correct WeekDay', () => {
    expect(getWeekDayName(new Date(2026, 6, 12))).toBe('sunday'); // 2026-07-12 is a Sunday
    expect(getWeekDayName(new Date(2026, 6, 13))).toBe('monday');
    expect(getWeekDayName(new Date(2026, 6, 18))).toBe('saturday');
  });
});

describe('startOfWeek', () => {
  it('returns midnight on the Sunday of the given date\'s week', () => {
    const wednesday = new Date(2026, 6, 15, 14, 30);
    const result = startOfWeek(wednesday);
    expect(getWeekDayName(result)).toBe('sunday');
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

describe('getNextAvailability', () => {
  const blocks: AvailabilityBlockData[] = [
    { id: 'a', dayOfWeek: 'monday', startHour: 9, endHour: 17 },
    { id: 'b', dayOfWeek: 'wednesday', startHour: 9, endHour: 17 },
  ];

  it('returns today\'s block when it has not ended yet', () => {
    const monday9am = new Date(2026, 6, 13, 8, 0); // Monday, before start
    const result = getNextAvailability(blocks, monday9am);
    expect(result?.block.id).toBe('a');
    expect(isSameDay(result!.date, monday9am)).toBe(true);
  });

  it('skips today\'s block once it has already ended and finds the next one', () => {
    const mondayEvening = new Date(2026, 6, 13, 18, 0); // Monday, after end
    const result = getNextAvailability(blocks, mondayEvening);
    expect(result?.block.id).toBe('b');
  });

  it('returns null when no block exists in the next 7 days', () => {
    const result = getNextAvailability([], new Date(2026, 6, 13));
    expect(result).toBeNull();
  });
});
