import { fromMinutes } from '@/features/scheduling/utils/time';
import type { Booking, TimeRange } from '@/features/scheduling/types';

/**
 * Reduces every confirmed `Booking` that falls on `date` to a plain
 * `TimeRange` (time-of-day only) — the shape `generateDaySlots` expects for
 * its `bookedRanges` parameter. Bridges the Booking Architecture's
 * ISO-timestamp domain (a booking always has a real date) to the slot
 * generator's per-day, time-of-day-only view.
 */
export function bookedRangesForDate(bookings: Booking[], date: Date): TimeRange[] {
  return bookings
    .filter((booking) => booking.status === 'confirmed' && new Date(booking.slotStart).toDateString() === date.toDateString())
    .map((booking) => {
      const start = new Date(booking.slotStart);
      const end = new Date(booking.slotEnd);
      return {
        start: fromMinutes(start.getHours() * 60 + start.getMinutes()),
        end: fromMinutes(end.getHours() * 60 + end.getMinutes()),
      };
    });
}
