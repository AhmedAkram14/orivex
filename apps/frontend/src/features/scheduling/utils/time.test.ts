import { describe, expect, it } from 'vitest';
import { addMinutesToTime, combineDateAndTime, fromMinutes, isTimeBefore, isTimeWithinRange, rangesOverlap, toMinutes } from './time';

describe('time', () => {
  it('converts HH:mm to minutes and back', () => {
    expect(toMinutes('09:30')).toBe(570);
    expect(fromMinutes(570)).toBe('09:30');
  });

  it('zero-pads single-digit hours and minutes', () => {
    expect(fromMinutes(65)).toBe('01:05');
  });

  it('adds minutes to a time', () => {
    expect(addMinutesToTime('09:30', 45)).toBe('10:15');
  });

  it('wraps past midnight', () => {
    expect(addMinutesToTime('23:30', 45)).toBe('00:15');
  });

  it('compares times', () => {
    expect(isTimeBefore('09:00', '09:30')).toBe(true);
    expect(isTimeBefore('09:30', '09:00')).toBe(false);
  });

  it('treats a range as half-open', () => {
    expect(isTimeWithinRange('09:00', { start: '09:00', end: '10:00' })).toBe(true);
    expect(isTimeWithinRange('10:00', { start: '09:00', end: '10:00' })).toBe(false);
    expect(isTimeWithinRange('09:59', { start: '09:00', end: '10:00' })).toBe(true);
  });

  it('detects overlapping ranges', () => {
    expect(rangesOverlap({ start: '09:00', end: '10:00' }, { start: '09:30', end: '10:30' })).toBe(true);
    expect(rangesOverlap({ start: '09:00', end: '10:00' }, { start: '10:00', end: '11:00' })).toBe(false);
  });

  it('combines a date with a time-of-day into a local instant', () => {
    const date = new Date(2026, 6, 15);
    const combined = combineDateAndTime(date, '09:30');
    expect(combined.getFullYear()).toBe(2026);
    expect(combined.getMonth()).toBe(6);
    expect(combined.getDate()).toBe(15);
    expect(combined.getHours()).toBe(9);
    expect(combined.getMinutes()).toBe(30);
  });
});
