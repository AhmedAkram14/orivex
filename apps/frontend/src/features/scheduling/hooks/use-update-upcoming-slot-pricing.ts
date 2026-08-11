'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { availabilityWindowsKeys, upcomingSlotsKeys } from '@/features/scheduling/hooks/query-keys';
import type { UpdateAvailabilityWindowPricingRequest } from '@/features/scheduling/types';

export interface UpdateUpcomingSlotPricingVariables {
  id: string;
  request: UpdateAvailabilityWindowPricingRequest;
}

/**
 * Consultation Pricing Redesign: the per-slot override
 * (`PATCH /scheduling/upcoming-slots/:id/pricing`) -- reprices one already-
 * generated, still-`open` window without touching the recurring template it
 * came from. Invalidates both the doctor's own Upcoming Slots list and the
 * patient-facing availability-windows cache, since the same window can be
 * visible in both.
 */
export function useUpdateUpcomingSlotPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: UpdateUpcomingSlotPricingVariables) =>
      schedulingApi.updateUpcomingSlotPricing(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: upcomingSlotsKeys.list() });
      queryClient.invalidateQueries({ queryKey: availabilityWindowsKeys.all });
    },
  });
}
