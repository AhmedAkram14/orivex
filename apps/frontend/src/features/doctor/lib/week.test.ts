import { describe, expect, it } from 'vitest';
import { getNextAvailability, getWeekDayName } from '@/features/doctor/lib/week';
import { isSameDay } from '@/shared/lib/date/week';
import type { AvailabilityBlockData } from '@/features/doctor/api/types';

// Generic date-math (startOfWeek/getWeekDays/addWeeks/isSameDay/addDays) is
// tested in shared/lib/date/week.test.ts — this file covers only what's
// still doctor-specific: the WeekDay mapping and availability-scanning.

describe('getWeekDayName', () => {
  it('maps Date.getDay() to the correct WeekDay', () => {
    expect(getWeekDayName(new Date(2026, 6, 12))).toBe('sunday'); // 2026-07-12 is a Sunday
    expect(getWeekDayName(new Date(2026, 6, 13))).toBe('monday');
    expect(getWeekDayName(new Date(2026, 6, 18))).toBe('saturday');
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
