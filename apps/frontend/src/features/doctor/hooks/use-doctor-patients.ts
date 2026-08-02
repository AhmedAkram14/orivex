'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorPatientsKeys } from '@/features/doctor/hooks/query-keys';

/**
 * `enabled` (additive, defaults to `true` so every existing caller is
 * unaffected) -- the Doctor Profile page's public/patient-facing variant
 * must never call this doctor-self-only endpoint on another doctor's
 * behalf, so it passes `false` there rather than letting an unauthorized
 * fetch fire.
 */
export function useDoctorPatients(enabled = true) {
  return useQuery({
    queryKey: doctorPatientsKeys.list(),
    queryFn: () => doctorApi.getPatients(),
    enabled,
  });
}
