'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorDirectoryKeys } from '@/features/doctor/hooks/query-keys';

/** Onboarding Redesign (2026-07-21 proposal, Stage O.5): the patient-facing doctor profile view (public GET /doctors/:id). */
export function useDoctorById(doctorProfileId: string) {
  return useQuery({
    queryKey: doctorDirectoryKeys.detail(doctorProfileId),
    queryFn: () => doctorApi.getById(doctorProfileId),
    enabled: doctorProfileId.length > 0,
  });
}
