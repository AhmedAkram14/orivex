import { describe, expect, it } from 'vitest';
import { getNextAvailability, getUpcomingAvailabilityDays, getWeekDayName } from '@/features/doctor/lib/week';
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
    { dayOfWeek: 'sunday', isWorkingDay: false, hours: { start: '09:00', end: '17:00' }, breaks: [], pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null } },
    { dayOfWeek: 'monday', isWorkingDay: true, hours: { start: '09:00', end: '17:00' }, breaks: [], pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null } },
    { dayOfWeek: 'tuesday', isWorkingDay: false, hours: { start: '09:00', end: '17:00' }, breaks: [], pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null } },
    { dayOfWeek: 'wednesday', isWorkingDay: true, hours: { start: '09:00', end: '17:00' }, breaks: [], pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null } },
    { dayOfWeek: 'thursday', isWorkingDay: false, hours: { start: '09:00', end: '17:00' }, breaks: [], pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null } },
    { dayOfWeek: 'friday', isWorkingDay: false, hours: { start: '09:00', end: '17:00' }, breaks: [], pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null } },
    { dayOfWeek: 'saturday', isWorkingDay: false, hours: { start: '09:00', end: '17:00' }, breaks: [], pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null } },
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

describe('getUpcomingAvailabilityDays', () => {
  const schedule: RecurringWeeklySchedule = [
    { dayOfWeek: 'sunday', isWorkingDay: false, hours: { start: '09:00', end: '17:00' }, breaks: [], pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null } },
    { dayOfWeek: 'monday', isWorkingDay: true, hours: { start: '09:00', end: '17:00' }, breaks: [], pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null } },
    { dayOfWeek: 'tuesday', isWorkingDay: false, hours: { start: '09:00', end: '17:00' }, breaks: [], pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null } },
    { dayOfWeek: 'wednesday', isWorkingDay: true, hours: { start: '09:00', end: '17:00' }, breaks: [], pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null } },
    { dayOfWeek: 'thursday', isWorkingDay: false, hours: { start: '09:00', end: '17:00' }, breaks: [], pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null } },
    { dayOfWeek: 'friday', isWorkingDay: false, hours: { start: '09:00', end: '17:00' }, breaks: [], pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null } },
    { dayOfWeek: 'saturday', isWorkingDay: false, hours: { start: '09:00', end: '17:00' }, breaks: [], pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null } },
  ];

  it('returns the next 4 real working days, skipping non-working days', () => {
    const mondayMorning = new Date(2026, 6, 13, 8, 0); // Monday, before start
    const result = getUpcomingAvailabilityDays(schedule, mondayMorning, 4);
    expect(result.map((entry) => entry.day.dayOfWeek)).toEqual(['monday', 'wednesday', 'monday', 'wednesday']);
  });

  it('returns fewer than count entries when no working day exists at all, never fabricating placeholders', () => {
    const result = getUpcomingAvailabilityDays([], new Date(2026, 6, 13), 4);
    expect(result).toEqual([]);
  });

  it('respects a custom count', () => {
    const mondayMorning = new Date(2026, 6, 13, 8, 0);
    const result = getUpcomingAvailabilityDays(schedule, mondayMorning, 2);
    expect(result).toHaveLength(2);
  });
});
