import { describe, expect, it } from 'vitest';
import type { RecurringWeeklySchedule, ScheduleException, WeekDay } from '@/features/scheduling/types';
import { todayHoursState } from './today-hours';

const WORKING: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
const schedule: RecurringWeeklySchedule = (
  ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as WeekDay[]
).map((dayOfWeek) => ({
  dayOfWeek,
  isWorkingDay: WORKING.includes(dayOfWeek),
  hours: { start: '09:00', end: '19:00' },
  breaks: [],
  pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null },
}));

// 2026-09-30 is a Wednesday, 2026-10-02 a Friday (Cairo wall-clock dates).
const wednesdayAt = (hour: number) => new Date(2026, 8, 30, hour, 0);

describe('todayHoursState', () => {
  it("says today's hours have ended after a working day's end (10 PM after 9 AM - 7 PM)", () => {
    expect(todayHoursState(schedule, [], wednesdayAt(22))).toBe('ended');
    expect(todayHoursState(schedule, [], wednesdayAt(19))).toBe('ended');
  });

  it('says nothing is left while the hours are still running', () => {
    expect(todayHoursState(schedule, [], wednesdayAt(15))).toBe('noneLeft');
  });

  it('says there are no hours today on a day off, or a vacation/unavailable exception', () => {
    expect(todayHoursState(schedule, [], new Date(2026, 9, 2, 10, 0))).toBe('off');
    const vacation: ScheduleException[] = [{ id: 'x', date: '2026-09-30', type: 'vacation' }];
    expect(todayHoursState(schedule, vacation, wednesdayAt(22))).toBe('off');
  });

  it('uses the hours of an extra-hours exception', () => {
    const extra: ScheduleException[] = [{ id: 'x', date: '2026-10-02', type: 'extra-hours', hours: { start: '10:00', end: '12:00' } }];
    expect(todayHoursState(schedule, extra, new Date(2026, 9, 2, 13, 0))).toBe('ended');
  });

  it('says hours are unset when no day is a working day', () => {
    expect(todayHoursState(schedule.map((day) => ({ ...day, isWorkingDay: false })), [], wednesdayAt(10))).toBe('unset');
    expect(todayHoursState(undefined, undefined, wednesdayAt(10))).toBe('unset');
  });
});
