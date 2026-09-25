import { describe, expect, it } from 'vitest';

import { describeDay } from '@/features/scheduling/utils/describe-day';

const day = (hours: [string, string], breaks: Array<[string, string]> = [], isWorkingDay = true) => ({
  isWorkingDay,
  hours: { start: hours[0], end: hours[1] },
  breaks: breaks.map(([start, end]) => ({ start, end })),
});

describe('describeDay', () => {
  it('treats a break that runs to the end of the day as off-hours, not a break (the Monday case)', () => {
    const result = describeDay(day(['10:00', '18:00'], [['13:00', '18:00']]));
    expect(result.span).toEqual({ start: '10:00', end: '13:00' });
    expect(result.internalBreaks).toEqual([]);
    expect(result.isWorking).toBe(true);
  });

  it('counts a break in the middle of the day and keeps the full span', () => {
    const result = describeDay(day(['09:00', '17:00'], [['13:00', '14:00']]));
    expect(result.span).toEqual({ start: '09:00', end: '17:00' });
    expect(result.internalBreaks).toHaveLength(1);
    expect(result.bookable).toEqual([
      { start: '09:00', end: '13:00' },
      { start: '14:00', end: '17:00' },
    ]);
  });

  it('does not count a break at the very start of the day', () => {
    const result = describeDay(day(['09:00', '17:00'], [['09:00', '10:00']]));
    expect(result.span).toEqual({ start: '10:00', end: '17:00' });
    expect(result.internalBreaks).toEqual([]);
  });

  it('counts two separate middle breaks', () => {
    const result = describeDay(day(['08:00', '20:00'], [['10:00', '10:30'], ['14:00', '15:00']]));
    expect(result.internalBreaks).toHaveLength(2);
    expect(result.span).toEqual({ start: '08:00', end: '20:00' });
  });

  it('ignores a break declared outside the working hours', () => {
    const result = describeDay(day(['10:00', '14:00'], [['16:00', '17:00']]));
    expect(result.span).toEqual({ start: '10:00', end: '14:00' });
    expect(result.internalBreaks).toEqual([]);
  });

  it('reports a day off, and a day whose breaks cover everything, as not working', () => {
    expect(describeDay(day(['10:00', '18:00'], [], false)).isWorking).toBe(false);
    const covered = describeDay(day(['10:00', '18:00'], [['10:00', '18:00']]));
    expect(covered.isWorking).toBe(false);
    expect(covered.span).toBeUndefined();
  });
});
