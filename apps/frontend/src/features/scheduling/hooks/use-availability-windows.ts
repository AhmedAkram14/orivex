'use client';

import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { availabilityWindowsKeys } from '@/features/scheduling/hooks/query-keys';

/**
 * Onboarding Redesign integration-gap closure (2026-07-25): a specific
 * doctor's real, bookable `AvailabilityWindow`s for `[from, to)` -- the one
 * and only source `BookingFlow` reads slots from. Never generated
 * client-side; the backend is the sole source of truth for what's
 * available (`GetBookableAvailabilityUseCase`, lazily materializing from
 * the doctor's own recurring working hours + exceptions + holidays).
 */
export function useAvailabilityWindows(doctorId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: availabilityWindowsKeys.list({ doctorId, from, to }),
    queryFn: () => schedulingApi.getAvailabilityWindows(doctorId as string, from, to),
    enabled: Boolean(doctorId),
  });
}
