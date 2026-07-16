import { describe, expect, it } from 'vitest';
import { bookedRangesForDate } from './booked-ranges';
import type { Booking } from '../types';

const monday = new Date(2026, 6, 13);
const tuesday = new Date(2026, 6, 14);

const bookings: Booking[] = [
  { id: '1', slotStart: new Date(2026, 6, 13, 9, 0).toISOString(), slotEnd: new Date(2026, 6, 13, 9, 30).toISOString(), status: 'confirmed' },
  { id: '2', slotStart: new Date(2026, 6, 13, 10, 0).toISOString(), slotEnd: new Date(2026, 6, 13, 10, 30).toISOString(), status: 'cancelled' },
  { id: '3', slotStart: new Date(2026, 6, 14, 11, 0).toISOString(), slotEnd: new Date(2026, 6, 14, 11, 30).toISOString(), status: 'confirmed' },
];

describe('bookedRangesForDate', () => {
  it('returns only confirmed bookings on the given date, as time-of-day ranges', () => {
    const result = bookedRangesForDate(bookings, monday);
    expect(result).toEqual([{ start: '09:00', end: '09:30' }]);
  });

  it('excludes cancelled bookings', () => {
    const result = bookedRangesForDate(bookings, monday);
    expect(result.some((range) => range.start === '10:00')).toBe(false);
  });

  it('excludes bookings on a different date', () => {
    const result = bookedRangesForDate(bookings, tuesday);
    expect(result).toEqual([{ start: '11:00', end: '11:30' }]);
  });

  it('returns an empty array for a date with no bookings', () => {
    expect(bookedRangesForDate(bookings, new Date(2026, 6, 15))).toEqual([]);
  });
});
