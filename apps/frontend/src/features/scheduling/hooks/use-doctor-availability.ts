'use client';

import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { doctorAvailabilityKeys } from '@/features/scheduling/hooks/query-keys';

/**
 * `enabled` (additive, defaults to `true` so every existing caller is
 * unaffected) -- the Doctor Profile page's public/patient-facing variant
 * must never call this doctor-self-only endpoint on another doctor's
 * behalf, so it passes `false` there rather than letting an unauthorized
 * fetch fire.
 */
export function useDoctorAvailability(enabled = true) {
  return useQuery({
    queryKey: doctorAvailabilityKeys.detail('current'),
    queryFn: () => schedulingApi.getDoctorAvailability(),
    enabled,
  });
}
