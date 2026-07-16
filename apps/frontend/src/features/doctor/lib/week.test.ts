import { describe, expect, it } from 'vitest';
import { getNextAvailability, getWeekDayName } from '@/features/doctor/lib/week';
import { isSameDay } from '@/shared/lib/date/week';
import type { RecurringWeeklySchedule } from '@/features/scheduling/types';

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
  const schedule: RecurringWeeklySchedule = [
    { dayOfWeek: 'sunday', isWorkingDay: false, hours: { start: '09:00', end: '17:00' }, breaks: [] },
    { dayOfWeek: 'monday', isWorkingDay: true, hours: { start: '09:00', end: '17:00' }, breaks: [] },
    { dayOfWeek: 'tuesday', isWorkingDay: false, hours: { start: '09:00', end: '17:00' }, breaks: [] },
    { dayOfWeek: 'wednesday', isWorkingDay: true, hours: { start: '09:00', end: '17:00' }, breaks: [] },
    { dayOfWeek: 'thursday', isWorkingDay: false, hours: { start: '09:00', end: '17:00' }, breaks: [] },
    { dayOfWeek: 'friday', isWorkingDay: false, hours: { start: '09:00', end: '17:00' }, breaks: [] },
    { dayOfWeek: 'saturday', isWorkingDay: false, hours: { start: '09:00', end: '17:00' }, breaks: [] },
  ];

  it("returns today's working day when its hours have not ended yet", () => {
    const monday9am = new Date(2026, 6, 13, 8, 0); // Monday, before start
    const result = getNextAvailability(schedule, monday9am);
    expect(result?.day.dayOfWeek).toBe('monday');
    expect(isSameDay(result!.date, monday9am)).toBe(true);
  });

  it('skips today once its hours have already ended and finds the next working day', () => {
    const mondayEvening = new Date(2026, 6, 13, 18, 0); // Monday, after end
    const result = getNextAvailability(schedule, mondayEvening);
    expect(result?.day.dayOfWeek).toBe('wednesday');
  });

  it('returns null when no working day exists in the next 7 days', () => {
    const result = getNextAvailability([], new Date(2026, 6, 13));
    expect(result).toBeNull();
  });
});
