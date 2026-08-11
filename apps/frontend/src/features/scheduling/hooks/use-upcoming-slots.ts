'use client';

import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { upcomingSlotsKeys } from '@/features/scheduling/hooks/query-keys';

/**
 * Consultation Pricing Redesign: the current doctor's own generated,
 * not-yet-booked `AvailabilityWindow`s -- the "Upcoming Slots" management
 * list backing per-slot pricing overrides. Real backend endpoint
 * (`GET /scheduling/upcoming-slots`), never client-generated.
 */
export function useUpcomingSlots() {
  return useQuery({
    queryKey: upcomingSlotsKeys.list(),
    queryFn: () => schedulingApi.getUpcomingSlots(),
  });
}
