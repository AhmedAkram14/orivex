'use client';

import { useDoctorUpcomingWork } from '@/features/doctor/hooks/use-doctor-upcoming-work';
import { isSameCairoDay } from '@/shared/lib/date/timezone';

/**
 * Whether anything is booked today (any of today's upcoming-work items that isn't cancelled) -- from the same query
 * the Overview's Upcoming work and day strip read. `undefined` while it loads or after an error, so a caller never
 * mistakes "unknown" for "empty".
 */
export function useHasBookingsToday(): boolean | undefined {
  const { data: work, isLoading, isError } = useDoctorUpcomingWork();
  if (isLoading || isError) return undefined;
  const now = new Date();
  return (work ?? []).some(
    (item) => item.status !== 'cancelled' && isSameCairoDay(new Date(item.scheduledAt), now),
  );
}
